"""Typed application settings loaded from environment / `.env` (NF3: secrets live in .env)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MINDEX_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    database_url: str = "postgresql+psycopg://mindex:mindex@localhost:5432/mindex"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: SecretStr = SecretStr("change-me")
    jwt_ttl_minutes: int = Field(default=60, gt=0)

    llm_base_url: str = "http://localhost:8080/v1"
    llm_model: str = "qwen3.5-9b-q4_k_m"
    llm_timeout_seconds: float = Field(default=30.0, gt=0)
    llm_max_retries: int = Field(default=2, ge=0, le=5)

    embedding_model: str = "Qwen/Qwen3-Embedding-0.6B"


@lru_cache
def get_settings() -> Settings:
    return Settings()
