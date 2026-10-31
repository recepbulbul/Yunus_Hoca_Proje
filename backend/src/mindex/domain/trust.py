"""Beta reputation system (Jøsang & Ismail, 2002) used to weight forum advice."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BetaTrust:
    """Trust one agent holds in another: `confirmed` (a) vs `refuted` (b) advice counts."""

    confirmed: int = 0
    refuted: int = 0

    def __post_init__(self) -> None:
        if self.confirmed < 0 or self.refuted < 0:
            raise ValueError("counts must be non-negative")

    @property
    def score(self) -> float:
        """Expected value of Beta(a+1, b+1): w = (a+1)/(a+b+2). Starts neutral at 0.5."""
        return (self.confirmed + 1) / (self.confirmed + self.refuted + 2)

    def update(self, *, advice_was_correct: bool) -> "BetaTrust":
        if advice_was_correct:
            return BetaTrust(self.confirmed + 1, self.refuted)
        return BetaTrust(self.confirmed, self.refuted + 1)
