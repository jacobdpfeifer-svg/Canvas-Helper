"""Exam-relative learn loop: expanding gaps, delayed hits, due-review cap."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from canvas_mcp.core.habit import habit_path, local_today, record_brief_day
from canvas_mcp.core.learn_loop import (
    add_item,
    compare_evaluation_snapshots,
    coverage_clock,
    due_reviews,
    due_reviews_payload,
    eval_snapshots_path,
    evaluation_snapshot,
    evidence_rung,
    knowledge_health,
    load_items,
    main as learn_loop_main,
    missing_evidence,
    progress_payload,
    record_evaluation_snapshot,
    record_outcome,
    render_due_reviews,
    render_progress,
    why_due,
    REST_LINE,
)
from canvas_mcp.core.prompt_assembly import assemble_turn
from canvas_mcp.core.skill_router import bundled_skills_dir, load_skill
from canvas_mcp.core.teach_hint import parse_prior_knowledge, write_prior_knowledge
from canvas_mcp.core.user_root import ensure_user_root

NOW = datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc)


def _root(tmp_path: Path) -> Path:
    return ensure_user_root(tmp_path / "student")


def test_workflow_is_rejected(tmp_path: Path) -> None:
    root = _root(tmp_path)
    with pytest.raises(ValueError, match="workflow"):
        add_item(
            root,
            course="ENGL",
            claim="sign up for dinner",
            kind="workflow",
            now=NOW,
        )
    assert load_items(root) == []


def test_first_review_is_about_a_day_later(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH 1300",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    assert item.stability == "fragile"
    nxt = datetime.fromisoformat(item.next_review_at)
    assert nxt.date() == (NOW + timedelta(days=1)).date()
    assert due_reviews(root, now=NOW) == []


def test_checkpoint_inside_three_days_reviews_sooner(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH 1300",
        claim="state the product rule",
        kind="confusable",
        checkpoint_due="2026-09-09",
        now=NOW,
    )
    nxt = datetime.fromisoformat(item.next_review_at)
    assert nxt <= NOW + timedelta(days=1)
    assert nxt.date() < datetime(2026, 9, 9, tzinfo=timezone.utc).date() or nxt <= NOW


def test_early_miss_without_flag_does_not_change_stability(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    early = record_outcome(root, item.id, "miss", same_session=False, now=NOW)
    assert early.stability == "fragile"
    assert early.next_review_at == item.next_review_at
    assert early.start_with_example is False
    stored = load_items(root)[0]
    assert stored.stability == "fragile"
    assert stored.next_review_at == item.next_review_at

    due_at = datetime.fromisoformat(item.next_review_at) + timedelta(hours=1)
    assert why_due(load_items(root)[0], due_at) == "scheduled gap elapsed"
    prompt = render_due_reviews(root, now=due_at)
    assert "start: retrieval" in prompt
    assert "worked example" not in prompt
    assert "varied attempt" not in prompt


def test_second_partial_does_not_demote_twice(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-28",
        now=NOW,
    )
    stored = load_items(root)[0]
    stored.stability = "durable"
    stored.gap_days = 7
    stored.next_review_at = (NOW + timedelta(days=7)).isoformat()
    from canvas_mcp.core.learn_loop import _write_items

    _write_items(root, [stored])

    due_at = NOW + timedelta(days=7)
    first = record_outcome(root, item.id, "partial", now=due_at)
    assert first.stability == "holding"
    again = record_outcome(root, item.id, "partial", now=due_at + timedelta(seconds=1))
    assert again.stability == "holding"
    assert again.next_review_at == first.next_review_at
    assert load_items(root)[0].stability == "holding"


def test_skipped_does_not_write_habit(tmp_path: Path) -> None:
    from canvas_mcp.core.habit import habit_path

    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    record_outcome(root, item.id, "skipped", now=NOW + timedelta(days=2))
    assert not habit_path(root).exists()


def test_malformed_items_yaml_due_is_empty(tmp_path: Path) -> None:
    root = _root(tmp_path)
    path = root / "inbox" / "learn" / "items.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("items: [\n", encoding="utf-8")
    assert due_reviews(root, now=NOW) == []
    payload = due_reviews_payload(root, now=NOW)
    assert payload["items"] == []


def test_same_session_hit_does_not_advance_stability(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    updated = record_outcome(
        root,
        item.id,
        "hit",
        confidence_claimed=True,
        same_session=True,
        now=NOW,
    )
    assert updated.stability == "fragile"
    assert updated.confidence_claimed is True
    assert updated.next_review_at == item.next_review_at


def test_delayed_hit_expands_and_miss_forces_example(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    later = NOW + timedelta(days=1)
    hit = record_outcome(root, item.id, "hit", now=later)
    assert hit.stability == "holding"
    assert hit.stability_delta == "fragile → holding"
    assert hit.gap_days == 3
    assert hit.start_with_example is False

    miss_at = datetime.fromisoformat(hit.next_review_at) + timedelta(hours=1)
    missed = record_outcome(root, item.id, "miss", now=miss_at)
    assert missed.stability == "fragile"
    assert missed.stability_delta is None
    assert missed.start_with_example is True


def test_durable_only_after_substantial_delayed_hit(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-28",
        now=NOW,
    )
    stored = load_items(root)[0]
    stored.gap_days = 7
    stored.next_review_at = (NOW + timedelta(days=7)).isoformat()
    stored.created_at = NOW.isoformat()
    from canvas_mcp.core.learn_loop import _write_items

    _write_items(root, [stored])

    still = record_outcome(
        root,
        item.id,
        "hit",
        confidence_claimed=True,
        now=NOW + timedelta(days=1),
    )
    assert still.stability == "fragile"

    durable = record_outcome(root, item.id, "hit", now=NOW + timedelta(days=7))
    assert durable.stability == "durable"
    assert durable.stability_delta == "fragile → durable"
    assert due_reviews(root, now=NOW + timedelta(days=8)) == []
    pre_exam = datetime(2026, 9, 26, tzinfo=timezone.utc)
    assert due_reviews(root, now=pre_exam)


def test_due_reviews_cap_and_mix_confusable(tmp_path: Path) -> None:
    root = _root(tmp_path)
    add_item(
        root,
        course="MATH",
        claim="chain rule",
        kind="confusable",
        checkpoint_due="2026-09-09",
        now=NOW,
    )
    add_item(
        root,
        course="MATH",
        claim="product rule",
        kind="confusable",
        checkpoint_due="2026-09-09",
        now=NOW,
    )
    add_item(
        root,
        course="ENGL",
        claim="thesis claim",
        kind="declarative",
        checkpoint_due="2026-09-09",
        now=NOW,
    )
    due = due_reviews(root, now=NOW + timedelta(days=2))
    assert len(due) == 2
    assert {item.claim for item in due} == {"chain rule", "product rule"}
    text = render_due_reviews(root, now=NOW + timedelta(days=2))
    assert "Mix the confusable claims" in text
    assert "I know this" in text


def test_readd_does_not_reset_schedule(tmp_path: Path) -> None:
    root = _root(tmp_path)
    first = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        assignment_id="9",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    again = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        assignment_id="9",
        checkpoint_due="2026-09-20",
        now=NOW + timedelta(days=3),
    )
    assert again.id == first.id
    assert again.next_review_at == first.next_review_at
    assert len(load_items(root)) == 1


def test_prompt_surfaces_at_most_two_due_reviews(tmp_path: Path) -> None:
    root = _root(tmp_path)
    add_item(
        root,
        course="MATH",
        claim="chain rule",
        kind="declarative",
        checkpoint_due="2026-09-08",
        now=NOW - timedelta(days=2),
    )
    skill = load_skill(bundled_skills_dir() / "student-task-brief" / "SKILL.md")
    week = """| Course | Assignment | Due |
|--------|------------|-----|
| MATH | Quiz 1 | 2026-09-12 |
"""
    turn = assemble_turn(skill, root, "what should I do first", week_md=week)
    assert "## Due reviews" in turn.volatile
    assert "do_first:" not in turn.prefix
    triage = load_skill(bundled_skills_dir() / "student-assignment-triage" / "SKILL.md")
    other = assemble_turn(triage, root, "what should I do first", week_md=week)
    assert "## Due reviews" not in other.volatile


def test_json_due_payload_and_same_session_outcome(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    import json

    root = _root(tmp_path)
    past = datetime(2020, 1, 1, tzinfo=timezone.utc)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=past,
    )
    later = past + timedelta(days=3)
    payload = due_reviews_payload(root, now=later)
    assert len(payload["items"]) == 1
    row = payload["items"][0]
    assert set(row) == {
        "id",
        "course",
        "claim",
        "kind",
        "stability",
        "start_with_example",
        "checkpoint_due",
        "gap_days",
        "why",
        "rung",
        "missing",
        "counterfactual",
    }
    assert row["id"] == item.id
    assert row["stability"] == "fragile"
    assert row["why"] == "scheduled gap elapsed"
    assert row["rung"] == "encountered"

    rc = learn_loop_main(
        [
            "--user-root",
            str(root),
            "--json",
            "due",
        ]
    )
    assert rc == 0
    printed = json.loads(capsys.readouterr().out)
    assert printed["items"][0]["id"] == item.id

    rc = learn_loop_main(
        [
            "--user-root",
            str(root),
            "--json",
            "outcome",
            "--id",
            item.id,
            "--outcome",
            "hit",
            "--same-session",
        ]
    )
    assert rc == 0
    updated = json.loads(capsys.readouterr().out)
    assert updated["stability"] == "fragile"
    assert updated["stability_delta"] is None
    assert updated["next_review_at"] == item.next_review_at
    stored = load_items(root)[0]
    assert stored.stability == "fragile"
    assert stored.next_review_at == item.next_review_at


def test_json_due_empty_when_nothing_scheduled(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    import json

    root = _root(tmp_path)
    rc = learn_loop_main(["--user-root", str(root), "--json", "due"])
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["items"] == []
    assert payload["practice"]["state"] == "idle"
    assert payload["practice"]["line"] == ""


def test_write_prior_knowledge_round_trip(tmp_path: Path) -> None:
    root = _root(tmp_path)
    path = write_prior_knowledge(root, "MATH 1300", "novice")
    text = path.read_text(encoding="utf-8")
    assert parse_prior_knowledge(text) == "novice"
    write_prior_knowledge(root, "MATH1300", "experienced")
    assert parse_prior_knowledge(path.read_text(encoding="utf-8")) == "experienced"


def test_rest_when_claims_are_waiting_not_when_quiz_unextracted(tmp_path: Path) -> None:
    root = _root(tmp_path)
    add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    resting = render_due_reviews(root, now=NOW)
    assert REST_LINE in resting
    assert "Due reviews" not in resting

    week = """| Course | Assignment | Due | Type |
|--------|------------|-----|------|
| PHYS | Midterm exam | 2026-09-18 | quiz |
"""
    unextracted = render_due_reviews(root, week_md=week, now=NOW)
    assert "not rest" in unextracted
    assert REST_LINE not in unextracted

    clock = coverage_clock(root, week_md=week, now=NOW)
    states = {row["state"] for row in clock}
    assert "unextracted" in states
    assert "in_the_gap" in states


def test_coverage_due_now_is_the_check_then_rest(tmp_path: Path) -> None:
    root = _root(tmp_path)
    add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW - timedelta(days=2),
    )
    later = NOW + timedelta(days=1)
    payload = due_reviews_payload(root, now=later)
    assert payload["practice"]["state"] == "due_now"
    assert "then these rest" in payload["practice"]["line"]
    assert payload["coverage"][0]["state"] == "due_now"
    assert payload["health"]["fragile"] == 1
    assert "durable retrieval" not in payload["health"]["line"]
    assert "not a score" in render_due_reviews(root, now=later)


def test_evidence_ladder_and_why_due(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-28",
        now=NOW,
    )
    fresh = load_items(root)[0]
    assert evidence_rung(fresh) == "encountered"
    assert "confidence is not evidence" in missing_evidence(fresh)
    assert knowledge_health(load_items(root))["attempt_only"] == 0

    same = record_outcome(
        root,
        item.id,
        "hit",
        confidence_claimed=True,
        same_session=True,
        now=NOW,
    )
    assert evidence_rung(same) == "attempted"
    assert same.stability == "fragile"
    assert "delayed retrieval" in missing_evidence(same)
    assert knowledge_health(load_items(root))["attempt_only"] == 1

    later = NOW + timedelta(days=1)
    holding = record_outcome(root, item.id, "hit", now=later)
    assert evidence_rung(holding) == "delayed_hit"
    assert why_due(holding, later) == "scheduled gap elapsed"
    text = render_due_reviews(root, now=later + timedelta(days=3))
    assert "why: scheduled gap elapsed" in text
    assert "rung: delayed_hit" in text

    stored = load_items(root)[0]
    stored.gap_days = 7
    stored.next_review_at = (NOW + timedelta(days=7)).isoformat()
    from canvas_mcp.core.learn_loop import _write_items

    _write_items(root, [stored])
    durable = record_outcome(root, item.id, "hit", now=NOW + timedelta(days=7))
    assert evidence_rung(durable) == "durable_near_checkpoint"
    assert missing_evidence(durable) == ""
    assert "exam ready" not in missing_evidence(durable)
    pre_exam = datetime(2026, 9, 26, tzinfo=timezone.utc)
    assert why_due(durable, pre_exam) == (
        "pre-exam window — scheduled check before the checkpoint"
    )
    health = knowledge_health(load_items(root))
    assert health["durable"] == 1
    assert health["delayed_hit_signal"] == 1
    assert "durable retrieval signal" in health["line"]

    missed = record_outcome(
        root,
        item.id,
        "miss",
        now=pre_exam,
    )
    assert evidence_rung(missed) == "attempted"
    assert missed.start_with_example is True
    miss_clause = "last miss — start with a worked example, then retrieve"
    assert why_due(missed, pre_exam) == miss_clause
    miss_prompt = render_due_reviews(root, now=pre_exam + timedelta(hours=5))
    assert miss_prompt.count(miss_clause) == 1
    assert "start: worked_example" in miss_prompt
    assert "varied attempt" not in miss_prompt

    procedural = add_item(
        root,
        course="PHYS",
        claim="set up the free-body diagram",
        kind="procedural",
        checkpoint_due="2026-09-28",
        now=NOW - timedelta(days=2),
    )
    varied_at = datetime.fromisoformat(procedural.next_review_at) + timedelta(hours=1)
    varied = render_due_reviews(root, now=varied_at)
    assert "claim: set up the free-body diagram" in varied
    assert varied.count("one varied attempt, then feedback, not a definition recall") == 1
    assert "worked example" not in varied.split("set up the free-body diagram")[1].split("\n")[0]


def test_workflow_never_enters_health(tmp_path: Path) -> None:
    root = _root(tmp_path)
    with pytest.raises(ValueError, match="workflow"):
        add_item(
            root,
            course="ENGL",
            claim="sign up for dinner",
            kind="workflow",
            now=NOW,
        )
    assert knowledge_health(load_items(root))["line"] == ""
    assert "workflow" not in render_due_reviews(root, now=NOW + timedelta(days=2))


def test_progress_groups_stability_by_course(tmp_path: Path) -> None:
    root = _root(tmp_path)
    assert progress_payload(root) == {
        "courses": [],
        "totals": {"fragile": 0, "holding": 0, "durable": 0, "total": 0},
    }
    assert render_progress(root) == ""

    add_item(root, course="MATH", claim="chain rule", kind="declarative", now=NOW)
    holding = add_item(root, course="MATH", claim="product rule", kind="declarative", now=NOW)
    record_outcome(root, holding.id, "hit", now=NOW + timedelta(days=2))
    add_item(root, course="PHYS", claim="free body", kind="declarative", now=NOW)

    payload = progress_payload(root)
    by_course = {row["course"]: row for row in payload["courses"]}
    assert by_course["MATH"]["total"] == 2
    assert by_course["MATH"]["fragile"] == 1
    assert by_course["MATH"]["holding"] == 1
    assert by_course["PHYS"]["fragile"] == 1
    assert payload["totals"]["total"] == 3
    assert len(by_course["MATH"]["claims"]) == 2

    block = render_progress(root)
    assert "## Retention" in block
    assert "MATH — 1 fragile, 1 holding, 0 durable retrieval signals" in block
    assert "PHYS — 1 fragile, 0 holding, 0 durable retrieval signals" in block
    assert "exam readiness" in block
    assert "you know this" not in block


def test_progress_cli_and_teaching_prompt(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    import json

    root = _root(tmp_path)
    add_item(root, course="MATH", claim="chain rule", kind="declarative", now=NOW)
    record_brief_day(root, on=local_today(root))

    rc = learn_loop_main(["--user-root", str(root), "--json", "progress"])
    assert rc == 0
    printed = json.loads(capsys.readouterr().out)
    assert printed["courses"][0]["course"] == "MATH"
    assert printed["totals"]["fragile"] == 1

    skill = load_skill(bundled_skills_dir() / "student-task-brief" / "SKILL.md")
    week = """| Course | Assignment | Due |
|--------|------------|-----|
| MATH | Quiz 1 | 2026-09-20 |
"""
    turn = assemble_turn(skill, root, "what should I do first", week_md=week)
    assert "## Retention" in turn.volatile
    assert "Brief continuity: written today" in turn.volatile
    assert "do_first:" not in turn.prefix

    triage = load_skill(bundled_skills_dir() / "student-assignment-triage" / "SKILL.md")
    other = assemble_turn(triage, root, "what should I do first", week_md=week)
    assert "## Retention" not in other.volatile
    assert "Brief continuity: written today" not in other.volatile


def test_evaluation_snapshot_outcomes_and_exposure(tmp_path: Path) -> None:
    from canvas_mcp.core.teach_hint import write_focus

    root = _root(tmp_path)
    week = """| Course | Assignment | Due | Outcome |
|--------|------------|-----|---------|
| CHEM | Lab report | 2026-09-01 |  |
| CHEM | Syllabus quiz | 2026-08-01 | submitted |
| MATH | Problem set | 2026-09-10 |  |
| PHYS | Midterm | 2026-09-09 |  |
"""
    (root / "inbox").mkdir(parents=True, exist_ok=True)
    (root / "inbox" / "week.md").write_text(week, encoding="utf-8")
    write_focus(
        root,
        open_with="recall the chain rule",
        format="retrieval",
        items=["MATH — Problem set — due 2026-09-10 — Check: product rule"],
        updated=NOW.date() - timedelta(days=2),
        now=NOW,
    )
    habit_before = habit_path(root).read_text(encoding="utf-8")
    profile = root / "calibration" / "learning-profile.yaml"
    ledger = root / "ledger.jsonl"
    profile_before = profile.read_text(encoding="utf-8") if profile.exists() else None
    ledger_before = ledger.read_text(encoding="utf-8") if ledger.exists() else None

    past = NOW - timedelta(days=3)
    waiting = add_item(
        root, course="MATH", claim="chain rule", kind="declarative", now=past
    )
    holding = add_item(
        root, course="MATH", claim="product rule", kind="declarative", now=past
    )
    record_outcome(root, holding.id, "hit", now=NOW)

    snap = evaluation_snapshot(root, now=NOW, week_md=week)
    assert snap["delayed_reviews_open"] >= 1
    assert waiting.id
    assert snap["delayed_hit_signal"] >= 1
    assert snap["delayed_hit_label"] == "retrieval signal, not exam readiness"
    assert snap["overdue_work"] == 1
    assert "Lab report" in snap["overdue_labels"][0]
    assert "Syllabus quiz" not in " ".join(snap["overdue_labels"])
    assert snap["deadline_surprises"] >= 1
    assert any("Midterm" in label for label in snap["deadline_surprise_labels"])
    assert "Problem set" not in " ".join(snap["deadline_surprise_labels"])
    assert set(snap["exposure"]) >= {"streak", "last_brief_date", "briefed_today", "note"}
    assert "not success" in snap["exposure"]["note"]
    assert "not causal" in snap["note"]
    assert habit_path(root).read_text(encoding="utf-8") == habit_before
    profile_after = profile.read_text(encoding="utf-8") if profile.exists() else None
    ledger_after = ledger.read_text(encoding="utf-8") if ledger.exists() else None
    assert profile_after == profile_before
    assert ledger_after == ledger_before
    assert not eval_snapshots_path(root).exists()


def test_evaluate_record_and_compare_do_not_claim_causality(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    import json

    root = _root(tmp_path)
    first = record_evaluation_snapshot(root, now=NOW)
    second = record_evaluation_snapshot(root, now=NOW + timedelta(days=1))
    assert eval_snapshots_path(root).is_file()
    compared = compare_evaluation_snapshots(root)
    assert compared["ok"] is True
    assert compared["before"]["delayed_reviews_open"] == first["delayed_reviews_open"]
    assert compared["after"]["delayed_reviews_open"] == second["delayed_reviews_open"]
    assert "not causal" in compared["note"]

    rc = learn_loop_main(["--user-root", str(root), "evaluate", "--compare"])
    assert rc == 0
    printed = json.loads(capsys.readouterr().out)
    assert printed["ok"] is True
    assert "not causal" in printed["note"]


def test_yesterday_brief_is_not_a_recovery_gap(tmp_path: Path) -> None:
    from canvas_mcp.core.teach_hint import write_focus

    root = _root(tmp_path)
    week = """| Course | Assignment | Due |
|--------|------------|-----|
| CHEM | Lab report | 2026-09-01 |
"""
    write_focus(
        root,
        open_with="recall the method",
        format="retrieval",
        items=["CHEM — Lab report — due 2026-09-01 — Check: method"],
        updated=NOW.date() - timedelta(days=1),
        now=NOW,
    )
    payload = due_reviews_payload(root, now=NOW, week_md=week)
    assert payload["practice"]["recovery"] is False
    assert payload["practice"]["focus_stale"] is False
    assert payload["practice"]["state"] != "recovery"
    assert payload["practice"]["open_with"] == "recall the method"


def test_stale_focus_recovers_one_overdue_item(tmp_path: Path) -> None:
    from canvas_mcp.core.teach_hint import write_focus

    root = _root(tmp_path)
    week = """| Course | Assignment | Due |
|--------|------------|-----|
| CHEM | Lab report | 2026-09-01 |
| CHEM | Older worksheet | 2026-08-20 |
"""
    write_focus(
        root,
        open_with="recall yesterday's check",
        format="retrieval",
        items=["CHEM — Lab report — due 2026-09-01 — Check: method"],
        updated=NOW.date() - timedelta(days=3),
        now=NOW,
    )
    payload = due_reviews_payload(root, now=NOW, week_md=week)
    assert payload["practice"]["recovery"] is True
    assert payload["practice"]["state"] == "recovery"
    assert payload["practice"]["line"] == (
        "Most valuable now: CHEM — Lab report. Start there — do not backfill the rest."
    )
    assert "Older worksheet" not in payload["practice"]["line"]
    assert payload["practice"]["open_with"] == ""
    block = render_due_reviews(root, now=NOW, week_md=week)
    assert "## Practice" in block
    assert "Lab report" in block
    assert "missed brief" in block.lower() or "Do not mention a missed brief count." in block
