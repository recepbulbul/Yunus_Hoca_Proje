import pytest

from mindex.domain.trust import BetaTrust


def test_prior_is_neutral() -> None:
    assert BetaTrust().score == 0.5


def test_score_formula() -> None:
    assert BetaTrust(confirmed=3, refuted=1).score == pytest.approx(4 / 6)


def test_update_is_immutable_and_moves_score() -> None:
    t0 = BetaTrust()
    up = t0.update(advice_was_correct=True)
    down = t0.update(advice_was_correct=False)
    assert t0 == BetaTrust()
    assert up.score > t0.score > down.score


def test_negative_counts_rejected() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        BetaTrust(confirmed=-1)
