"""Basic CLI tests — verify commands exist and help text renders."""

from click.testing import CliRunner

from elnora import __version__
from elnora.cli import cli

runner = CliRunner()


def test_cli_help():
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "Elnora AI Platform CLI" in result.output


def test_version():
    result = runner.invoke(cli, ["--version"])
    assert result.exit_code == 0
    assert __version__ in result.output


def test_projects_help():
    result = runner.invoke(cli, ["projects", "--help"])
    assert result.exit_code == 0
    assert "list" in result.output
    assert "get" in result.output
    assert "create" in result.output


def test_tasks_help():
    result = runner.invoke(cli, ["tasks", "--help"])
    assert result.exit_code == 0
    assert "list" in result.output
    assert "get" in result.output
    assert "create" in result.output


def test_files_help():
    result = runner.invoke(cli, ["files", "--help"])
    assert result.exit_code == 0
    assert "list" in result.output
    assert "get" in result.output


def test_search_help():
    result = runner.invoke(cli, ["search", "--help"])
    assert result.exit_code == 0


def test_auth_help():
    result = runner.invoke(cli, ["auth", "--help"])
    assert result.exit_code == 0
    assert "login" in result.output
    assert "status" in result.output
    assert "logout" in result.output


def test_completion_help():
    result = runner.invoke(cli, ["completion", "--help"])
    assert result.exit_code == 0
