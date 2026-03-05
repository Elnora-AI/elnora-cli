"""Shared fixtures for Elnora CLI tests."""

import pytest
from click.testing import CliRunner


@pytest.fixture
def runner():
    return CliRunner(mix_stderr=False)


@pytest.fixture
def fake_api_key():
    return "elnora_live_" + "x" * 30
