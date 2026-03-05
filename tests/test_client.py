"""Tests for ElnoraClient — SSRF blocking, error mapping, auth resolution, .env loading."""

import os
from unittest.mock import patch

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
        with patch.object(ElnoraClient, "_load_config_file", return_value=""):
            with patch.object(ElnoraClient, "_load_env"):
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
        # Create a project root with .git marker and .env
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text('ELNORA_API_KEY=elnora_live_fromenv1234567890\n')
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("ELNORA_MCP_API_KEY", raising=False)
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_fromenv1234567890"

    def test_ignores_non_whitelisted_key(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text('SECRET_KEY=should_not_load\nELNORA_API_KEY=elnora_live_test12345678901234\n')
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("ELNORA_API_KEY", raising=False)
        monkeypatch.delenv("SECRET_KEY", raising=False)
        ElnoraClient._load_env()
        assert os.environ.get("SECRET_KEY") is None
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_test12345678901234"

    def test_handles_export_prefix(self, tmp_path, monkeypatch):
        (tmp_path / "pyproject.toml").write_text("")
        env_file = tmp_path / ".env"
        env_file.write_text('export ELNORA_API_KEY=elnora_live_exported123456789\n')
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
        env_file.write_text('ELNORA_API_KEY=elnora_live_fromfile123456789\n')
        monkeypatch.chdir(tmp_path)
        monkeypatch.setenv("ELNORA_API_KEY", "elnora_live_fromenv_original1234")
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_fromenv_original1234"

    def test_overrides_empty_env_var(self, tmp_path, monkeypatch):
        """An empty env var should be overridden by the .env file value."""
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text('ELNORA_API_KEY=elnora_live_fromfile123456789\n')
        monkeypatch.chdir(tmp_path)
        monkeypatch.setenv("ELNORA_API_KEY", "")
        ElnoraClient._load_env()
        assert os.environ.get("ELNORA_API_KEY") == "elnora_live_fromfile123456789"

    def test_handles_inline_comment(self, tmp_path, monkeypatch):
        (tmp_path / ".git").mkdir()
        env_file = tmp_path / ".env"
        env_file.write_text('ELNORA_API_KEY=elnora_live_inlinecomment123 # my key\n')
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
            handler.redirect_request(None, None, 302, "Found", {}, "https://evil.com/steal")

    def test_shows_hostname_not_full_url(self):
        from elnora.lib.client import _NoRedirectHandler

        handler = _NoRedirectHandler()
        with pytest.raises(ElnoraError) as exc_info:
            handler.redirect_request(None, None, 301, "Moved", {}, "https://evil.com/path?secret=key")
        assert "evil.com" in str(exc_info.value)
        assert "secret=key" not in str(exc_info.value)


class TestSaveConfig:
    """Config file writing and permissions."""

    def test_writes_valid_toml(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.client.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", tmp_path / "config.toml")
        key = "elnora_live_testkey1234567890"
        result_path = ElnoraClient.save_config(key)
        assert result_path.is_file()
        content = result_path.read_text()
        assert f'api_key = "{key}"' in content

    def test_creates_directory(self, tmp_path, monkeypatch):
        config_dir = tmp_path / "subdir" / ".elnora"
        monkeypatch.setattr("elnora.lib.client.CONFIG_DIR", config_dir)
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", config_dir / "config.toml")
        ElnoraClient.save_config("elnora_live_testkey1234567890")
        assert config_dir.is_dir()

    def test_sets_permissions_on_unix(self, tmp_path, monkeypatch):
        if os.name == "nt":
            pytest.skip("Unix-only test")
        monkeypatch.setattr("elnora.lib.client.CONFIG_DIR", tmp_path)
        config_file = tmp_path / "config.toml"
        monkeypatch.setattr("elnora.lib.client.CONFIG_FILE", config_file)
        ElnoraClient.save_config("elnora_live_testkey1234567890")
        mode = config_file.stat().st_mode & 0o777
        assert mode == 0o600
