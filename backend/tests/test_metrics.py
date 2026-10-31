import math

import pytest

from mindex.domain.metrics import herd_correlation, max_drawdown, pearson, sharpe_ratio


def test_sharpe_zero_volatility_is_zero() -> None:
    assert sharpe_ratio([0.01, 0.01, 0.01]) == 0.0


def test_sharpe_short_series_is_zero() -> None:
    assert sharpe_ratio([0.01]) == 0.0


def test_sharpe_positive_for_positive_drift() -> None:
    returns = [0.01, 0.02, -0.005, 0.015]
    assert sharpe_ratio(returns) > 0
    assert sharpe_ratio(returns, periods_per_year=1) * math.sqrt(365) == pytest.approx(
        sharpe_ratio(returns)
    )


def test_max_drawdown() -> None:
    assert max_drawdown([100, 120, 90, 130, 65]) == pytest.approx(0.5)
    assert max_drawdown([1, 2, 3]) == 0.0


def test_max_drawdown_rejects_non_positive() -> None:
    with pytest.raises(ValueError, match="positive"):
        max_drawdown([1, 0])


def test_pearson_extremes() -> None:
    assert pearson([1, 2, 3], [2, 4, 6]) == pytest.approx(1.0)
    assert pearson([1, 2, 3], [3, 2, 1]) == pytest.approx(-1.0)
    assert pearson([1, 1, 1], [1, 2, 3]) == 0.0


def test_pearson_length_mismatch() -> None:
    with pytest.raises(ValueError, match="equal length"):
        pearson([1, 2], [1])


def test_herd_correlation_identical_agents_is_one() -> None:
    a = [0.1, -0.2, 0.3]
    assert herd_correlation([a, a, a]) == pytest.approx(1.0)


def test_herd_correlation_needs_two_agents() -> None:
    with pytest.raises(ValueError, match="two agents"):
        herd_correlation([[0.1, 0.2]])
