"""Tests for shell completion generation."""

from click.testing import CliRunner

from elnora.cli import cli

runner = CliRunner()


def test_bash_completion():
    result = runner.invoke(cli, ["completion", "bash"])
    assert result.exit_code == 0
    assert "_elnora_completions" in result.output
    assert "complete -F" in result.output


def test_zsh_completion():
    result = runner.invoke(cli, ["completion", "zsh"])
    assert result.exit_code == 0
    assert "compdef _elnora" in result.output


def test_fish_completion():
    result = runner.invoke(cli, ["completion", "fish"])
    assert result.exit_code == 0
    assert "complete -c elnora" in result.output


def test_powershell_completion():
    result = runner.invoke(cli, ["completion", "powershell"])
    assert result.exit_code == 0
    assert "Register-ArgumentCompleter" in result.output
    assert "elnora" in result.output


def test_invalid_shell():
    result = runner.invoke(cli, ["completion", "invalid"])
    assert result.exit_code != 0
