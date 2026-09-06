"""Stripe subscription + action counter — instrument only in beta (not enforced)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ActionCounter:
    included: int = 200
    used: int = 0
    overage_cents: int = 8  # $0.08
    ceiling_cents: int = 2500  # $25 Ultra-style

    def record(self, metered: bool = True) -> dict:
        if not metered:
            return {"billed": False, "reason": "unmetered"}
        self.used += 1
        over = max(0, self.used - self.included)
        return {
            "billed": over > 0,
            "used": self.used,
            "included": self.included,
            "overage_actions": over,
            # Beta: do not charge
            "enforced": False,
        }


@dataclass
class StripePlumbing:
    """Placeholder for Stripe Customer + Subscription objects."""

    customer_id: str | None = None
    subscription_id: str | None = None
    counter: ActionCounter = field(default_factory=ActionCounter)

    def ensure_customer(self, email: str) -> str:
        self.customer_id = self.customer_id or f"cus_beta_{email.split('@')[0]}"
        return self.customer_id
