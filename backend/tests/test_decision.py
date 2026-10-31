import json

import pytest
from pydantic import ValidationError

from mindex.domain.decision import Asset, Decision, decide_with_retries, parse_decision

VALID = {
    "allocations": [{"asset": "BTC", "weight": 0.5}, {"asset": "ETH", "weight": 0.3}],
    "confidence": 0.7,
    "rationale": "BTC trend above 20-day MA; ETH lagging but momentum turning.",
}


def test_valid_decision_parses_and_exposes_cash() -> None:
    d = parse_decision(json.dumps(VALID))
    assert d.weights() == {Asset.BTC: 0.5, Asset.ETH: 0.3}
    assert d.cash_weight == pytest.approx(0.2)


@pytest.mark.parametrize(
    "patch",
    [
        {"allocations": [{"asset": "BTC", "weight": 0.8}, {"asset": "ETH", "weight": 0.4}]},
        {"allocations": [{"asset": "BTC", "weight": -0.1}]},
        {"allocations": [{"asset": "DOGE", "weight": 0.1}]},
        {"allocations": [{"asset": "BTC", "weight": 0.2}, {"asset": "BTC", "weight": 0.2}]},
        {"confidence": 1.5},
        {"rationale": "short"},
        {"leverage": 3},
    ],
    ids=["leverage", "short", "unknown-asset", "duplicate", "confidence", "rationale", "extra"],
)
def test_invalid_decisions_are_rejected(patch: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        Decision.model_validate({**VALID, **patch})


def test_retry_succeeds_on_second_attempt() -> None:
    outputs = ["{not json", json.dumps(VALID)]
    result = decide_with_retries(lambda i: outputs[i], max_retries=2)
    assert result.decision is not None
    assert result.attempts == 2
    assert len(result.errors) == 1
    assert not result.held_position


def test_all_attempts_fail_holds_position() -> None:
    calls: list[int] = []

    def broken(attempt: int) -> str:
        calls.append(attempt)
        return '{"allocations": []}'

    result = decide_with_retries(broken, max_retries=2)
    assert result.held_position
    assert calls == [0, 1, 2]
    assert len(result.errors) == 3
