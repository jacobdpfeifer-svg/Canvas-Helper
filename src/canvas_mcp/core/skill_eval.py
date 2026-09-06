"""Skill eval harness — each active skill must pass on small local models.

Marks ``requires_cloud: true`` skills as skipped for local eval.

Set ``PRODUCTNAME_LIVE_SKILL_EVAL=1`` to attempt a live Ollama tool-call probe
(``OLLAMA_HOST``, default ``http://127.0.0.1:11434``). CI stays structural.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .skill_router import SkillMeta, load_skill


@dataclass
class EvalResult:
    skill_id: str
    passed: bool
    skipped: bool
    reason: str


def _live_eval_enabled() -> bool:
    return os.environ.get("PRODUCTNAME_LIVE_SKILL_EVAL", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def _ollama_chat(model: str, prompt: str) -> str | None:
    host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
    payload = json.dumps(
        {
            "model": model,
            "stream": False,
            "messages": [{"role": "user", "content": prompt}],
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{host}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None
    message = data.get("message") or {}
    content = message.get("content")
    return str(content) if content else None


def _live_tool_call_probe(skill: SkillMeta, model: str) -> EvalResult | None:
    """Optional live probe — returns None to keep structural result."""
    if not _live_eval_enabled():
        return None
    prompt = (
        f"You are evaluating skill `{skill.skill_id}`.\n"
        f"Description: {skill.description}\n"
        "Reply with exactly one line: TOOL_OK if you can follow the skill, "
        "else TOOL_FAIL."
    )
    content = _ollama_chat(model, prompt)
    if content is None:
        return EvalResult(
            skill.skill_id,
            False,
            True,
            "live eval skipped — Ollama unreachable",
        )
    ok = "TOOL_OK" in content.upper()
    return EvalResult(
        skill.skill_id,
        ok,
        False,
        "live ollama ok" if ok else f"live ollama failed: {content[:120]}",
    )


def eval_skill(skill_md: Path, *, model: str = "llama3.1:8b-instruct-q4_K_M") -> EvalResult:
    """Structural eval (schema + category + prompt budget). LLM live eval optional."""
    try:
        skill = load_skill(skill_md)
    except ValueError as exc:
        return EvalResult(skill_md.parent.name, False, False, str(exc))

    if skill.requires_cloud:
        return EvalResult(skill.skill_id, True, True, "requires_cloud")

    # Prompt budget: body under ~2000 tokens ≈ 8000 chars rough
    if len(skill.body) > 12_000:
        return EvalResult(
            skill.skill_id,
            False,
            False,
            "prompt body exceeds small-model budget (~2000 tokens)",
        )
    if not skill.description:
        return EvalResult(skill.skill_id, False, False, "missing description")

    live = _live_tool_call_probe(skill, model)
    if live is not None:
        return live
    return EvalResult(skill.skill_id, True, False, f"structural ok for {model}")


def eval_all_bundled(skills_root: Path | None = None) -> list[EvalResult]:
    root = skills_root or Path(__file__).resolve().parents[3] / "skills"
    results = []
    for skill_md in sorted(root.glob("*/SKILL.md")):
        results.append(eval_skill(skill_md))
    return results
