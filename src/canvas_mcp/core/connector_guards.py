"""Per-connector ConfirmationGuard instances for Bucket-A write actions.

Bucket-A connectors (see ``plugins/README.md`` and
``browser/scripts/lib/connector-registry.mjs``) may eventually expose MCP tools
that write to or act on the student account. Those writes must use the same
preview → fingerprint → issue-token → confirm → reserve flow as
``ConfirmationGuard`` provides generally.

``submit_assignment`` (``tools/student_write.py``) is NOT an example to follow
here anymore — it is read-only preview only since the canvas-focus pivot
(``docs/handoff/canvas-focus-pivot-2026-09-11.md``) and has no
``ConfirmationGuard`` of its own left to reuse. Canvas-visible actions
(submit, comment, discussion post) stay banned outright per that pivot —
they carry institutional/academic-integrity weight and this module must
never grow an execute path for them.

Personal-account actions that land in someone else's inbox or calendar
(Gmail ``send_email``, Google Calendar ``create_event``/``update_event``)
are different: per the 2026-09-13 addendum to the same doc, those are
allowed to execute through this guard *only* when a human confirms that
exact previewed content in the current conversation — never on a standing/
automatic posture. See ``permissions.py``'s ``DEFAULT_K`` (no entry for
``email_send``/``calendar`` — no escalation to automatic, ever).

Rules
-----
- Instantiate a **dedicated** guard per connector via ``get_connector_guard``.
- No connector gets an implicit "safe because read-only" exemption for its
  first write-capable action.
- Bucket-B (assessment / proctored) tools must never call this module — they
  stay on the LTI escape hatch (student operates, agent drafts).
- Canvas-visible tools (submit/comment/discussion-post) never get an execute
  path here, full stop — personal email/calendar sends may, gated per above.
"""

from __future__ import annotations

from .write_confirmation import ConfirmationGuard

_DEFAULT_TTL_SECONDS = 300

# connector_id ("{school}/{slug}") -> guard. Process-local, like _SUBMIT_GUARD.
_CONNECTOR_GUARDS: dict[str, ConfirmationGuard] = {}


def get_connector_guard(
    connector_id: str,
    *,
    ttl_seconds: int = _DEFAULT_TTL_SECONDS,
) -> ConfirmationGuard:
    """Return the ConfirmationGuard for a registered Bucket-A connector.

    Creates the guard on first use. Callers must still bind identity
    (``set_identity_provider``) when running in multi-user HTTP mode.
    """
    key = str(connector_id or "").strip()
    if not key:
        raise ValueError("connector_id is required")
    guard = _CONNECTOR_GUARDS.get(key)
    if guard is None:
        guard = ConfirmationGuard(ttl_seconds=ttl_seconds)
        _CONNECTOR_GUARDS[key] = guard
    return guard


def reset_connector_guards() -> None:
    """Clear all connector guards (tests only)."""
    for guard in _CONNECTOR_GUARDS.values():
        guard.reset()
    _CONNECTOR_GUARDS.clear()
