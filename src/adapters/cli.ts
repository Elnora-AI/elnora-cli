/**
 * CLI adapter — converts ElnoraCommand<I,O> definitions to Commander.js programs.
 *
 * Introspects Zod schemas to auto-generate CLI flags:
 * - z.string() → --flag <value> (required)
 * - z.string().optional() → --flag [value] (optional)
 * - z.number().default(1) → --flag <value> (default: 1)
 * - z.boolean() → --flag (boolean flag)
 * - z.enum([...]) → --flag <value> (choices)
 *
 * Convention: fields ending in "Id" that are required strings are
 * rendered as positional <argument> instead of --flag.
 */

import { Command } from "commander";
import type { ZodType } from "zod";
import type { CommandContext } from "../core/command.js";
import type { CommandRegistry } from "../core/registry.js";
import { ElnoraApiClient } from "../lib/client.js";
import { VERSION } from "../lib/config.js";
import {
	formatErrorForHuman,
	formatErrorPayload,
	getExitCode,
	toValidationError,
	ValidationError,
} from "../lib/errors.js";
import { formatOutput, type OutputFormat } from "../lib/output.js";
import { resolveDefaultFormat } from "../lib/tty.js";

/** Output formats accepted by --output / --json / --md. */
const ALLOWED_FORMATS: ReadonlySet<string> = new Set(["json", "csv", "table", "markdown"]);

// ---------------------------------------------------------------------------
// Zod schema introspection
// ---------------------------------------------------------------------------

export interface CommanderOption {
	flags: string;
	description: string;
	required: boolean;
	defaultValue?: unknown;
	choices?: string[];
	isArgument?: boolean;
}

/**
 * Walk through the Zod v4 definition chain to extract type metadata.
 *
 * Zod v4 uses `_zod.def` with `type` field instead of v3's `_def.typeName`.
 * Description is on the schema object directly, not nested in def.
 */
function unwrapZodDef(schema: ZodType): {
	description: string;
	required: boolean;
	defaultValue: unknown;
	isBoolean: boolean;
	isNumber: boolean;
	choices: string[] | undefined;
} {
	// biome-ignore lint/suspicious/noExplicitAny: Zod internals require any access
	const s = schema as any;

	// Description is on the top-level schema in Zod v4
	const description: string = s.description ?? "";
	let required = !s.isOptional?.();
	let defaultValue: unknown;
	let isBoolean = false;
	let isNumber = false;
	let choices: string[] | undefined;

	// Resolve the leaf type by walking through wrappers
	const def = s._zod?.def ?? s._def;
	const type: string = def?.type ?? "";

	if (type === "default") {
		defaultValue = def.defaultValue;
		required = false;
		// Check inner type
		const innerType: string = def.innerType?._zod?.def?.type ?? def.innerType?._def?.type ?? "";
		if (innerType === "boolean") isBoolean = true;
		if (innerType === "number" || innerType === "int") isNumber = true;
	} else if (type === "optional" || type === "nullable") {
		required = false;
		const innerType: string = def.innerType?._zod?.def?.type ?? def.innerType?._def?.type ?? "";
		if (innerType === "boolean") isBoolean = true;
		if (innerType === "number" || innerType === "int") isNumber = true;
	} else if (type === "boolean") {
		isBoolean = true;
	} else if (type === "number" || type === "int") {
		isNumber = true;
	} else if (type === "enum") {
		const entries = def.entries;
		if (entries && typeof entries === "object") {
			choices = Object.values(entries) as string[];
		}
	}

	return { description, required, defaultValue, isBoolean, isNumber, choices };
}

/**
 * Inspect a Zod object schema and produce Commander.js option definitions.
 */
export function zodToCommanderOptions(schema: ZodType): CommanderOption[] {
	const options: CommanderOption[] = [];

	// biome-ignore lint/suspicious/noExplicitAny: Zod internals
	const s = schema as any;

	// Zod v4: shape is directly on _def.shape (object) or _zod.def.shape
	const def = s._zod?.def ?? s._def;
	const shape = def?.shape;
	if (!shape || typeof shape !== "object") return options;
	const shapeObj = shape;

	for (const [key, fieldSchema] of Object.entries(shapeObj)) {
		const meta = unwrapZodDef(fieldSchema as ZodType);
		const kebabKey = camelToKebab(key);

		// Convention: required string fields ending in "Id" or named "taskId", "projectId", etc.
		// are rendered as positional arguments
		const isPositional = meta.required && !meta.isBoolean && !meta.choices && key.endsWith("Id");

		if (isPositional) {
			options.push({
				flags: `<${kebabKey}>`,
				description: meta.description,
				required: true,
				isArgument: true,
			});
			continue;
		}

		if (meta.isBoolean) {
			options.push({
				flags: `--${kebabKey}`,
				description: meta.description,
				required: false,
				defaultValue: meta.defaultValue ?? false,
			});
			continue;
		}

		const valuePlaceholder = meta.required ? ` <value>` : ` [value]`;
		options.push({
			flags: `--${kebabKey}${valuePlaceholder}`,
			description: meta.description,
			required: meta.required,
			defaultValue: meta.defaultValue,
			choices: meta.choices,
		});
	}

	return options;
}

function camelToKebab(str: string): string {
	return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function kebabToCamel(str: string): string {
	return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Program builder
// ---------------------------------------------------------------------------

/**
 * Build a Commander.js program from a CommandRegistry.
 */
export function buildProgram(registry: CommandRegistry): Command {
	const program = new Command()
		.name("elnora")
		.description("Elnora AI Platform CLI")
		.version(VERSION)
		.option("--compact", "Token-efficient minimal output", false)
		.option(
			"--output <format>",
			"Output format: json, csv, table, markdown (default: table on a terminal, json when piped)",
		)
		.option("--md", "Markdown output (shorthand for --output markdown)", false)
		.option("--fields <fields>", "Comma-separated fields to include")
		.option("--profile <name>", "Named profile to use")
		.option("--json", "Force JSON output (even on a terminal)", false)
		.option("--quiet", "Suppress non-essential output (spinners, update notices)", false)
		.option("--no-color", "Disable colored output");

	for (const group of registry.groups()) {
		const groupCmd = new Command(group).description(`Manage ${group}`);
		const commands = registry.byGroup(group);

		for (const cmd of commands) {
			const subName = camelToKebab(cmd.name.split(".").slice(1).join("-"));
			const sub = new Command(subName).description(cmd.description);

			const opts = zodToCommanderOptions(cmd.inputSchema);

			// Add positional arguments first, then options
			for (const opt of opts) {
				if (opt.isArgument) {
					sub.argument(opt.flags, opt.description);
				}
			}
			for (const opt of opts) {
				if (opt.isArgument) continue;
				if (opt.choices) {
					sub.option(opt.flags, opt.description, opt.defaultValue as string);
				} else {
					sub.option(opt.flags, opt.description, opt.defaultValue as string | boolean | undefined);
				}
			}

			sub.action(async (...actionArgs: unknown[]) => {
				try {
					const parentOpts = program.opts();

					// Collect arguments + options into a single input object
					// Commander passes positional args first, then options object, then the Command
					const commanderOpts = actionArgs[actionArgs.length - 2] as Record<string, unknown>;
					const positionalArgs = actionArgs.slice(0, -2) as string[];

					// Map positional args back to field names
					const input: Record<string, unknown> = { ...commanderOpts };
					const argDefs = opts.filter((o) => o.isArgument);
					for (let i = 0; i < argDefs.length; i++) {
						const fieldName = kebabToCamel(argDefs[i].flags.replace(/[<>]/g, ""));
						if (i < positionalArgs.length) {
							input[fieldName] = positionalArgs[i];
						}
					}

					// Convert numeric strings from Commander to numbers
					for (const opt of opts) {
						if (opt.isArgument) continue;
						const fieldName = kebabToCamel(opt.flags.replace(/--/, "").replace(/ .+/, ""));
						if (fieldName in input && typeof input[fieldName] === "string") {
							const numVal = Number(input[fieldName]);
							if (!Number.isNaN(numVal) && opt.defaultValue !== undefined && typeof opt.defaultValue === "number") {
								input[fieldName] = numVal;
							}
						}
					}

					const profileName = (parentOpts.profile as string) ?? "default";

					// Pass the parent --profile value into the input for commands that use it
					if (parentOpts.profile && !("profile" in input && input.profile !== "default")) {
						input.profile = parentOpts.profile;
					}

					// Auth commands that manage profiles don't need an existing API key
					const skipAuth =
						cmd.name.startsWith("auth.login") || cmd.name === "auth.logout" || cmd.name === "auth.profiles";
					const client = skipAuth
						? (new ElnoraApiClient("placeholder") as unknown as CommandContext["client"])
						: ElnoraApiClient.fromEnv(profileName);

					// Resolve output format. Precedence: --json > --md > --output <fmt> >
					// --compact (implies json) > (terminal ? table : json). Non-TTY
					// defaults to json so pipes and agents are unaffected by the
					// interactive table default.
					const compact = Boolean(parentOpts.compact);
					const explicitFormat = parentOpts.json
						? "json"
						: parentOpts.md
							? "markdown"
							: (parentOpts.output as string | undefined);
					if (explicitFormat && !ALLOWED_FORMATS.has(explicitFormat)) {
						throw new ValidationError(
							`Unknown output format: ${explicitFormat}`,
							`Valid formats: ${[...ALLOWED_FORMATS].join(", ")}.`,
						);
					}
					// --compact is a JSON modifier, not a format. With no explicit format
					// it forces json (a "compact table" is meaningless); with an explicit
					// non-json format it is simply ignored.
					const resolvedFormat = (explicitFormat ?? (compact ? "json" : resolveDefaultFormat())) as OutputFormat;

					const ctx: CommandContext = {
						client,
						profileName,
						mode: "cli",
						output: {
							format: resolvedFormat,
							compact,
							fields: parentOpts.fields
								? (parentOpts.fields as string).split(",").map((f: string) => f.trim())
								: undefined,
							quiet: Boolean(parentOpts.quiet),
						},
					};

					// Validate and parse input through Zod — convert a parse failure into
					// a clean one-line ValidationError instead of dumping serialized JSON.
					let parsed: unknown;
					try {
						parsed = cmd.inputSchema.parse(input);
					} catch (e) {
						throw toValidationError(e);
					}
					const result = await cmd.execute(parsed, ctx);

					// Output (skip if result is null or command already handled output)
					if (result != null) {
						// Skip stdout for streamed results (content already rendered via SSE)
						const isStreamed = typeof result === "object" && (result as Record<string, unknown>).streamed === true;
						if (!isStreamed) {
							// A command's bespoke formatOutput owns plain JSON (explicit --json,
							// or the non-TTY default). Everything else — table/markdown/csv, or
							// --fields/--compact projections — goes through the shared generic
							// renderer so behavior is uniform across all commands.
							const useGeneric =
								Boolean(ctx.output.fields) ||
								ctx.output.compact ||
								ctx.output.format === "csv" ||
								ctx.output.format === "table" ||
								ctx.output.format === "markdown";
							let formatted: string;
							if (cmd.formatOutput && !useGeneric) {
								formatted = cmd.formatOutput(result, ctx.output.format);
							} else {
								formatted = formatOutput(result, {
									format: ctx.output.format,
									compact: ctx.output.compact,
									fields: ctx.output.fields,
								});
							}
							if (formatted) {
								process.stdout.write(`${formatted}\n`);
							}
						}
					}
				} catch (err) {
					const error = err instanceof Error ? err : new Error(String(err));
					if (process.stderr.isTTY) {
						process.stderr.write(`${formatErrorForHuman(error)}\n`);
					} else {
						const payload = formatErrorPayload(error);
						process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
					}
					process.exitCode = getExitCode(error);
				}
			});

			groupCmd.addCommand(sub);
		}

		program.addCommand(groupCmd);
	}

	return program;
}
