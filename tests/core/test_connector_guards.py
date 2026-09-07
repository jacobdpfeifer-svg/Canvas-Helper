"""Tests for per-connector ConfirmationGuard factory."""

from canvas_mcp.core.connector_guards import (
    get_connector_guard,
    reset_connector_guards,
)
from canvas_mcp.core.write_confirmation import ConfirmationGuard


def setup_function() -> None:
    reset_connector_guards()


def teardown_function() -> None:
    reset_connector_guards()


def test_get_connector_guard_returns_dedicated_instance() -> None:
    a = get_connector_guard("cu-boulder/campusgroups")
    b = get_connector_guard("cu-boulder/campusgroups")
    c = get_connector_guard("cu-boulder/gradebook")
    assert isinstance(a, ConfirmationGuard)
    assert a is b
    assert a is not c


def test_connector_guard_preview_confirm_flow() -> None:
    guard = get_connector_guard("cu-boulder/example")
    fp = guard.fingerprint("action", "target-1", "payload-digest")
    token = guard.issue(fp)
    assert guard.check(token, fp) is None
    assert guard.reserve(token) is True
    assert guard.reserve(token) is False


def test_get_connector_guard_requires_id() -> None:
    try:
        get_connector_guard("")
        assert False, "expected ValueError"
    except ValueError:
        pass
