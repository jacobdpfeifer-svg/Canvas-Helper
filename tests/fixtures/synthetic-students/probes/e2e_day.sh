#!/usr/bin/env bash
# One morning for Avery (dense week), then a switch to Blake. Fixture data only:
# no Canvas, no PAT, no model, no mail, no calendar. Repeatable from a clean checkout:
#   bash tests/fixtures/synthetic-students/probes/e2e_day.sh
set -uo pipefail
cd "$(dirname "$0")/../../../.."

export PYTHONPATH=src PRODUCTNAME_LLM_API_KEY= PRODUCTNAME_LLM_WRITE_API_KEY=
unset SCHOOL_SLUG
PY=.venv/bin/python
F=tests/fixtures/synthetic-students
AV=var/audit-user-roots/e2e-avery
BL=var/audit-user-roots/e2e-blake
NOW=2026-10-05T15:00:00Z
fails=0
step() { if [ "$2" = 0 ]; then echo "PASS $1"; else echo "FAIL $1"; fails=$((fails + 1)); fi; }

$PY $F/make_root.py avery-chen --week dense --out "$AV" >/dev/null
$PY $F/make_root.py blake-okonkwo --out "$BL" >/dev/null
ledger_before=$(wc -c <"$AV/ledger.jsonl")

# 1. First-run profile loads from the synthetic USER.md.
$PY - "$AV" <<'EOF'
import sys
from pathlib import Path
from canvas_mcp.core.learning_profile import load_learning_profile
root = Path(sys.argv[1])
p = load_learning_profile(root)
text = (root / "USER.md").read_text(encoding="utf-8")
assert "Avery Chen" in text and "Aerospace Engineering Sciences" in text
print("  profile:", type(p).__name__, "start bias:", getattr(p, "start_bias", "?"))
EOF
step "1 profile loads from USER.md" $?

# 2. Week brief from the dense week: the do-first is due inside 48 h; the WebAssign row is process help.
DEV_USER_ROOT="$AV" $PY - "$NOW" <<'EOF'
import os, re, sys
from datetime import datetime
from pathlib import Path
from canvas_mcp.core.prompt_assembly import assemble_turn
from canvas_mcp.core.skill_router import load_skills_for_routing, route_skill
from canvas_mcp.core.teach_hint import render_teach_hint
from canvas_mcp.core.user_root import resolve_user_root
root = resolve_user_root("dev")
now = datetime.fromisoformat(sys.argv[1].replace("Z", "+00:00"))
res = route_skill(load_skills_for_routing(root), "what should I do first")
assert res.skill.skill_id == "student-task-brief", res.skill
turn = assemble_turn(res.skill, root, "what should I do first")
week = (root / "inbox" / "week.md").read_text(encoding="utf-8")
hint = render_teach_hint(root, "what should I do first", week, now=now)
do_first = re.search(r"do_first: (.*)", hint).group(1)
row = next(l for l in week.splitlines() if do_first.split(" — ", 1)[1] in l)
due = re.search(r"\| (Oct \d+), ", row).group(1)
within_48h = due in ("Oct 5", "Oct 6", "Oct 7")
webassign = [l for l in turn.volatile.splitlines() if l.startswith("|") and "WebAssign" in l]
process_help = all("bucket:B" in l and "never auto" in l for l in webassign) and "process help only" in turn.system
print(f"  skill={res.skill.skill_id} do_first={do_first!r} due={due} within_48h={within_48h}")
print(f"  WebAssign rows={len(webassign)} marked Bucket B + process-help rule in system={process_help}")
print(f"  Updated line in slice={'Updated: 2026-10-05' in turn.volatile}")
assert within_48h and webassign and process_help
EOF
step "2 dense brief: do-first inside 48 h, external tool = process help" $?

# 3. One study session on the fixture packet: start, attempt, outcome.
st() { $PY -m canvas_mcp.core.study --user-root "$AV" --now "$NOW" --zone America/Denver "$@"; }
st import --path "$AV/fixture-packets/study-packet.json" >/dev/null
att=$(st start --item AV-1 --mode review --minutes 5 | $PY -c "import json,sys;print(json.load(sys.stdin)['attempt']['attempt_id'])")
st submit --attempt "$att" --fields '{"product":"-6"}' | $PY -c "
import json,sys; a=json.load(sys.stdin)['assessment']
print('  outcome', a['outcome'], 'grader', a['grader'], 'evidence', a['evidence'])
assert a['outcome']=='correct' and a['grader']=='deterministic' and a['evidence']=='baseline_response'"
step "3 study session: correct first answer is a baseline, not retention" $?

# 4. One local plan action: a self-commitment plus a discussion draft Ask. Nothing leaves the machine.
$PY -m canvas_mcp.core.commitment --user-root "$AV" add --text "Start PS6 problem 1 after lab" \
  --deadline 2026-10-06T22:00:00+00:00 --course "APPM 2360" >/dev/null &&
echo '{"cmd":"ask-create","params":{"content":"Help me draft my discussion post on where the second law bites.","course_hint":"ASEN 2402","session_goal":"make_handle"}}' |
  $PY -m canvas_mcp.core.study --user-root "$AV" --now "$NOW" run | $PY -c "
import json,sys; d=json.load(sys.stdin)
print('  ask job', d['classification'].get('job'), '| boundary', d['classification'].get('boundary'), '| next:', d['actions']['recommendation'].get('title'))
assert d['ok']"
rc=$?
ledger_after=$(wc -c <"$AV/ledger.jsonl")
auth_files=$(find "$AV/auth" -type f | wc -l | tr -d ' ')
echo "  ledger bytes ${ledger_before}->${ledger_after}; auth files=${auth_files}"
[ $rc = 0 ] && [ "$ledger_before" = "$ledger_after" ] && [ "$auth_files" = 0 ]
step "4 local plan action: no Canvas submit, no mail, no calendar write" $?

# 5. Profile read shows Avery's school slug and none of Blake.
slug=$(cat "$AV/school_slug")
$PY - "$AV" <<'EOF'
import sys
from pathlib import Path
from canvas_mcp.core.habit import brief_timezone
root = Path(sys.argv[1])
text = (root / "USER.md").read_text(encoding="utf-8")
assert "**School slug:** cu-boulder" in text and "Blake" not in text and "Okonkwo" not in text
print("  USER.md slug cu-boulder; habit timezone:", brief_timezone(root))
EOF
rc=$?
[ $rc = 0 ] && [ "$slug" = cu-boulder ]
step "5 profile shows cu-boulder and no Blake data" $?

# 6. Switch to Blake: still empty, nothing from Avery's morning.
DEV_USER_ROOT="$BL" $PY - <<'EOF'
import json
from canvas_mcp.core.prompt_assembly import select_inbox_slice
from canvas_mcp.core.study.service import StudyService
from canvas_mcp.core.user_root import resolve_user_root
root = resolve_user_root("dev")
week = root / "inbox" / "week.md"
s = StudyService(root).status()
blob = json.dumps(s) + (week.read_text() if week.is_file() else "") + (root / "ledger.jsonl").read_text()
asks = list((root / "study" / "asks").glob("*.json")) if (root / "study" / "asks").exists() else []
commit = (root / "inbox" / "commitments.yaml").exists()
slice_, _ = select_inbox_slice(week.read_text() if week.is_file() else "", "what should I do first")
leak = [m for m in ("APPM", "ASEN", "AV-1", "Avery", "PS6") if m in blob or m in slice_]
print(f"  blake week={week.is_file()} packets={s['packets']} asks={len(asks)} commitment={commit} leak={leak}")
assert not week.is_file() and not s["packets"] and not asks and not commit and not leak
EOF
step "6 Blake still empty; no leak from Avery's morning" $?

echo "e2e day: $((6 - fails))/6 steps passed"
exit $fails
