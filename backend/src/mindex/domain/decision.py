"""LLM agent decision contract (JSON schema) and the safe-default policy (NF2).

The LLM must return JSON matching `Decision`. Invalid output is retried up to
`max_retries` times; if every attempt fails the agent keeps its current portfolio.
"""

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

WEIGHT_TOLERANCE = 1e-6


class Asset(StrEnum):
    BTC = "BTC"
    ETH = "ETH"
    SOL = "SOL"
    BNB = "BNB"
    XRP = "XRP"


class Allocation(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    asset: Asset
    weight: float = Field(ge=0.0, le=1.0, description="Target portfolio weight (long-only).")


class Decision(BaseModel):
    """Target weights for the next open. Unallocated weight is held as USDT cash."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    allocations: list[Allocation] = Field(max_length=len(Asset))
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=10, max_length=2000)

    @model_validator(mode="after")
    def _check_portfolio(self) -> Self:
        assets = [a.asset for a in self.allocations]
        if len(assets) != len(set(assets)):
            raise ValueError("each asset may appear at most once")
        if self.total_weight > 1.0 + WEIGHT_TOLERANCE:
            raise ValueError(f"weights sum to {self.total_weight:.4f} > 1 (no leverage)")
        return self

    @property
    def total_weight(self) -> float:
        return sum(a.weight for a in self.allocations)

    @property
    def cash_weight(self) -> float:
        return max(0.0, 1.0 - self.total_weight)

    def weights(self) -> dict[Asset, float]:
        return {a.asset: a.weight for a in self.allocations}


@dataclass(frozen=True, slots=True)
class DecisionResult:
    decision: Decision | None
    attempts: int
    errors: tuple[str, ...]

    @property
    def held_position(self) -> bool:
        """True when every attempt failed and the safe default (keep portfolio) applies."""
        return self.decision is None


def parse_decision(raw: str) -> Decision:
    return Decision.model_validate_json(raw)


def decide_with_retries(generate: Callable[[int], str], *, max_retries: int = 2) -> DecisionResult:
    """Call `generate(attempt)` until it yields a valid Decision or retries run out."""
    errors: list[str] = []
    for attempt in range(max_retries + 1):
        try:
            return DecisionResult(parse_decision(generate(attempt)), attempt + 1, tuple(errors))
        except ValidationError as exc:
            errors.append(f"attempt {attempt + 1}: {exc.error_count()} validation error(s)")
    return DecisionResult(None, max_retries + 1, tuple(errors))
