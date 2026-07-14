# INSTALL_FOR_AGENTS.md — `elnora` CLI setup

> **Step 0 — Identity gate.** If you are NOT an autonomous coding agent (Claude
> Code, Codex CLI, Cursor, Aider, Continue, Amp, Jules, Roo, Windsurf, etc.),
> stop reading this file and open [`README.md`](README.md) instead. This file
> walks an agent through a multi-step setup that includes reading an API key
> from the user, writing it to `~/.elnora/profiles.toml`, and making live calls
> against the Elnora Platform API. Humans should follow the README's Install and
> Quick Start.

You are the agent handing off after the user installed the Elnora CLI (`npm
install -g @elnora-ai/cli`, or the `curl`/PowerShell/Homebrew installers in the
README, optionally also the Claude Code plugin). Your job is to verify the
install, collect the user's Elnora API key, wire up authentication, optionally
configure their AI coding tools, run a smoke test, and hand them a working
environment.

Be transparent: announce each step before you run it, show the output, and
explain what you found. The user may not know what a "profile" is or where the
key gets stored — keep your language plain and ask one question at a time.

**Universal:** every step here uses the `elnora` CLI, which works identically
under any agent harness. The only Claude-Code-specific parts are the optional
plugin check in Step 1 and the `elnora setup claude` path in Step 4 — everything
else is the same whether you're Claude Code, Codex, Cursor, Aider, or standalone.

## Step 1 — Verify the install

Run, in this order:

```sh
elnora --version
elnora --help
```

Gates:
- `--version` exits 0 and prints a semver string (e.g. `2.3.0`). Anything else
  means the install didn't land on `PATH`. The binary lives at
  `~/.local/bin/elnora` (macOS/Linux) or `%USERPROFILE%\.elnora\bin\elnora.exe`
  (Windows) for the curl/PowerShell installers, or wherever npm/Homebrew put it.
  Surface the actual error; don't try to reinstall on the user's behalf without
  their consent.
- `--help` lists the top-level command groups (`auth`, `projects`, `tasks`,
  `files`, `orgs`, `folders`, `search`, `setup`, `doctor`, …). If the binary
  runs but the command list is empty or truncated, the build is broken — surface
  it.

**Claude Code only — optional.** If the user also installed the Elnora plugin,
confirm it's enabled:

```sh
grep -o 'elnora@elnora-plugins' ~/.claude/settings.json 2>/dev/null || echo "plugin not enabled yet"
```

You should see `elnora@elnora-plugins`. If not, that's fine — Step 4 sets it up
with `elnora setup claude`. Skip this check entirely under Codex / Cursor /
Aider / Continue / Amp / Jules / Roo — those harnesses use the CLI directly, no
plugin install required.

## Step 2 — Collect the Elnora API key

The CLI resolves the key from (in order): the `ELNORA_API_KEY` env var, then
`ELNORA_MCP_API_KEY`, then a saved profile at `~/.elnora/profiles.toml`. You'll
persist it to the profile so it survives the next shell.

**2a. Get the key.** Tell the user, verbatim:

> I need an Elnora Platform API key. Open
> https://platform.elnora.ai/settings/api-keys in your browser, click
> **Create key**, copy the value, and paste it here. The key starts with
> `elnora_live_`.

If your harness has a browser tool (for example **Chrome DevTools MCP**), offer
to open that page for them: "Want me to open the API-keys page in your browser?"
If they say yes, drive the browser only as far as the
`https://platform.elnora.ai/settings/api-keys` page — the user must be signed in
and clicks **Create key** themselves. Do NOT read the key out of the page DOM or
screenshots; have the user paste it to you directly so the secret never passes
through screen-scraped text. If no browser tool is available, just give them the
URL. (The CLI can also open it for them: `elnora open keys`.)

**2b. Save and verify the key.** When the user pastes the key, pipe it into
`auth login` on stdin so it never appears in the process command line (where
`ps` / `Win32_Process` could read it):

```sh
printf %s '<paste>' | elnora auth login --api-key-stdin
```

For a second organization, add `--profile <name>` (e.g. `--profile university`)
and prefix later commands with `--profile <name>`.

`auth login` validates the key against the live API and saves it to
`~/.elnora/profiles.toml` at mode `0600`. Then double-check:

```sh
elnora auth status
stat -f '%Sp' ~/.elnora/profiles.toml   # macOS
# stat -c '%a' ~/.elnora/profiles.toml  # Linux
```

Gates:
- `auth login` exits 0 and reports the key verified (e.g. "N projects
  accessible"). `auth status` exits 0 with `authenticated: true`.
- The key must start with `elnora_live_`. If the CLI rejects it with "API key
  must start with 'elnora_live_'" the user copied the wrong field — ask again.
- `stat` must show `600` / `-rw-------`. If it's wider, run `chmod 600
  ~/.elnora/profiles.toml` — this file holds a live API key. (Skip this check on
  Windows, where POSIX modes don't apply.)
- If `auth login` fails with an auth error, the key is wrong or revoked — ask
  the user to regenerate it at the same URL. Do NOT retry with a key you guessed
  or pieced together.

## Step 3 — Confirm connectivity

```sh
elnora config show
elnora projects list --limit 5
```

Gates:
- `config show` prints the resolved endpoints (API base
  `https://platform.elnora.ai/api/v1`) and the active profile. Use this to
  confirm you're pointed at production, not a stale override.
- `projects list` exits 0 and shows the user's projects OR an empty list with no
  error. An empty list is valid (a brand-new account may have none) —
  distinguish that from a failed call. In a non-interactive shell the CLI
  prints JSON by default, so `elnora projects list --limit 5 | jq '.items | length'`
  is a clean programmatic check.

## Step 4 — Configure the user's AI coding tools (optional)

`elnora setup` wires the CLI into the AI tools the user already has installed.
Ask first:

> Want me to configure your AI coding tools to use Elnora? I can set up Claude
> Code (skills + MCP), Cursor, VS Code Copilot, or OpenAI Codex.

If the user says **no**, skip to Step 5. Otherwise run the matching command:

```sh
elnora setup            # auto-detect every installed tool
elnora setup claude     # Claude Code only
elnora setup cursor     # Cursor
elnora setup vscode     # VS Code Copilot
elnora setup codex      # OpenAI Codex
```

What each does:
- **Claude Code** (`setup claude`) registers the `Elnora-AI/elnora-plugins`
  marketplace and enables the `elnora@elnora-plugins` plugin, which ships 9
  skills (`elnora-admin`, `elnora-agent`, `elnora-files`, `elnora-folders`,
  `elnora-orgs`, `elnora-platform`, `elnora-projects`, `elnora-search`,
  `elnora-tasks`). After this the user restarts Claude Code and can drive the
  CLI in natural language. If `setup claude` can't run for some reason, the
  manual path is: `/plugin` → **Add marketplace** → `Elnora-AI/elnora-plugins`
  → `/plugin` again → enable `elnora`.
- **Cursor / VS Code / Codex** write an MCP server config pointing at
  `https://mcp.elnora.ai/mcp` with the user's API key. These paths need a
  resolvable key, so they only work after Step 2.

Gates:
- `elnora setup <tool>` exits 0. For Claude Code, the skills land under
  `~/.claude/plugins/marketplaces/elnora-plugins/elnora/skills/` and appear in
  `~/.claude/settings.json` as `"elnora@elnora-plugins": true`. The plugin
  clones on the next Claude Code launch — if `doctor` (Step 5) reports "Skills
  installed: registered but not cloned yet", that's expected; it self-resolves
  when the user opens the folder in Claude Code once.

## Step 5 — Full health check

Run the built-in doctor to verify the whole stack end-to-end:

```sh
elnora doctor
```

Gates:
- The **CLI** section should show `API reachable`, `Authenticated`, `Version`,
  and `Config permissions … (0600)` all passing. A `Config permissions` warning
  means the profile file is wider than `0600` — fix with `chmod 600`.
- The **Claude Code** and **MCP** sections show `pass` if you did Step 4, or
  `skip` if Claude Code isn't installed / you skipped setup. `skip` is not a
  failure — it means "not verified here," which is fine.
- Any `fail` line names the fix (usually "run 'elnora auth login'" or "run
  'elnora setup claude'"). Resolve fails before declaring done; warnings are
  non-fatal but worth mentioning in your handoff.

## Step 6 — Handoff summary

Tell the user, in this order:

1. **What's installed and where things live** — the `elnora` binary on `PATH`,
   the API key at `~/.elnora/profiles.toml` (mode `0600`), and, if you did Step
   4, the Claude Code skills / MCP config.
2. **What `doctor` reported** — read it straight from the Step 5 output; don't
   paraphrase a clean bill of health if there were warnings.
3. **How to use it** — a couple of entry points that match the user's harness:
   - **Under Claude Code with the plugin enabled:** natural language, e.g. "Use
     Elnora to list my projects" or "Use Elnora to generate a PCR protocol for
     BRCA1 exon 11."
   - **Under any harness or standalone:** `elnora projects list`,
     `elnora tasks create --project <id> --message "…"`,
     `elnora tasks send <task-id> --message "…" --stream`. Full command table
     in [`README.md`](README.md).
4. **Multi-org note** — if you saved the key under a non-default `--profile`,
   remind the user to prefix commands with `--profile <name>`.

## Completion checklist

Before declaring the setup complete, verify ALL of these. If any item fails,
finish it before reporting done.

1. `elnora --version` exits 0 and prints a semver.
2. `elnora auth status` exits 0 with `authenticated: true`.
3. `~/.elnora/profiles.toml` exists at mode `600` (skip on Windows).
4. `elnora projects list --limit 5` exits 0 (an empty list is OK; an error is
   not).
5. `elnora doctor` shows the CLI section passing (no `fail` lines); any `warn`
   or `skip` is understood and, if relevant, mentioned in the handoff.
6. If the user opted into Step 4: `elnora setup <tool>` exited 0, and for Claude
   Code `~/.claude/settings.json` contains `"elnora@elnora-plugins": true`.
7. You have NOT written the API key anywhere except `~/.elnora/profiles.toml`
   (and the env var for the current shell, if you set one). Never echo it back,
   commit it, or paste it into a config the user didn't ask for.

When all applicable items pass, print `ELNORA_CLI_READY` on its own line so the
user (and any wrapping harness) can grep for it.
