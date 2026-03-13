"""Tests for ElnoraClient — SSRF blocking, error mapping, auth resolution, .env loading."""

import http.client
import io
import os
import urllib.error
from unittest.mock import MagicMock, patch

import pytest

from elnora.lib.client import ElnoraClient
from elnora.lib.errors import (
    AuthError,
    ElnoraError,
    NotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
)


class TestSSRF:
    """SSRF prevention in _request."""

    def _make_client(self):
        return ElnoraClient("elnora_live_" + "x" * 30)

    def test_blocks_http_scheme(self, monkeypatch):
        client = self._make_client()
        monkeypatch.setattr("elnora.lib.config.BASE_URL", "http://platform.elnora.ai/api/v1")
        with pytest.raises(ElnoraError, match="SSRF blocked.*non-HTTPS"):
            client._request("/test")

    def test_blocks_wrong_hostname(self, monkeypatch):
        client = self._make_client()
        monkeypatch.setattr("elnora.lib.config.BASE_URL", "https://evil.com/api/v1")
        with pytest.raises(ElnoraError, match="SSRF blocked"):
            client._request("/test")

    def test_blocks_userinfo(self, monkeypatch):
        client = self._make_client()
        monkeypatch.setattr("elnora.lib.config.BASE_URL", "https://user@platform.elnora.ai/api/v1")
        with pytest.raises(ElnoraError, match="SSRF blocked.*userinfo"):
            client._request("/test")


class TestHandleHttpError:
    """HTTP status code to error type mapping."""

    def _make_client(self):
        return ElnoraClient("elnora_live_" + "x" * 30)

    def test_401_raises_auth_error(self):
        with pytest.raises(AuthError):
            self._make_client()._handle_http_error(401, "Unauthorized")

    def test_403_raises_auth_error(self):
        with pytest.raises(AuthError):
            self._make_client()._handle_http_error(403, "Forbidden")

    def test_404_raises_not_found(self):
        with pytest.raises(NotFoundError):
            self._make_client()._handle_http_error(404, "Not found")

    def test_422_raises_validation_error(self):
        with pytest.raises(ValidationError):
            self._make_client()._handle_http_error(422, "Bad input")

    def test_429_raises_rate_limit(self):
        with pytest.raises(RateLimitError):
            self._make_client()._handle_http_error(429, "")

    def test_500_raises_server_error(self):
        with pytest.raises(ServerError):
            self._make_client()._handle_http_error(500, "Internal")

    def test_502_raises_server_error(self):
        with pytest.raises(ServerError):
            self._make_client()._handle_http_error(502, "Bad Gateway")

    def test_418_raises_generic_error(self):
        with pytest.raises(ElnoraError, match="HTTP 418"):
            self._make_client()._handle_http_error(418, "I'm a teapot")


class TestFromEnv:
    """API key resolution chain."""

    def test_uses_elnora_api_key(self, monkeypatch):
        key = "elnora_live_" + "a" * 30
        monkeypatch.setenv("ELNORA_API_KEY", key)
        client = ElnoraClient.from_env()
        assert client._api_key == key

    def test_uses_mcp_alias(self, monkeypatch):
        key = "elnora_live_" + "b" * 30
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.setenv("ELNORA_MCP_API_KEY", key)
        client = ElnoraClient.from_env()
        assert client._api_key == key

    def test_rejects_missing_key(self, monkeypatch):
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_PROFILE", raising=False)
        with patch.object(ElnoraClient, "_load_config_file", return_value=""):
            with patch.object(ElnoraClient, "_load_env"):
                with patch("elnora.lib.profiles.migrate_config_if_needed", return_value=False):
                    with patch("elnora.lib.profiles.get_api_key", side_effect=AuthError("not found")):
                        with pytest.raises(AuthError, match="No Elnora API key found"):
                            ElnoraClient.from_env()

    def test_rejects_wrong_prefix(self, monkeypatch):
        monkeypatch.setenv("ELNORA_API_KEY", "wrong_prefix_" + "x" * 30)
        with pytest.raises(AuthError, match="elnora_live_"):
            ElnoraClient.from_env()

    def test_rejects_short_key(self, monkeypatch):
        monkeypatch.setenv("ELNORA_API_KEY", "elnora_live_abc")
        with pytest.raises(AuthError, match="too short"):
            ElnoraClient.from_env()


class TestLoadConfigFile:
    """Config file TOML parsing."""

    def test_parses_valid_config(self, tmp_path, monkeypatch):
        config = tmp_path / "config.toml"
        config.write_text('api_key = "elnora_live_testkey123"\n')
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", config)
        result = ElnoraClient._load_config_file()
        assert result == "elnora_live_testkey123"

    def test_skips_comments(self, tmp_path, monkeypatch):
        config = tmp_path / "config.toml"
        config.write_text('# api_key = "old_value"\napi_key = "elnora_live_real"\n')
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", config)
        result = ElnoraClient._load_config_file()
        assert result == "elnora_live_real"

    def test_ignores_other_keys(self, tmp_path, monkeypatch):
        config = tmp_path / "config.toml"
        config.write_text('api_key_rotation = "something"\napi_key = "elnora_live_correct"\n')
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", config)
        result = ElnoraClient._load_config_file()
        assert result == "elnora_live_correct"

    def test_missing_file(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", tmp_path / "nonexistent.toml")
        result = ElnoraClient._load_config_file()
        assert result == ""


class TestLoadEnv:
    """`.env` file loading."""

    def test_loads_whitelisted_key(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text("ELNORA_API_KEY=elnora_live_fromenv1234567890\n")
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_fromenv1234567890"

    def test_ignores_non_whitelisted_key(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text("SECRET_KEY=should_not_load\nELNORA_API_KEY=elnora_live_test12345678901234\n")
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("SECRET_KEY", raising=False)
        ElnoraClient._load_env()
        assert os.environ.get("SECRET_KEY") is None
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_test12345678901234"

    def test_handles_export_prefix(self, tmp_path, monkeypatch):
        (tmp_path / "pyproject.toml").write_text("")
        env_file = tmp_path / ".env"
        env_file.write_text("export ELNORA_API_KEY=elnora_live_exported123456789\n")
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_exported123456789"

    def test_handles_quoted_values(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text('ELNORA_API_KEY="elnora_live_quoted12345678901"\n')
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_quoted12345678901"

    def test_no_env_file(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        ElnoraClient._load_env()  # Should not raise

    def test_does_not_override_existing_env(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text("ELNORA_API_KEY=elnora_live_fromfile123456789\n")
        monkeypatch.chdir(tmp_path)
        monkeypatch.setenv("ELNORA_API_KEY", "elnora_live_fromenv_original1234")
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_fromenv_original1234"

    def test_overrides_empty_env_var(self, tmp_path, monkeypatch):
        """An empty env var should be overridden by the .env file value."""
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text("ELNORA_API_KEY=elnora_live_fromfile123456789\n")
        monkeypatch.chdir(tmp_path)
        monkeypatch.setenv("ELNORA_API_KEY", "")
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_fromfile123456789"

    def test_handles_inline_comment(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text("ELNORA_API_KEY=elnora_live_inlinecomment123 # my key\n")
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_inlinecomment123"


class TestNoRedirectHandler:
    """Redirect blocking prevents credential forwarding."""

    def test_blocks_redirect(self):
        from elnora.lib.client import _NoRedirectHandler

        handler = _NoRedirectHandler()
        with pytest.raises(ElnoraError, match="Unexpected redirect"):
            handler.redirect_request(None, None, 302, "Found", {}, "https://example.com/steal")

    def test_does_not_leak_query_params(self):
        from elnora.lib.client import _NoRedirectHandler

        handler = _NoRedirectHandler()
        with pytest.raises(ElnoraError, match="Unexpected redirect") as exc_info:
            handler.redirect_request(None, None, 301, "Moved", {}, "https://example.com/path?secret=key")
        error_msg = str(exc_info.value)
        assert "secret" not in error_msg
        assert "/path" not in error_msg


class TestFromEnvWithProfiles:
    """Profile-based auth resolution."""

    def test_uses_profiles_toml_default(self, tmp_path, monkeypatch):
        from elnora.lib.profiles import save_profile

        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_PROFILE", raising=False)
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", tmp_path / "config.toml")
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", tmp_path / "config.toml")
        key = "elnora_live_" + "p" * 30
        save_profile("default", key)
        with patch.object(ElnoraClient, "_load_env"):
            client = ElnoraClient.from_env()
        assert client._api_key == key

    def test_uses_named_profile(self, tmp_path, monkeypatch):
        from elnora.lib.profiles import save_profile

        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_PROFILE", raising=False)
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", tmp_path / "config.toml")
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", tmp_path / "config.toml")
        save_profile("default", "elnora_live_" + "d" * 30)
        work_key = "elnora_live_" + "w" * 30
        save_profile("work", work_key)
        with patch.object(ElnoraClient, "_load_env"):
            client = ElnoraClient.from_env(profile="work")
        assert client._api_key == work_key

    def test_explicit_profile_overrides_env_var(self, tmp_path, monkeypatch):
        from elnora.lib.profiles import save_profile

        monkeypatch.setenv("ELNORA_API_KEY", "elnora_live_" + "e" * 30)
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        profile_key = "elnora_live_" + "p" * 30
        save_profile("default", profile_key)
        client = ElnoraClient.from_env(profile="default")
        assert client._api_key == profile_key

    def test_elnora_profile_env_var(self, tmp_path, monkeypatch):
        from elnora.lib.profiles import save_profile

        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        monkeypatch.setenv("ELNORA_PROFILE", "work")
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", tmp_path / "config.toml")
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", tmp_path / "config.toml")
        save_profile("default", "elnora_live_" + "d" * 30)
        work_key = "elnora_live_" + "w" * 30
        save_profile("work", work_key)
        with patch.object(ElnoraClient, "_load_env"):
            client = ElnoraClient.from_env()
        assert client._api_key == work_key

    def test_auto_migrates_config_toml(self, tmp_path, monkeypatch):
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_PROFILE", raising=False)
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        legacy = tmp_path / "config.toml"
        key = "elnora_live_" + "m" * 30
        legacy.write_text(f'api_key = "{key}"\n')
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", legacy)
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", legacy)
        with patch.object(ElnoraClient, "_load_env"):
            client = ElnoraClient.from_env()
        assert client._api_key == key
        # Verify profiles.toml was created
        assert (tmp_path / "profiles.toml").is_file()

    def test_falls_back_to_config_toml(self, tmp_path, monkeypatch):
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_PROFILE", raising=False)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", tmp_path / "nonexistent.toml")
        legacy = tmp_path / "config.toml"
        key = "elnora_live_" + "f" * 30
        legacy.write_text(f'api_key = "{key}"\n')
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", legacy)
        with patch.object(ElnoraClient, "_load_env"):
            client = ElnoraClient.from_env()
        assert client._api_key == key


def _make_http_error(code, headers=None, body=b""):
    """Create a urllib.error.HTTPError with the given status code and headers."""
    msg = http.client.HTTPMessage()
    if headers:
        for k, v in headers.items():
            msg[k] = v
    return urllib.error.HTTPError(
        url="https://platform.elnora.ai/api/v1/test",
        code=code,
        msg=f"HTTP {code}",
        hdrs=msg,
        fp=io.BytesIO(body),
    )


class TestRateLimitRetry:
    """429 retry with exponential backoff."""

    def _make_client(self):
        return ElnoraClient("elnora_live_" + "x" * 30)

    def test_retries_on_429_then_succeeds(self, monkeypatch):
        """Should retry up to 3 times on 429, then return the successful response."""
        client = self._make_client()
        call_count = 0

        def mock_open(req, timeout=None):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise _make_http_error(429)
            resp = MagicMock()
            resp.read.return_value = b'{"ok": true}'
            resp.__enter__ = lambda s: s
            resp.__exit__ = lambda s, *a: None
            return resp

        monkeypatch.setattr(client._opener, "open", mock_open)
        monkeypatch.setattr("time.sleep", lambda _: None)

        result = client._request("/test")
        assert result == {"ok": True}
        assert call_count == 3

    def test_raises_after_max_retries(self, monkeypatch):
        """Should raise RateLimitError after exhausting all retries."""
        client = self._make_client()

        def mock_open(req, timeout=None):
            raise _make_http_error(429)

        monkeypatch.setattr(client._opener, "open", mock_open)
        monkeypatch.setattr("time.sleep", lambda _: None)

        with pytest.raises(RateLimitError):
            client._request("/test")

    def test_respects_retry_after_header(self, monkeypatch):
        """Should use Retry-After header value for sleep duration."""
        client = self._make_client()
        sleep_values = []
        call_count = 0

        def mock_open(req, timeout=None):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise _make_http_error(429, headers={"Retry-After": "5"})
            resp = MagicMock()
            resp.read.return_value = b'{"ok": true}'
            resp.__enter__ = lambda s: s
            resp.__exit__ = lambda s, *a: None
            return resp

        def mock_sleep(secs):
            sleep_values.append(secs)

        monkeypatch.setattr(client._opener, "open", mock_open)
        monkeypatch.setattr("time.sleep", mock_sleep)

        result = client._request("/test")
        assert result == {"ok": True}
        assert any(v == 5.0 for v in sleep_values)

    def test_caps_retry_after_at_30s(self, monkeypatch):
        """Should cap Retry-After at 30 seconds."""
        client = self._make_client()
        sleep_values = []
        call_count = 0

        def mock_open(req, timeout=None):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise _make_http_error(429, headers={"Retry-After": "120"})
            resp = MagicMock()
            resp.read.return_value = b'{"ok": true}'
            resp.__enter__ = lambda s: s
            resp.__exit__ = lambda s, *a: None
            return resp

        def mock_sleep(secs):
            sleep_values.append(secs)

        monkeypatch.setattr(client._opener, "open", mock_open)
        monkeypatch.setattr("time.sleep", mock_sleep)

        client._request("/test")
        assert all(v <= 30.0 for v in sleep_values)

    def test_non_429_errors_not_retried(self, monkeypatch):
        """Non-429 HTTP errors should not be retried."""
        client = self._make_client()
        call_count = 0

        def mock_open(req, timeout=None):
            nonlocal call_count
            call_count += 1
            raise _make_http_error(500, body=b"Internal Server Error")

        monkeypatch.setattr(client._opener, "open", mock_open)
        monkeypatch.setattr("time.sleep", lambda _: None)

        with pytest.raises(ServerError):
            client._request("/test")
        assert call_count == 1

    def test_exponential_backoff_without_retry_after(self, monkeypatch):
        """Should use 2^attempt backoff (1s, 2s, 4s) when no Retry-After header."""
        client = self._make_client()
        sleep_values = []
        call_count = 0

        def mock_open(req, timeout=None):
            nonlocal call_count
            call_count += 1
            if call_count <= 3:
                raise _make_http_error(429)
            resp = MagicMock()
            resp.read.return_value = b'{"ok": true}'
            resp.__enter__ = lambda s: s
            resp.__exit__ = lambda s, *a: None
            return resp

        def mock_sleep(secs):
            sleep_values.append(secs)

        monkeypatch.setattr(client._opener, "open", mock_open)
        monkeypatch.setattr("time.sleep", mock_sleep)

        client._request("/test")
        retry_sleeps = [v for v in sleep_values if v >= 0.5]
        assert retry_sleeps == [1, 2, 4]
