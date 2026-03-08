"""Tests for profile management — profiles.toml read/write/migrate."""

import os

import pytest

from elnora.lib.errors import AuthError, ValidationError
from elnora.lib.profiles import (
    get_api_key,
    list_profile_names,
    load_profiles,
    migrate_config_if_needed,
    remove_profile,
    save_profile,
    validate_profile_name,
)


class TestValidateProfileName:
    def test_valid_names(self):
        assert validate_profile_name("default") == "default"
        assert validate_profile_name("work") == "work"
        assert validate_profile_name("my-uni") == "my-uni"
        assert validate_profile_name("org-123") == "org-123"
        assert validate_profile_name("a") == "a"

    def test_rejects_uppercase(self):
        with pytest.raises(ValidationError):
            validate_profile_name("Work")

    def test_rejects_spaces(self):
        with pytest.raises(ValidationError):
            validate_profile_name("a b")

    def test_rejects_empty(self):
        with pytest.raises(ValidationError):
            validate_profile_name("")

    def test_rejects_too_long(self):
        with pytest.raises(ValidationError):
            validate_profile_name("x" * 33)

    def test_rejects_starts_with_hyphen(self):
        with pytest.raises(ValidationError):
            validate_profile_name("-work")


class TestLoadProfiles:
    def test_load_empty_file(self, tmp_path, monkeypatch):
        profiles_file = tmp_path / "profiles.toml"
        profiles_file.write_text("")
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        assert load_profiles() == {}

    def test_load_no_file(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "nonexistent.toml")
        assert load_profiles() == {}

    def test_load_default_only(self, tmp_path, monkeypatch):
        profiles_file = tmp_path / "profiles.toml"
        profiles_file.write_text('[default]\napi_key = "elnora_live_abc123def456ghi789"\n')
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        result = load_profiles()
        assert result == {"default": {"api_key": "elnora_live_abc123def456ghi789"}}

    def test_load_multiple_profiles(self, tmp_path, monkeypatch):
        profiles_file = tmp_path / "profiles.toml"
        profiles_file.write_text(
            "[default]\n"
            'api_key = "elnora_live_default_key12345"\n'
            "\n"
            "[profiles.university]\n"
            'api_key = "elnora_live_uni_key123456789"\n'
            "\n"
            "[profiles.work]\n"
            'api_key = "elnora_live_work_key12345678"\n'
        )
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        result = load_profiles()
        assert len(result) == 3
        assert "default" in result
        assert "university" in result
        assert "work" in result

    def test_comments_ignored(self, tmp_path, monkeypatch):
        profiles_file = tmp_path / "profiles.toml"
        profiles_file.write_text(
            '# This is a comment\n[default]\n# api_key = "old_key"\napi_key = "elnora_live_real_key12345678"\n'
        )
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        result = load_profiles()
        assert result["default"]["api_key"] == "elnora_live_real_key12345678"


class TestSaveProfile:
    def test_save_new_default(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        path = save_profile("default", "elnora_live_testkey1234567890")
        assert path.is_file()
        content = path.read_text()
        assert "[default]" in content
        assert 'api_key = "elnora_live_testkey1234567890"' in content

    def test_save_named_profile(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        content = (tmp_path / "profiles.toml").read_text()
        assert "[default]" in content
        assert "[profiles.work]" in content
        assert "elnora_live_workkey12345678901" in content

    def test_save_overwrites_existing(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_old_key_12345678901")
        save_profile("default", "elnora_live_new_key_12345678901")
        result = load_profiles()
        assert result["default"]["api_key"] == "elnora_live_new_key_12345678901"

    def test_save_preserves_other_profiles(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        save_profile("uni", "elnora_live_uni_key12345678901")
        result = load_profiles()
        assert len(result) == 3
        assert result["default"]["api_key"] == "elnora_live_default12345678901"
        assert result["work"]["api_key"] == "elnora_live_workkey12345678901"
        assert result["uni"]["api_key"] == "elnora_live_uni_key12345678901"

    def test_creates_directory(self, tmp_path, monkeypatch):
        config_dir = tmp_path / "subdir" / ".elnora"
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", config_dir)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", config_dir / "profiles.toml")
        save_profile("default", "elnora_live_testkey1234567890")
        assert config_dir.is_dir()

    def test_file_permissions_unix(self, tmp_path, monkeypatch):
        if os.name == "nt":
            pytest.skip("Unix-only test")
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        profiles_file = tmp_path / "profiles.toml"
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        save_profile("default", "elnora_live_testkey1234567890")
        mode = profiles_file.stat().st_mode & 0o777
        assert mode == 0o600

    def test_rejects_invalid_name(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        with pytest.raises(ValidationError):
            save_profile("Invalid Name", "elnora_live_testkey1234567890")


class TestRemoveProfile:
    def test_remove_existing(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        assert remove_profile("work") is True
        result = load_profiles()
        assert "work" not in result
        assert "default" in result

    def test_remove_nonexistent(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        assert remove_profile("nonexistent") is False

    def test_remove_last_deletes_file(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        profiles_file = tmp_path / "profiles.toml"
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        save_profile("default", "elnora_live_default12345678901")
        remove_profile("default")
        assert not profiles_file.is_file()


class TestGetApiKey:
    def test_get_default(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        assert get_api_key() == "elnora_live_default12345678901"
        assert get_api_key("default") == "elnora_live_default12345678901"

    def test_get_named(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        assert get_api_key("work") == "elnora_live_workkey12345678901"

    def test_missing_profile_raises(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        with pytest.raises(AuthError, match="not found"):
            get_api_key("nonexistent")

    def test_empty_key_raises(self, tmp_path, monkeypatch):
        profiles_file = tmp_path / "profiles.toml"
        profiles_file.write_text('[default]\napi_key = ""\n')
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        with pytest.raises(AuthError, match="no API key"):
            get_api_key("default")

    def test_no_profiles_file_raises(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "nonexistent.toml")
        with pytest.raises(AuthError):
            get_api_key()


class TestListProfileNames:
    def test_lists_all(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        save_profile("default", "elnora_live_default12345678901")
        save_profile("work", "elnora_live_workkey12345678901")
        names = list_profile_names()
        assert "default" in names
        assert "work" in names

    def test_empty(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "nonexistent.toml")
        assert list_profile_names() == []


class TestMigration:
    def test_migrate_creates_profiles(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        legacy = tmp_path / "config.toml"
        legacy.write_text('api_key = "elnora_live_legacy_key12345678"\n')
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", legacy)
        assert migrate_config_if_needed() is True
        assert (tmp_path / "profiles.toml").is_file()
        assert get_api_key("default") == "elnora_live_legacy_key12345678"

    def test_migrate_skips_if_profiles_exists(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        profiles_file = tmp_path / "profiles.toml"
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", profiles_file)
        save_profile("default", "elnora_live_existing_key1234567")
        legacy = tmp_path / "config.toml"
        legacy.write_text('api_key = "elnora_live_legacy_key12345678"\n')
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", legacy)
        assert migrate_config_if_needed() is False
        # Should still have the existing profile key, not the legacy one
        assert get_api_key("default") == "elnora_live_existing_key1234567"

    def test_migrate_skips_if_neither_exists(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", tmp_path / "config.toml")
        assert migrate_config_if_needed() is False

    def test_migrate_preserves_config_toml(self, tmp_path, monkeypatch):
        monkeypatch.setattr("elnora.lib.profiles.CONFIG_DIR", tmp_path)
        monkeypatch.setattr("elnora.lib.profiles.PROFILES_FILE", tmp_path / "profiles.toml")
        legacy = tmp_path / "config.toml"
        legacy.write_text('api_key = "elnora_live_legacy_key12345678"\n')
        monkeypatch.setattr("elnora.lib.profiles.LEGACY_CONFIG_FILE", legacy)
        migrate_config_if_needed()
        assert legacy.is_file()
