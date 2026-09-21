"""Choose the next offer without changing history (revised spec §3.3 ``select``)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .clock import nearest_future_exam, scope_has_unknown_exam
from .model import ItemState, Projection, iso
from .packets import public_item


@dataclass
class Selection:
    kind: str  # offer | no_review_needed | no_eligible_item | missing_source | needs_exam_date | no_pre_exam_slot
    item: dict[str, Any] | None = None
    mode: str | None = None
    why: str = ""
    next_at: datetime | None = None
    reason: str = ""
    action: str = ""
    state: dict[str, Any] | None = None
    eligibility_note: str = ""
    alternatives: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "item": self.item,
            "mode": self.mode,
            "why": self.why,
            "next_at": iso(self.next_at) if self.next_at else None,
            "reason": self.reason,
            "action": self.action,
            "state": self.state,
            "eligibility_note": self.eligibility_note,
            "alternatives": self.alternatives,
        }


def _live_items(
    packets: dict[str, dict[str, Any]], projection: Projection, course: str | None
) -> list[tuple[dict[str, Any], dict[str, Any], ItemState]]:
    rows: list[tuple[dict[str, Any], dict[str, Any], ItemState]] = []
    for packet in packets.values():
        if course and packet.get("course") and packet["course"] != course:
            continue
        stale_sources = {s["id"] for s in packet["sources"] if s.get("stale")}
        for item in packet["items"]:
            state = projection.items.get(item["id"])
            if state is None:
                continue
            if state.validity != "active":
                continue
            if any(ref in stale_sources for ref in item["source_refs"]):
                continue
            rows.append((packet, item, state))
    return rows


def _offer_at(state: ItemState, now: datetime) -> datetime:
    """When an item can be offered. A never-encountered item is always offerable
    now (as practice while a sibling's cooldown runs — spec X5); encountered
    items wait for their due date and any objective cooldown."""
    if not state.encountered:
        return now
    base = state.due if state.due is not None else now
    if state.cooldown is not None and state.cooldown > base:
        return state.cooldown
    return base


def _why(packet: dict[str, Any], item: dict[str, Any], state: ItemState, mode: str, now: datetime) -> str:
    locator = item.get("neutral_locator") or packet["sources"][0]["locator"]
    label = next((o["label"] for o in packet["objectives"] if o["id"] == item["objective_id"]), item["objective_id"])
    if item.get("why"):
        return str(item["why"])
    if mode == "learn":
        return f"Start with one example from {locator}, then apply the same rule to a new case."
    if mode == "practice":
        return f"You saw related material recently, so this is practice on “{label}” — not a delayed check."
    if state.due is not None and state.due <= now and state.encountered:
        return f"“{label}” is due for a check from {locator}; your answer decides the next step."
    return f"One question on “{label}”, backed by {locator}. A first answer sets a baseline."


def select(
    *,
    packets: dict[str, dict[str, Any]],
    projection: Projection,
    exams: list[dict[str, Any]],
    now: datetime,
    course: str | None = None,
    visited: set[str] | None = None,
    requested_mode: str | None = None,
    cram: bool = False,
    prefer_item: str | None = None,
    open_items: set[str] | None = None,
) -> Selection:
    """``open_items`` are items with an unfinished attempt (saved draft). They
    are offered first, even if this session already visited them, so a crash
    or reload resumes the same attempt instead of hiding it (X6/F25)."""
    visited = set(visited or set()) - set(open_items or set())
    open_items = open_items or set()
    if not packets or not any(p["sources"] for p in packets.values()):
        return Selection("missing_source", reason="No permitted source is imported yet.", action="import")
    if course and not any(p.get("course") == course for p in packets.values()):
        return Selection("missing_source", reason=f"No source imported for {course}.", action="import")
    live = _live_items(packets, projection, course)
    if not live:
        withdrawn = any(s.validity != "active" for s in projection.items.values())
        reason = "All practice items are withdrawn or stale." if withdrawn else "Sources exist but no practice item is ready."
        return Selection("no_eligible_item", reason=reason, action="create")
    if cram:
        if scope_has_unknown_exam(exams, course=course, objective_id=None) or not exams:
            return Selection("needs_exam_date", reason="Cram mode needs a known exam date.", action="read")
        if nearest_future_exam(exams, course=course, objective_id=None, now=now) is None:
            return Selection("no_pre_exam_slot", reason="No future exam in scope; the exam has passed.", action="stop")
    remaining = [row for row in live if row[1]["id"] not in visited]
    if not remaining:
        return Selection("no_eligible_item", reason="Every ready item was visited or skipped this session.", action="stop")
    if cram:
        remaining = [row for row in remaining if row[2].schedule_status != "no_pre_exam_slot"]
        if not remaining:
            return Selection("no_pre_exam_slot", reason="No item has a slot before the exam.", action="stop")
    if prefer_item:
        preferred = [row for row in remaining if row[1]["id"] == prefer_item]
        if preferred:
            remaining = preferred
    remaining.sort(
        key=lambda row: (
            0 if row[1]["id"] in open_items else 1,
            _offer_at(row[2], now) if row[1]["id"] not in open_items else now,
            row[1]["id"],
        )
    )
    packet, item, state = remaining[0]
    if item["id"] in open_items:
        return Selection(
            "offer",
            item=public_item(packet, item),
            mode=None,
            why="You have an unfinished attempt here; your draft is saved.",
            state=state.to_dict(),
            eligibility_note="",
        )
    offer_at = _offer_at(state, now)
    explicit_practice = requested_mode == "practice"
    if offer_at > now and not (explicit_practice or requested_mode == "learn"):
        return Selection(
            "no_review_needed",
            next_at=offer_at,
            reason="Nothing is due yet." if state.due is not None and state.due > now else "Recent exposure; a check now would only be practice.",
            action="read",
            alternatives=[{"item_id": item["id"], "mode": "practice", "label": "Practice anyway (no delayed credit)"}],
        )
    if requested_mode in ("learn", "practice", "review"):
        mode = requested_mode
        if mode == "learn" and item.get("example") is None:
            mode = "practice" if offer_at > now else "review"
    else:
        cooling = state.cooldown is not None and state.cooldown > now
        mode = "practice" if (cooling or (state.due is not None and state.due > now)) else "review"
    if mode == "review" and requested_mode is None and not state.encountered and item.get("example") is not None:
        note = "First encounter: this answer sets a baseline. Choose “Show an example first” to learn instead."
    else:
        note = ""
    return Selection(
        "offer",
        item=public_item(packet, item),
        mode=mode,
        why=_why(packet, item, state, mode, now),
        state=state.to_dict(),
        eligibility_note=note,
        alternatives=[
            {"item_id": row[1]["id"], "mode": mode, "label": row[1]["stem"][:80]} for row in remaining[1:4]
        ],
    )
