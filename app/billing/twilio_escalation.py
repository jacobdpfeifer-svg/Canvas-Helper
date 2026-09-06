"""Twilio SMS escalation — feature-flagged; requires user phone."""

from __future__ import annotations

import os


def sms_enabled() -> bool:
    return os.environ.get("TWILIO_SMS_ENABLED", "").lower() in ("1", "true", "yes")


def send_escalation(to_phone: str, body: str) -> dict:
    if not sms_enabled():
        return {"sent": False, "reason": "TWILIO_SMS_ENABLED not set"}
    # Real Twilio client wires here when SID/TOKEN/FROM are present.
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_num = os.environ.get("TWILIO_FROM")
    if not (sid and token and from_num):
        return {"sent": False, "reason": "missing Twilio credentials"}
    return {
        "sent": False,
        "reason": "stub — credentials present but client not invoked in scaffold",
        "to": to_phone,
        "body": body[:160],
    }
