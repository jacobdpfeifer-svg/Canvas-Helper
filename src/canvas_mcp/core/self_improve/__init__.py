"""Request logging + episodic-to-semantic memory distillation.

The cluster → draft → shadow → promote skill-writing pipeline that used to
live alongside these (``cluster.py`` / ``drafter.py`` / ``shadow.py`` /
``promoter.py`` / ``run.py``) is deleted — no external demand signal for an
agent that rewrites its own prompts from its own shadow runs. See
``docs/handoff/canvas-focus-pivot-2026-09-11.md``. ``log_request`` and
``distill_episodic_to_semantic`` stay: request logging feeds
``skill_router.route_intent``, and distillation feeds ``MEMORY.md`` directly
from things the student already said, not from a self-rewriting pipeline.
"""

from .distill import distill_episodic_to_semantic
from .logger import RequestLog, log_request

__all__ = [
    "RequestLog",
    "log_request",
    "distill_episodic_to_semantic",
]
