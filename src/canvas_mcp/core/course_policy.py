"""Wire-level guards for student write payloads."""

from __future__ import annotations

from typing import Any


def assert_no_identity_override(data: dict[str, Any]) -> None:
    """Guard the outbound field set of a student write.

    The submit endpoint (``POST /courses/:id/assignments/:id/submissions``) is
    the one student write path that is *not* structurally self-scoped: Canvas
    accepts ``submission[user_id]`` there to submit on another user's behalf
    when the token carries grading permission. Since a real person can hold
    mixed student and TA enrollments, the tool profile alone does not guarantee
    the token lacks that permission.

    So the guarantee is enforced on the wire instead: no student write may ever
    carry an identity override. Raising here is deliberate. This is a
    programming error, not a user error, and it must never be swallowed into a
    partial success.
    """
    forbidden = {
        "as_user_id",
        "submission[user_id]",
        "user_id",
        "submission[group_id]",
        "group_id",
        "student_id",
    }
    present = forbidden.intersection(data)
    if present:
        raise ValueError(
            "Student write attempted with identity-override field(s): "
            f"{', '.join(sorted(present))}"
        )
