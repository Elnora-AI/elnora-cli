"""Tests for --org flag propagation and X-Organization-Id header injection."""

import json
import urllib.error
import urllib.request
from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from elnora.cli import cli
from elnora.lib.client import ElnoraClient


FAKE_ORG = "00000000-1111-2222-3333-444444444444"
FAKE_KEY = "elnora_live_" + "x" * 30


class TestOrgFlagPropagation:
    """--org sets _global_org_id and propagates to client."""

    def test_org_flag_sets_global_org_id(self, monkeypatch):
        """--org flag sets ElnoraClient._global_org_id."""
        monkeypatch.setenv("ELNORA_API_KEY", FAKE_KEY)
        runner = CliRunner()
        # Invoke a command that will fail (no server), but --org should be set
        # before the command runs. We patch from_env to capture state.
        captured_org = {}

        original_from_env = ElnoraClient.from_env

        @classmethod
        def mock_from_env(cls):
            captured_org["global"] = cls._global_org_id
            raise RuntimeError("stop here")

        monkeypatch.setattr(ElnoraClient, "from_env", mock_from_env)
        runner.invoke(cli, ["--org", FAKE_ORG, "projects", "list"])
        assert captured_org.get("global") == FAKE_ORG

    def test_no_org_flag_leaves_global_none(self, monkeypatch):
        """Without --org, _global_org_id stays None."""
        monkeypatch.setenv("ELNORA_API_KEY", FAKE_KEY)
        # Reset class state
        ElnoraClient._global_org_id = None
        runner = CliRunner()

        captured_org = {}

        @classmethod
        def mock_from_env(cls):
            captured_org["global"] = cls._global_org_id
            raise RuntimeError("stop here")

        monkeypatch.setattr(ElnoraClient, "from_env", mock_from_env)
        runner.invoke(cli, ["projects", "list"])
        assert captured_org.get("global") is None

    def test_client_inherits_global_org_id(self):
        """ElnoraClient.__init__ picks up _global_org_id."""
        ElnoraClient._global_org_id = FAKE_ORG
        try:
            client = ElnoraClient(FAKE_KEY)
            assert client._org_id == FAKE_ORG
        finally:
            ElnoraClient._global_org_id = None

    def test_explicit_org_id_overrides_global(self):
        """Explicit org_id kwarg takes priority over _global_org_id."""
        other_org = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        ElnoraClient._global_org_id = FAKE_ORG
        try:
            client = ElnoraClient(FAKE_KEY, org_id=other_org)
            assert client._org_id == other_org
        finally:
            ElnoraClient._global_org_id = None


class TestOrgHeaderInjection:
    """X-Organization-Id header is sent when org_id is set."""

    def test_header_present_when_org_set(self, monkeypatch):
        """Request includes X-Organization-Id when org_id is set."""
        client = ElnoraClient(FAKE_KEY, org_id=FAKE_ORG)

        captured_req = {}

        def mock_open(opener_self, req, timeout=None):
            captured_req["headers"] = dict(req.headers)
            captured_req["url"] = req.full_url
            # Return a mock response
            resp = MagicMock()
            resp.read.return_value = b'{"items": []}'
            resp.__enter__ = lambda s: s
            resp.__exit__ = lambda s, *a: None
            return resp

        monkeypatch.setattr(urllib.request.OpenerDirector, "open", mock_open)
        client._last_request_time = 0  # skip throttle
        client._request("/projects")

        assert captured_req["headers"].get("X-organization-id") == FAKE_ORG

    def test_header_absent_when_no_org(self, monkeypatch):
        """Request does NOT include X-Organization-Id when org_id is None."""
        ElnoraClient._global_org_id = None
        client = ElnoraClient(FAKE_KEY)

        captured_req = {}

        def mock_open(opener_self, req, timeout=None):
            captured_req["headers"] = dict(req.headers)
            resp = MagicMock()
            resp.read.return_value = b'{"items": []}'
            resp.__enter__ = lambda s: s
            resp.__exit__ = lambda s, *a: None
            return resp

        monkeypatch.setattr(urllib.request.OpenerDirector, "open", mock_open)
        client._last_request_time = 0
        client._request("/projects")

        assert "X-organization-id" not in captured_req["headers"]


class TestOrgHelpText:
    """Org-scoped commands mention --org in help."""

    runner = CliRunner()

    @pytest.mark.parametrize(
        "cmd",
        [
            ["projects", "list", "--help"],
            ["projects", "create", "--help"],
            ["tasks", "list", "--help"],
            ["tasks", "create", "--help"],
            ["search", "tasks", "--help"],
            ["search", "files", "--help"],
            ["search", "all", "--help"],
            ["files", "list", "--help"],
            ["files", "create", "--help"],
            ["folders", "list", "--help"],
            ["folders", "create", "--help"],
        ],
    )
    def test_org_mentioned_in_help(self, cmd):
        result = self.runner.invoke(cli, cmd)
        assert result.exit_code == 0
        assert "--org" in result.output or "org" in result.output.lower()
