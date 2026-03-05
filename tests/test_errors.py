"""Tests for error output, scrubbing, and formatting."""

import json

from elnora.lib.errors import (
    output_success,
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
