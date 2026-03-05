"""Shell completion generation for the Elnora CLI."""

from __future__ import annotations

import click


@click.command()
@click.argument("shell", type=click.Choice(["bash", "zsh", "fish"]))
def completion(shell: str):
    """Generate shell completion script.

    Install completions:

      elnora completion bash >> ~/.bashrc

      elnora completion zsh >> ~/.zshrc

      elnora completion fish > ~/.config/fish/completions/elnora.fish
    """
    commands = "auth projects tasks files search completion"
    global_opts = "--help --version --compact --output --fields"

    if shell == "bash":
        click.echo(f"""# elnora bash completion — add to ~/.bashrc
_elnora_completions() {{
  local cur="${{COMP_WORDS[COMP_CWORD]}}"
  local commands="{commands}"
  local global_opts="{global_opts}"
  if [ "${{COMP_CWORD}}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${{commands}} ${{global_opts}}" -- "${{cur}}") )
  fi
}}
complete -F _elnora_completions elnora""")
    elif shell == "zsh":
        cmd_list = " ".join(f'"{c}"' for c in commands.split())
        click.echo(f"""# elnora zsh completion — add to ~/.zshrc
_elnora() {{
  local commands=({cmd_list})
  local global_opts=(--help --version --compact --output --fields)
  _describe 'command' commands
  _describe 'option' global_opts
}}
compdef _elnora elnora""")
    elif shell == "fish":
        lines = ["# elnora fish completion — save to ~/.config/fish/completions/elnora.fish"]
        for cmd in commands.split():
            lines.append(f'complete -c elnora -n "__fish_use_subcommand" -a "{cmd}" -d "Manage {cmd}"')
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
