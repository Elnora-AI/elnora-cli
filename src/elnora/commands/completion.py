"""Shell completion generation for the Elnora CLI."""

from __future__ import annotations

import click


def _get_commands_and_subcommands(cli_group):
    """Build a dict of {command_name: [subcommand_names]} from the CLI group."""
    result = {}
    for name, cmd in sorted(cli_group.commands.items()):
        if isinstance(cmd, click.Group):
            result[name] = sorted(cmd.commands.keys())
        else:
            result[name] = []
    return result


def _get_global_opts(cli_group):
    """Extract global option names from the CLI group."""
    opts = []
    for param in cli_group.params:
        opts.extend(param.opts)
    return opts


@click.command()
@click.argument("shell", type=click.Choice(["bash", "zsh", "fish", "powershell"]))
@click.pass_context
def completion(ctx, shell: str):
    """Generate shell completion script.

    Install completions:

      elnora completion bash >> ~/.bashrc

      elnora completion zsh >> ~/.zshrc

      elnora completion fish > ~/.config/fish/completions/elnora.fish

      elnora completion powershell >> $PROFILE
    """
    cli_group = ctx.find_root().command
    cmd_map = _get_commands_and_subcommands(cli_group)
    commands = " ".join(cmd_map.keys())
    global_opts = " ".join(_get_global_opts(cli_group))

    if shell == "bash":
        # Build case statements for sub-command completion
        case_lines = []
        for cmd_name, subcmds in cmd_map.items():
            if subcmds:
                case_lines.append(f'    {cmd_name}) COMPREPLY=( $(compgen -W "{" ".join(subcmds)}" -- "${{cur}}") ) ;;')
        case_block = "\n".join(case_lines)

        click.echo(f"""# elnora bash completion — add to ~/.bashrc
_elnora_completions() {{
  local cur="${{COMP_WORDS[COMP_CWORD]}}"
  local cmd="${{COMP_WORDS[1]}}"
  if [ "${{COMP_CWORD}}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "{commands} {global_opts}" -- "${{cur}}") )
    return
  fi
  case "${{cmd}}" in
{case_block}
  esac
}}
complete -F _elnora_completions elnora""")

    elif shell == "zsh":
        # Build subcommand arrays per command
        subcmd_blocks = []
        for cmd_name, subcmds in cmd_map.items():
            if subcmds:
                items = " ".join(f'"{s}"' for s in subcmds)
                subcmd_blocks.append(
                    f'  {cmd_name})\n    local subcmds=({items})\n    _describe "subcommand" subcmds\n    ;;'
                )
        case_block = "\n".join(subcmd_blocks)
        cmd_items = " ".join(f'"{c}"' for c in cmd_map.keys())

        click.echo(f"""# elnora zsh completion — add to ~/.zshrc
_elnora() {{
  local -a commands=({cmd_items})
  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi
  case "${{words[2]}}" in
{case_block}
  esac
}}
compdef _elnora elnora""")

    elif shell == "fish":
        lines = ["# elnora fish completion — save to ~/.config/fish/completions/elnora.fish"]
        help_map = {
            name: (cmd.get_short_help_str() if hasattr(cmd, "get_short_help_str") else f"Manage {name}")
            for name, cmd in cli_group.commands.items()
        }
        for cmd_name in sorted(cmd_map.keys()):
            desc = help_map.get(cmd_name, f"Manage {cmd_name}")
            lines.append(f'complete -c elnora -n "__fish_use_subcommand" -a "{cmd_name}" -d "{desc}"')
        for cmd_name, subcmds in sorted(cmd_map.items()):
            for sub in subcmds:
                lines.append(f'complete -c elnora -n "__fish_seen_subcommand_from {cmd_name}" -a "{sub}"')
        lines.extend(
            [
                'complete -c elnora -l help -d "Show help"',
                'complete -c elnora -l version -d "Show version"',
                'complete -c elnora -l compact -d "Compact JSON output"',
                'complete -c elnora -l output -d "Output format" -xa "json csv"',
                'complete -c elnora -l fields -d "Comma-separated fields"',
            ]
        )
        click.echo("\n".join(lines))

    elif shell == "powershell":
        # Build subcommand hashtable
        subcmd_entries = []
        for cmd_name, subcmds in sorted(cmd_map.items()):
            if subcmds:
                items = ", ".join(f"'{s}'" for s in subcmds)
                subcmd_entries.append(f"        '{cmd_name}' = @({items})")
        subcmd_block = "\n".join(subcmd_entries)
        cmd_list = ", ".join(f"'{c}'" for c in sorted(cmd_map.keys()))

        click.echo(f"""# elnora PowerShell completion — add to $PROFILE
Register-ArgumentCompleter -CommandName elnora -ScriptBlock {{
    param($wordToComplete, $commandAst, $cursorPosition)
    $commands = @({cmd_list})
    $subcommands = @{{
{subcmd_block}
    }}
    $args = $commandAst.CommandElements | Select-Object -Skip 1 | ForEach-Object {{ $_.ToString() }}
    if ($args.Count -eq 0) {{
        $commands | Where-Object {{ $_ -like "$wordToComplete*" }} | ForEach-Object {{
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }}
    }} elseif ($args.Count -eq 1 -and $subcommands.ContainsKey($args[0])) {{
        $subcommands[$args[0]] | Where-Object {{ $_ -like "$wordToComplete*" }} | ForEach-Object {{
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }}
    }}
}}""")
