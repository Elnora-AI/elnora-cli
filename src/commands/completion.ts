/**
 * Shell completion generator — walks the Commander.js command tree
 * to produce completion scripts for bash, zsh, and fish.
 *
 * Manual implementation (no external deps) — ~100 lines per shell.
 */

import type { Command } from "commander";

interface CommandInfo {
	name: string;
	description: string;
	subcommands: CommandInfo[];
	options: { flags: string; description: string }[];
}

function extractCommandTree(cmd: Command): CommandInfo {
	return {
		name: cmd.name(),
		description: cmd.description(),
		subcommands: cmd.commands.map(extractCommandTree),
		options: cmd.options.map((o) => ({
			flags: o.long ?? o.short ?? "",
			description: o.description,
		})),
	};
}

function generateBash(root: CommandInfo): string {
	const lines: string[] = [
		"# Bash completion for elnora",
		"# Install: elnora completion bash > ~/.local/share/bash-completion/completions/elnora",
		"",
		"_elnora() {",
		'  local cur="${COMP_WORDS[COMP_CWORD]}"',
		'  local prev="${COMP_WORDS[COMP_CWORD-1]}"',
		"",
	];

	// Top-level subcommands
	const topCmds = root.subcommands.map((c) => c.name).join(" ");
	lines.push(`  if [ "$COMP_CWORD" -eq 1 ]; then`);
	lines.push(`    COMPREPLY=( $(compgen -W "${topCmds}" -- "$cur") )`);
	lines.push("    return");
	lines.push("  fi");
	lines.push("");

	// Second-level (group subcommands)
	lines.push('  case "${COMP_WORDS[1]}" in');
	for (const group of root.subcommands) {
		if (group.subcommands.length > 0) {
			const subs = group.subcommands.map((s) => s.name).join(" ");
			lines.push(`    ${group.name})`);
			lines.push(`      COMPREPLY=( $(compgen -W "${subs}" -- "$cur") )`);
			lines.push("      ;;");
		}
	}
	lines.push("  esac");
	lines.push("}");
	lines.push("");
	lines.push("complete -F _elnora elnora");

	return lines.join("\n");
}

function generateZsh(root: CommandInfo): string {
	const lines: string[] = [
		"#compdef elnora",
		"# Zsh completion for elnora",
		"# Install: elnora completion zsh > ~/.zfunc/_elnora",
		"",
		"_elnora() {",
		"  local -a commands",
		"",
	];

	lines.push("  if (( CURRENT == 2 )); then");
	lines.push("    commands=(");
	for (const cmd of root.subcommands) {
		lines.push(`      '${cmd.name}:${cmd.description.replace(/\\/g, "\\\\").replace(/'/g, "")}'`);
	}
	lines.push("    )");
	lines.push("    _describe 'command' commands");
	lines.push("    return");
	lines.push("  fi");
	lines.push("");

	lines.push("  case $words[2] in");
	for (const group of root.subcommands) {
		if (group.subcommands.length > 0) {
			lines.push(`    ${group.name})`);
			lines.push("      local -a subcommands");
			lines.push("      subcommands=(");
			for (const sub of group.subcommands) {
				lines.push(`        '${sub.name}:${sub.description.replace(/\\/g, "\\\\").replace(/'/g, "")}'`);
			}
			lines.push("      )");
			lines.push("      _describe 'subcommand' subcommands");
			lines.push("      ;;");
		}
	}
	lines.push("  esac");
	lines.push("}");
	lines.push("");
	lines.push("_elnora");

	return lines.join("\n");
}

function generateFish(root: CommandInfo): string {
	const lines: string[] = [
		"# Fish completion for elnora",
		"# Install: elnora completion fish > ~/.config/fish/completions/elnora.fish",
		"",
	];

	// Top-level commands
	for (const cmd of root.subcommands) {
		lines.push(
			`complete -c elnora -n "__fish_use_subcommand" -a "${cmd.name}" -d "${cmd.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
		);
	}
	lines.push("");

	// Subcommands
	for (const group of root.subcommands) {
		for (const sub of group.subcommands) {
			lines.push(
				`complete -c elnora -n "__fish_seen_subcommand_from ${group.name}" -a "${sub.name}" -d "${sub.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
			);
		}
	}

	return lines.join("\n");
}

export function addCompletionCommand(program: Command): void {
	program
		.command("completion")
		.argument("<shell>", "Shell type: bash, zsh, fish")
		.description("Generate shell completion script")
		.action((shell: string) => {
			const tree = extractCommandTree(program);

			switch (shell) {
				case "bash":
					console.log(generateBash(tree));
					break;
				case "zsh":
					console.log(generateZsh(tree));
					break;
				case "fish":
					console.log(generateFish(tree));
					break;
				default:
					console.error(`Unsupported shell: ${shell}. Use bash, zsh, or fish.`);
					process.exit(1);
			}
		});
}
