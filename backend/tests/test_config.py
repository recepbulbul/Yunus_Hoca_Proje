import pytest

from mindex.config import Settings
from mindex.logging_config import configure_logging


def test_settings_read_prefixed_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MINDEX_ENV", "test")
    monkeypatch.setenv("MINDEX_LLM_MAX_RETRIES", "3")
    monkeypatch.setenv("MINDEX_JWT_SECRET", "s3cret")
    s = Settings(_env_file=None)  # pyright: ignore[reportCallIssue]
    assert s.env == "test"
    assert s.llm_max_retries == 3
    assert "s3cret" not in repr(s)  # SecretStr never leaks into logs


@pytest.mark.parametrize("json_logs", [True, False])
def test_configure_logging_runs(json_logs: bool) -> None:
    configure_logging("DEBUG", json=json_logs)
