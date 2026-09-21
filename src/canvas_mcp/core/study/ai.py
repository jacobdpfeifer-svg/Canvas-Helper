"""Client side of funded AI help (Phase 5).

Everything the model sees is selected here, locally: item sources (clipped),
the stem, a compact rubric, and the committed answer. No profile, no course
ids, no Canvas URLs, no tokens. The relay holds the vendor secret; this module
holds only the tester's session token in ``{user_root}/auth/relay.json``.

A proposal is stored as an ``ai_proposal`` event. It never changes stability
or the deterministic grade (DECISIONS D-05); the UI shows it as provisional.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from .model import StudyError

PRICING_VERSION = "2026-09-18"  # must match services/relay/relay/config.py
TIMEOUT_SECONDS = 35
MAX_PASSAGE_CHARS = 6000
MAX_PASSAGES = 6


def relay_config_path(user_root: Path) -> Path:
    return user_root / "auth" / "relay.json"


def load_relay(user_root: Path) -> dict[str, Any] | None:
    try:
        raw = json.loads(relay_config_path(user_root).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(raw, dict) or not raw.get("url") or not raw.get("session_token"):
        return None
    return raw


def save_relay(user_root: Path, data: dict[str, Any]) -> None:
    path = relay_config_path(user_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    os.replace(tmp, path)


def clear_relay(user_root: Path) -> None:
    try:
        relay_config_path(user_root).unlink()
    except OSError:
        pass


def _post(url: str, body: dict[str, Any], token: str | None) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), method="POST")
    req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:  # noqa: S310 - user-configured relay URL
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.loads(exc.read().decode("utf-8"))
        except ValueError:
            return exc.code, {"ok": False, "error": {"code": f"http_{exc.code}", "message": "relay error"}}


def _get(url: str, token: str) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(url, method="GET")
    req.add_header("authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:  # noqa: S310
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.loads(exc.read().decode("utf-8"))
        except ValueError:
            return exc.code, {"ok": False, "error": {"code": f"http_{exc.code}", "message": "relay error"}}


def connect(user_root: Path, url: str, invite_code: str) -> dict[str, Any]:
    url = url.strip().rstrip("/")
    if not url.startswith("https://") and not url.startswith("http://127.0.0.1") and not url.startswith("http://localhost"):
        raise StudyError("validation", "relay URL must use https (loopback http is allowed for development)")
    try:
        status, body = _post(f"{url}/v1/invite/redeem", {"code": invite_code.strip()}, None)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise StudyError("unreachable", f"could not reach the relay: {exc}") from exc
    if status != 200 or not body.get("ok"):
        err = body.get("error") or {}
        raise StudyError(str(err.get("code") or "relay"), str(err.get("message") or "invite was not accepted"))
    if body.get("pricing_version") != PRICING_VERSION:
        raise StudyError("stale_pricing", "this app build pins a different pricing version than the relay; update the app")
    save_relay(user_root, {"url": url, "session_token": body["session_token"], "tester_id": body["tester_id"], "pricing_version": PRICING_VERSION})
    return {"ok": True, "tester_id": body["tester_id"], "url": url}


def usage(user_root: Path) -> dict[str, Any]:
    cfg = load_relay(user_root)
    if cfg is None:
        return {"ok": True, "connected": False}
    try:
        status, body = _get(f"{cfg['url']}/v1/usage", cfg["session_token"])
    except (urllib.error.URLError, OSError, ValueError) as exc:
        return {"ok": True, "connected": True, "reachable": False, "error": str(exc)}
    if status != 200:
        err = body.get("error") or {}
        return {"ok": True, "connected": True, "reachable": True, "error": str(err.get("code") or status), "revoked": err.get("code") == "revoked"}
    return {"ok": True, "connected": True, "reachable": True, **{k: v for k, v in body.items() if k != "ok"}}


def build_request(
    *,
    request_id: str,
    session_budget_id: str,
    purpose: str,
    sources: list[dict[str, Any]],
    stem: str,
    rubric: str,
    submitted_answer: str,
) -> dict[str, Any]:
    passages = []
    for source in sources[:MAX_PASSAGES]:
        text = str(source.get("text") or "")[:MAX_PASSAGE_CHARS]
        passages.append({"locator": str(source.get("locator") or "source")[:200], "text": text})
    return {
        "request_id": request_id,
        "session_budget_id": session_budget_id,
        "purpose": purpose,
        "source_passages": passages,
        "stem": stem[:4000],
        "rubric": rubric[:4000],
        "submitted_answer": submitted_answer[:8000],
        "schema_version": 1,
        "pricing_version": PRICING_VERSION,
    }


def dispatch(user_root: Path, request: dict[str, Any]) -> dict[str, Any]:
    """One relay call. Returns the relay envelope, or a local pending envelope
    on transport failure (the request id can be replayed later)."""
    cfg = load_relay(user_root)
    if cfg is None:
        raise StudyError("not_connected", "AI help is not connected; enter an invite code in Settings")
    try:
        status, body = _post(f"{cfg['url']}/v1/study", request, cfg["session_token"])
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        return {"ok": True, "status": "pending_unknown", "error": f"transport: {type(exc).__name__}", "request_id": request["request_id"]}
    if status != 200 or not body.get("ok"):
        err = body.get("error") or {}
        return {"ok": True, "status": "refused", "error": str(err.get("code") or f"http_{status}"), "message": str(err.get("message") or ""), "request_id": request["request_id"]}
    return body
