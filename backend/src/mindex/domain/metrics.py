"""Evaluation metrics from the proposal: Sharpe ratio, maximum drawdown, herd correlation."""

import math
from collections.abc import Sequence
from itertools import combinations
from statistics import fmean, stdev

CRYPTO_PERIODS_PER_YEAR = 365  # crypto trades every day


def sharpe_ratio(
    daily_returns: Sequence[float],
    *,
    risk_free_daily: float = 0.0,
    periods_per_year: int = CRYPTO_PERIODS_PER_YEAR,
) -> float:
    """Annualised Sharpe ratio. Returns 0.0 when volatility is zero or data is too short."""
    if len(daily_returns) < 2:
        return 0.0
    excess = [r - risk_free_daily for r in daily_returns]
    sigma = stdev(excess)
    if sigma == 0:
        return 0.0
    return fmean(excess) / sigma * math.sqrt(periods_per_year)


def max_drawdown(equity: Sequence[float]) -> float:
    """Largest peak-to-trough fall as a positive fraction (0.25 == -25%)."""
    peak = -math.inf
    worst = 0.0
    for value in equity:
        if value <= 0:
            raise ValueError("equity values must be positive")
        peak = max(peak, value)
        worst = max(worst, 1.0 - value / peak)
    return worst


def pearson(x: Sequence[float], y: Sequence[float]) -> float:
    if len(x) != len(y) or len(x) < 2:
        raise ValueError("series must have equal length >= 2")
    mx, my = fmean(x), fmean(y)
    cov = sum((a - mx) * (b - my) for a, b in zip(x, y, strict=True))
    vx = sum((a - mx) ** 2 for a in x)
    vy = sum((b - my) ** 2 for b in y)
    if vx == 0 or vy == 0:
        return 0.0
    return cov / math.sqrt(vx * vy)


def herd_correlation(position_changes: Sequence[Sequence[float]]) -> float:
    """Mean pairwise Pearson correlation of agents' daily position changes."""
    if len(position_changes) < 2:
        raise ValueError("need at least two agents")
    pairs = [pearson(a, b) for a, b in combinations(position_changes, 2)]
    return fmean(pairs)
