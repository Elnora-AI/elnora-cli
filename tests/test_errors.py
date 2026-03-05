"""Tests for error output, scrubbing, and formatting."""

import json

import pytest

from elnora.lib.errors import (
    _EXIT_CODES,
    AuthError,
    ElnoraError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
    handle_errors,
    output_error,
    output_success,
    output_warning,
    scrub,
)


class TestScrub:
    def test_env_var_replacement(self, monkeypatch):
        monkeypatch.setenv("ELNORA_API_KEY", "elnora_live_secret123456789012345678901234")
        result = scrub("Error with elnora_live_secret123456789012345678901234 in it")
        assert "elnora_live_secret" not in result
        assert "[REDACTED]" in result

    def test_key_value_pattern(self):
        text = 'api_key = "some_secret_value_that_is_very_long_1234"'
        result = scrub(text)
        assert "some_secret_value" not in result

    def test_long_token_redacted(self):
        long_token = "a" * 45
        result = scrub(f"Token: {long_token}")
        assert long_token not in result
        assert "[REDACTED]" in result

    def test_short_string_preserved(self):
        result = scrub("Normal error message with short text")
        assert result == "Normal error message with short text"

    def test_uuid_with_dashes_preserved(self):
        """Standard UUIDs with dashes are < 40 contiguous chars and should not be redacted."""
        uuid = "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"
        result = scrub(f"Not found: {uuid}")
        assert uuid in result


class TestOutputSuccess:
    def test_json_pretty(self, capsys):
        output_success({"key": "value"})
        captured = capsys.readouterr()
        parsed = json.loads(captured.out)
        assert parsed == {"key": "value"}
        assert "\n" in captured.out  # pretty-printed

    def test_json_compact(self, capsys):
        output_success({"key": "value"}, compact=True)
        captured = capsys.readouterr()
        assert captured.out.strip() == '{"key":"value"}'

    def test_csv_from_items(self, capsys):
        data = {"items": [{"id": "1", "name": "test"}], "totalCount": 1}
        output_success(data, fmt="csv")
        captured = capsys.readouterr()
        assert "id,name" in captured.out
        assert "1,test" in captured.out

    def test_csv_empty_list(self, capsys):
        output_success({"items": []}, fmt="csv")
        captured = capsys.readouterr()
        assert captured.out == ""

    def test_fields_filter_json(self, capsys):
        data = {"items": [{"id": "1", "name": "test", "extra": "drop"}]}
        output_success(data, fields=["id", "name"])
        captured = capsys.readouterr()
        parsed = json.loads(captured.out)
        assert "extra" not in json.dumps(parsed)
        assert parsed["items"][0]["id"] == "1"

    def test_fields_filter_does_not_mutate_input(self):
        """Verify output_success does not mutate the caller's dict."""
        data = {"items": [{"id": "1", "name": "test", "extra": "keep"}]}
        output_success(data, fields=["id"])
        assert "extra" in data["items"][0]  # original unchanged

    def test_fields_filter_csv(self, capsys):
        data = [{"id": "1", "name": "test", "extra": "drop"}]
        output_success(data, fmt="csv", fields=["id"])
        captured = capsys.readouterr()
        assert "extra" not in captured.out
        assert "id" in captured.out


class TestOutputError:
    """output_error prints structured JSON to stderr and exits with typed codes."""

    def test_elnora_error_exit_code(self):
        with pytest.raises(SystemExit) as exc_info:
            output_error(ValidationError("bad input"))
        assert exc_info.value.code == 2

    def test_auth_error_exit_code(self):
        with pytest.raises(SystemExit) as exc_info:
            output_error(AuthError("no key"))
        assert exc_info.value.code == 3

    def test_not_found_exit_code(self):
        with pytest.raises(SystemExit) as exc_info:
            output_error(NotFoundError("Project", "abc"))
        assert exc_info.value.code == 4

    def test_rate_limit_exit_code(self):
        with pytest.raises(SystemExit) as exc_info:
            output_error(RateLimitError())
        assert exc_info.value.code == 5

    def test_server_error_exit_code(self):
        with pytest.raises(SystemExit) as exc_info:
            output_error(ServerError())
        assert exc_info.value.code == 6

    def test_generic_exception_exit_code(self):
        with pytest.raises(SystemExit) as exc_info:
            output_error(RuntimeError("boom"))
        assert exc_info.value.code == 1

    def test_stderr_contains_json(self, capsys):
        with pytest.raises(SystemExit):
            output_error(ValidationError("bad field", suggestion="Fix it"))
        captured = capsys.readouterr()
        parsed = json.loads(captured.err)
        assert parsed["code"] == "VALIDATION_ERROR"
        assert parsed["suggestion"] == "Fix it"
        assert "bad field" in parsed["error"]

    def test_compact_output(self, capsys):
        with pytest.raises(SystemExit):
            output_error(AuthError("no key"), compact=True)
        captured = capsys.readouterr()
        assert "\n" not in captured.err.strip()
        parsed = json.loads(captured.err)
        assert parsed["code"] == "AUTH_FAILED"

    def test_scrubs_secrets_in_error(self, capsys, monkeypatch):
        monkeypatch.setenv("ELNORA_API_KEY", "elnora_live_supersecretkey12345678901234")
        with pytest.raises(SystemExit):
            output_error(RuntimeError("Failed with elnora_live_supersecretkey12345678901234"))
        captured = capsys.readouterr()
        assert "supersecret" not in captured.err
        assert "[REDACTED]" in captured.err


class TestExitCodes:
    """_EXIT_CODES mapping is complete and correct."""

    def test_all_error_types_mapped(self):
        expected = {ValidationError: 2, AuthError: 3, NotFoundError: 4, RateLimitError: 5, ServerError: 6}
        assert _EXIT_CODES == expected

    def test_base_error_not_mapped(self):
        assert ElnoraError not in _EXIT_CODES


class TestHandleErrors:
    """handle_errors context manager catches exceptions and calls output_error."""

    def _make_ctx(self, compact=False):
        class FakeCtx:
            obj = {"compact": compact}

        return FakeCtx()

    def test_passes_through_on_success(self):
        ctx = self._make_ctx()
        with handle_errors(ctx):
            result = 42
        assert result == 42

    def test_catches_elnora_error(self, capsys):
        ctx = self._make_ctx()
        with pytest.raises(SystemExit) as exc_info:
            with handle_errors(ctx):
                raise NotFoundError("Task", "abc-123")
        assert exc_info.value.code == 4

    def test_catches_generic_exception(self, capsys):
        ctx = self._make_ctx()
        with pytest.raises(SystemExit) as exc_info:
            with handle_errors(ctx):
                raise RuntimeError("unexpected")
        assert exc_info.value.code == 1

    def test_reraises_keyboard_interrupt(self):
        ctx = self._make_ctx()
        with pytest.raises(KeyboardInterrupt):
            with handle_errors(ctx):
                raise KeyboardInterrupt()

    def test_reraises_system_exit(self):
        ctx = self._make_ctx()
        with pytest.raises(SystemExit):
            with handle_errors(ctx):
                raise SystemExit(0)


class TestOutputWarning:
    """output_warning prints JSON to stderr without exiting."""

    def test_warning_to_stderr(self, capsys):
        output_warning("something is wrong", code="TEST_WARN")
        captured = capsys.readouterr()
        parsed = json.loads(captured.err)
        assert parsed["warning"] == "something is wrong"
        assert parsed["code"] == "TEST_WARN"
        assert captured.out == ""

    def test_compact_mode(self, capsys):
        output_warning("compact test", compact=True)
        captured = capsys.readouterr()
        assert "\n" not in captured.err.strip()
        parsed = json.loads(captured.err)
        assert parsed["warning"] == "compact test"

    def test_does_not_exit(self):
        # Should return normally, not raise SystemExit
        output_warning("advisory only")
