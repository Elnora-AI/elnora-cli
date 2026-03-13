"""Basic CLI tests — verify commands exist and help text renders."""

import pytest
from click.testing import CliRunner

from elnora.cli import cli
from elnora.lib.config import __version__

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
    assert "profiles" in result.output


def test_profile_flag_in_help():
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "--profile" in result.output


def test_completion_help():
    result = runner.invoke(cli, ["completion", "--help"])
    assert result.exit_code == 0


class TestCrashHandler:
    """Global crash handler formats exceptions as JSON to stderr."""

    def test_elnora_error_structured_output(self, capsys):
        import json

        from elnora.cli import _crash_handler
        from elnora.lib.errors import ValidationError

        with pytest.raises(SystemExit) as exc_info:
            _crash_handler(ValidationError, ValidationError("bad input"), None)
        assert exc_info.value.code == 2
        captured = capsys.readouterr()
        parsed = json.loads(captured.err)
        assert parsed["code"] == "VALIDATION_ERROR"
        assert "bad input" in parsed["error"]

    def test_generic_error_internal_code(self, capsys):
        import json

        from elnora.cli import _crash_handler

        exc = RuntimeError("something broke")
        with pytest.raises(SystemExit) as exc_info:
            _crash_handler(RuntimeError, exc, None)
        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        parsed = json.loads(captured.err)
        assert parsed["code"] == "INTERNAL_ERROR"

    def test_passthrough_keyboard_interrupt(self):
        from elnora.cli import _crash_handler

        # Should NOT raise SystemExit — delegates to default hook
        _crash_handler(KeyboardInterrupt, KeyboardInterrupt(), None)
