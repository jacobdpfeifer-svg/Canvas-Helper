"""Self-improving skill loop (Hermes/Voyager pattern).

Safety floor (NOT an eval quality gate): never shadow-test or auto-promote
write skills. Enforced in shadow.py / promoter.py via category allowlist.
"""

from .cluster import detect_repeat_clusters
from .drafter import draft_provisional_skill
from .logger import RequestLog, log_request
from .promoter import promote_skill
from .shadow import shadow_test

__all__ = [
    "RequestLog",
    "log_request",
    "detect_repeat_clusters",
    "draft_provisional_skill",
    "shadow_test",
    "promote_skill",
]
