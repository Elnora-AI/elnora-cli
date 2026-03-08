"""Tests for --profile flag propagation and --org deprecation."""

import json

from click.testing import CliRunner

from elnora.cli import cli
from elnora.lib.client import ElnoraClient

FAKE_KEY = "elnora_live_" + "x" * 30


class TestProfileFlagPropagation:
    """--profile sets _active_profile and propagates to client."""

    def test_profile_flag_sets_active_profile(self, monkeypatch):
        """--profile flag sets ElnoraClient._active_profile."""
        monkeypatch.setenv("ELNORA_API_KEY", FAKE_KEY)
        runner = CliRunner()
        captured = {}

        @classmethod
        def mock_from_env(cls, profile=None):
            captured["active_profile"] = cls._active_profile
            captured["profile_arg"] = profile
            raise RuntimeError("stop here")

        monkeypatch.setattr(ElnoraClient, "from_env", mock_from_env)
        runner.invoke(cli, ["--profile", "university", "projects", "list"])
        assert captured.get("active_profile") == "university"

    def test_no_profile_flag_leaves_active_none(self, monkeypatch):
        """Without --profile, _active_profile stays None."""
        monkeypatch.setenv("ELNORA_API_KEY", FAKE_KEY)
        ElnoraClient._active_profile = None
        runner = CliRunner()
        captured = {}

        @classmethod
        def mock_from_env(cls, profile=None):
            captured["active_profile"] = cls._active_profile
            raise RuntimeError("stop here")

        monkeypatch.setattr(ElnoraClient, "from_env", mock_from_env)
        runner.invoke(cli, ["projects", "list"])
        assert captured.get("active_profile") is None


class TestOrgFlagDeprecation:
    """--org flag shows deprecation warning."""

    def test_org_flag_shows_warning(self, monkeypatch):
        monkeypatch.setenv("ELNORA_API_KEY", FAKE_KEY)
        runner = CliRunner()

        @classmethod
        def mock_from_env(cls, profile=None):
            raise RuntimeError("stop here")

        monkeypatch.setattr(ElnoraClient, "from_env", mock_from_env)
        result = runner.invoke(cli, ["--org", "some-uuid", "projects", "list"])
        assert "deprecated" in result.output.lower() or "deprecated" in (result.stderr or "").lower()

    def test_org_flag_hidden_from_help(self):
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # --org should be hidden, --profile should be visible
        assert "--profile" in result.output
        # --org should not appear as a documented option in help
        assert "--org" not in result.output or "DEPRECATED" in result.output.upper()


class TestProfileInHelp:
    """--profile flag appears in help text."""

    runner = CliRunner()

    def test_profile_in_main_help(self):
        result = self.runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "--profile" in result.output

    def test_multi_org_in_help(self):
        result = self.runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "Multi-org" in result.output or "multi-org" in result.output.lower()


class TestAuthProfilesCommand:
    """elnora auth profiles subcommand."""

    runner = CliRunner()

    def test_profiles_in_auth_help(self):
        result = self.runner.invoke(cli, ["auth", "--help"])
        assert result.exit_code == 0
        assert "profiles" in result.output

    def test_profiles_empty(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        result = self.runner.invoke(cli, ["auth", "profiles"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["profiles"] == []

    def test_profiles_lists_all(self, tmp_path, monkeypatch):
        from elnora.lib.profiles import save_profile

        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        result = self.runner.invoke(cli, ["auth", "profiles"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        names = [p["name"] for p in data["profiles"]]
        assert "default" in names
        assert "work" in names
        # Keys should be masked
        for p in data["profiles"]:
            assert "..." in p["apiKey"]


class TestAuthLoginProfile:
    """elnora auth login --profile saves to correct profile."""

    runner = CliRunner()

    def test_login_help_shows_profile(self):
        result = self.runner.invoke(cli, ["auth", "login", "--help"])
        assert result.exit_code == 0
        assert "--profile" in result.output


class TestAuthLogoutProfile:
    """elnora auth logout --profile removes correct profile."""

    runner = CliRunner()

    def test_logout_help_shows_profile(self):
        result = self.runner.invoke(cli, ["auth", "logout", "--help"])
        assert result.exit_code == 0
        assert "--profile" in result.output

    def test_logout_help_shows_all(self):
        result = self.runner.invoke(cli, ["auth", "logout", "--help"])
        assert result.exit_code == 0
        assert "--all" in result.output

    def test_logout_removes_profile(self, tmp_path, monkeypatch):
        from elnora.lib.profiles import load_profiles, save_profile

        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        result = self.runner.invoke(cli, ["auth", "logout", "--profile", "work"])
        assert result.exit_code == 0
        remaining = load_profiles()
        assert "work" not in remaining
        assert "default" in remaining

    def test_logout_all(self, tmp_path, monkeypatch):
        from elnora.lib.profiles import save_profile

        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        profiles_file = tmp_path / "profiles.toml"
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        result = self.runner.invoke(cli, ["auth", "logout", "--all"])
        assert result.exit_code == 0
        assert not profiles_file.is_file()
