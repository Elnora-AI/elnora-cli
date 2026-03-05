"""Tests for input validation — GUIDs, page size, page number."""

import pytest

from elnora.lib.errors import ValidationError
from elnora.lib.validation import validate_guid, validate_page, validate_page_size


class TestValidateGuid:
    def test_valid_lowercase(self):
        result = validate_guid("bfdc6fbd-40ed-4042-9ea7-c79a5ec90085", "test")
        assert result == "bfdc6fbd-40ed-4042-9ea7-c79a5ec90085"

    def test_valid_uppercase(self):
        result = validate_guid("BFDC6FBD-40ED-4042-9EA7-C79A5EC90085", "test")
        assert result == "BFDC6FBD-40ED-4042-9EA7-C79A5EC90085"

    def test_invalid_format(self):
        with pytest.raises(ValidationError, match="Invalid test"):
            validate_guid("not-a-guid", "test")

    def test_empty_string(self):
        with pytest.raises(ValidationError):
            validate_guid("", "test")

    def test_suggestion_for_project(self):
        with pytest.raises(ValidationError) as exc_info:
            validate_guid("bad", "project")
        assert "elnora projects list" in exc_info.value.suggestion

    def test_suggestion_for_task(self):
        with pytest.raises(ValidationError) as exc_info:
            validate_guid("bad", "task_id")
        assert "elnora tasks list" in exc_info.value.suggestion


class TestValidatePage:
    def test_valid_page(self):
        assert validate_page(1) == 1
        assert validate_page(100) == 100

    def test_zero(self):
        with pytest.raises(ValidationError, match="Invalid page"):
            validate_page(0)

    def test_negative(self):
        with pytest.raises(ValidationError):
            validate_page(-1)


class TestValidatePageSize:
    def test_valid_bounds(self):
        assert validate_page_size(1) == 1
        assert validate_page_size(100) == 100

    def test_zero(self):
        with pytest.raises(ValidationError, match="Invalid page size"):
            validate_page_size(0)

    def test_over_max(self):
        with pytest.raises(ValidationError):
            validate_page_size(101)

    def test_negative(self):
        with pytest.raises(ValidationError):
            validate_page_size(-5)

    def test_custom_label(self):
        with pytest.raises(ValidationError, match="Invalid limit"):
            validate_page_size(0, "limit")
