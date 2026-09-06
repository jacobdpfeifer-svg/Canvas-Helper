"""Opt-in Sentry crash telemetry for the 20–50 beta."""

from __future__ import annotations

import os


def init_sentry(*, user_opt_in: bool) -> bool:
    if not user_opt_in:
        return False
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        return False
    try:
        import sentry_sdk  # type: ignore

        sentry_sdk.init(dsn=dsn, traces_sample_rate=0.1)
        return True
    except Exception:
        return False
