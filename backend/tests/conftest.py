"""Test environment configuration: runs in offline mode with mock LLM/VLM."""
import os
import pytest


@pytest.fixture(autouse=True)
def _no_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    yield


@pytest.fixture(autouse=True)
def _guard_defaults(monkeypatch):
    """Disable rate limiting and Origin restrictions by default in test environment."""
    from app.guard import limiter
    monkeypatch.setenv("TWIN_RATE_LIMIT", "0")
    monkeypatch.delenv("TWIN_CORS_ORIGINS", raising=False)
    monkeypatch.delenv("TWIN_CORS_REGEX", raising=False)
    limiter.reset()
    yield
    limiter.reset()
