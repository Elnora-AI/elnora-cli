"""Tests for ElnoraClient — SSRF blocking, error mapping, auth resolution."""

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

    def test_blocks_http_scheme(self):
        client = self._make_client()
        with patch.object(type(client), "_request", wraps=client._request):
            with pytest.raises(ElnoraError, match="SSRF blocked.*non-HTTPS"):
                # Override BASE_URL temporarily
                import elnora.lib.config as cfg
                original = cfg.BASE_URL
                cfg.BASE_URL = "http://platform.elnora.ai/api/v1"
                try:
                    client._request("/test")
                finally:
                    cfg.BASE_URL = original

    def test_blocks_wrong_hostname(self):
        client = self._make_client()
        import elnora.lib.config as cfg
        original = cfg.BASE_URL
        cfg.BASE_URL = "https://evil.com/api/v1"
        try:
            with pytest.raises(ElnoraError, match="SSRF blocked"):
                client._request("/test")
        finally:
            cfg.BASE_URL = original

    def test_blocks_userinfo(self):
        client = self._make_client()
        import elnora.lib.config as cfg
        original = cfg.BASE_URL
        cfg.BASE_URL = "https://user@platform.elnora.ai/api/v1"
        try:
            with pytest.raises(ElnoraError, match="SSRF blocked.*userinfo"):
                client._request("/test")
        finally:
            cfg.BASE_URL = original


class TestHandleHttpError:
    """HTTP status code to error type mapping."""

    def _make_client(self):
        return ElnoraClient("elnora_live_" + "x" * 30)

    def test_401_raises_auth_error(self):
        client = self._make_client()
        with pytest.raises(AuthError):
            client._handle_http_error(401, "Unauthorized")

    def test_403_raises_auth_error(self):
        client = self._make_client()
        with pytest.raises(AuthError):
            client._handle_http_error(403, "Forbidden")

    def test_404_raises_not_found(self):
        client = self._make_client()
        with pytest.raises(NotFoundError):
            client._handle_http_error(404, "Not found")

    def test_422_raises_validation_error(self):
        client = self._make_client()
        with pytest.raises(ValidationError):
            client._handle_http_error(422, "Bad input")

    def test_429_raises_rate_limit(self):
        client = self._make_client()
        with pytest.raises(RateLimitError):
            client._handle_http_error(429, "")

    def test_500_raises_server_error(self):
        client = self._make_client()
        with pytest.raises(ServerError):
            client._handle_http_error(500, "Internal")

    def test_502_raises_server_error(self):
        client = self._make_client()
        with pytest.raises(ServerError):
            client._handle_http_error(502, "Bad Gateway")

    def test_418_raises_generic_error(self):
        client = self._make_client()
        with pytest.raises(ElnoraError, match="HTTP 418"):
            client._handle_http_error(418, "I'm a teapot")


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
        # Ensure no config file
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
