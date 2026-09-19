//! ProductName local daemon — sync cadence, sensors, ledger.
//!
//! Canvas sync: every 2h on term weekdays, 6h weekends, plus event-driven when
//! the Chrome extension reports Canvas tab focus. Never sub-5-minute polling.
//!
//! Autostart: enable via tauri-plugin-autostart so the daemon runs on login.

use serde::Serialize;
use serde_json::Value;
use std::env;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use crate::runtime::Runtime;

#[derive(Debug, Serialize)]
pub struct RouteResultDto {
    pub skill_id: Option<String>,
    pub method: String,
    pub ambiguous: bool,
    pub model_tier: Option<String>,
    pub raw: String,
}

/// Weekday sync interval during term.
pub const SYNC_WEEKDAY: Duration = Duration::from_secs(2 * 60 * 60);
/// Weekend sync interval.
pub const SYNC_WEEKEND: Duration = Duration::from_secs(6 * 60 * 60);
/// Absolute floor — never poll Canvas more often than this.
pub const SYNC_FLOOR: Duration = Duration::from_secs(5 * 60);

#[allow(dead_code)]
pub struct DaemonConfig {
    pub user_id: String,
    pub school_slug: String,
    pub sentry_opt_in: bool,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            user_id: "dev".into(),
            school_slug: env::var("SCHOOL_SLUG").unwrap_or_else(|_| "cu-boulder".into()),
            sentry_opt_in: false,
        }
    }
}

pub fn next_sync_interval(is_weekend: bool) -> Duration {
    let candidate = if is_weekend {
        SYNC_WEEKEND
    } else {
        SYNC_WEEKDAY
    };
    if candidate < SYNC_FLOOR {
        SYNC_FLOOR
    } else {
        candidate
    }
}

/// Log a daemon tick (cadence / sync / boot).
pub fn tick_log(reason: &str) {
    eprintln!("[productname-daemon] tick: {reason}");
}

fn run_status(mut cmd: Command, label: &str) -> Result<(), String> {
    let status = cmd
        .status()
        .map_err(|e| format!("failed to spawn {label}: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{label} exited with {status}"))
    }
}

/// Shell `npm run sync` in browser/ with DEV_USER_ROOT / SCHOOL_SLUG when set.
pub fn run_canvas_sync(rt: &Runtime) -> Result<(), String> {
    tick_log("sync");
    let cmd = rt.browser_script("sync-week")?;
    run_status(cmd, "canvas sync")
}

/// First-run deep crawl: same `npm run sync`, but widened to the whole term
/// (`DAYS`/`CATALOG_DAYS`≈150) instead of the daily 14-day window, so course
/// catalogs are populated before the student ever asks. Fired once, right
/// after onboarding confirms a Canvas session — never on the daily cadence.
pub fn run_bootstrap_sync(rt: &Runtime) -> Result<(), String> {
    tick_log("bootstrap-sync");
    let mut cmd = rt.browser_script("sync-week")?;
    cmd.env("DAYS", "150").env("CATALOG_DAYS", "150");
    run_status(cmd, "canvas bootstrap sync")
}

/// Instructor-published material → `{user_root}/inbox/study-sources/`.
/// Streams progress for onboarding Screen 3: the script prints one JSON
/// event per line (`courses` / `course` / `done`); each is handed to
/// `on_event` as it arrives so the UI can show courses landing one by one.
/// Returns Ok(()) when the process exits 0, Err(reason) otherwise — the
/// `done` event (when present) carries the honest per-course detail.
pub fn run_sync_study_sources_streaming(rt: &Runtime, mut on_event: impl FnMut(Value)) -> Result<(), String> {
    tick_log("sync-study-sources");
    let mut cmd = rt.browser_script("sync-study-sources")?;
    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to spawn study source sync: {e}"))?;
    let stdout = child.stdout.take().ok_or("study source sync stdout unavailable")?;
    for line in BufReader::new(stdout).lines().map_while(Result::ok) {
        let trimmed = line.trim();
        if !trimmed.starts_with('{') {
            continue;
        }
        if let Ok(value) = serde_json::from_str::<Value>(trimmed) {
            if value.get("event").and_then(Value::as_str).is_some() {
                on_event(value);
            }
        }
    }
    let output = child.wait_with_output().map_err(|e| format!("study source sync failed: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        let last = err.lines().rev().find(|l| !l.trim().is_empty()).unwrap_or("").trim().to_string();
        Err(if last.is_empty() { format!("study source sync exited with {}", output.status) } else { last })
    }
}

/// Every Calendar-tab read in one Python process (see canvas_mcp.core.plan_surface).
pub fn run_plan_surface(rt: &Runtime) -> Result<Value, String> {
    tick_log("plan-surface");
    python_json(rt, "canvas_mcp.core.plan_surface", &["--json"])
}

/// Shell `npm run open-canvas` for SSO login (onboarding "I signed in").
pub fn run_open_canvas(rt: &Runtime) -> Result<(), String> {
    tick_log("open-canvas");
    let cmd = rt.browser_script("open-canvas")?;
    run_status(cmd, "open-canvas")
}

/// Shell `npm run check-session` — headless probe of browser/.auth cookies.
/// Used by onboarding to skip the sign-in step when a session is already open.
pub fn run_check_canvas_session(rt: &Runtime) -> Result<bool, String> {
    tick_log("check-session");
    let mut cmd = rt.browser_script("check-canvas-session")?;
    let output = cmd
        .output()
        .map_err(|e| format!("failed to spawn check-session: {e}"))?;
    if !output.status.success() {
        return Err(format!("check-session exited with {}", output.status));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout
        .lines()
        .rev()
        .find(|l| l.trim_start().starts_with('{'))
        .ok_or_else(|| "check-session produced no JSON output".to_string())?;
    let parsed: Value =
        serde_json::from_str(line).map_err(|e| format!("bad check-session JSON: {e}"))?;
    Ok(parsed.get("loggedIn").and_then(Value::as_bool).unwrap_or(false))
}

/// Call Python skill router CLI; returns structured route result.
pub fn run_route_intent(rt: &Runtime, trigger: &str) -> Result<RouteResultDto, String> {
    tick_log("route-intent");
    let output = rt
        .python_module("canvas_mcp.core.skill_router", &["--json", trigger])
        .output()
    .map_err(|e| format!("failed to spawn skill_router: {e}"))?;
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if err.is_empty() {
            format!("skill_router exited {}", output.status)
        } else {
            err
        });
    }
    let value: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("skill_router JSON parse failed: {e}; raw={raw}"))?;
    Ok(RouteResultDto {
        skill_id: value
            .get("skill_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        method: value
            .get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("none")
            .to_string(),
        ambiguous: value
            .get("ambiguous")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        model_tier: value
            .get("model_tier")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        raw,
    })
}

fn python_json(rt: &Runtime, module: &str, args: &[&str]) -> Result<Value, String> {
    rt.usable()?;
    let output = rt
        .python_module(module, args)
        .output()
        .map_err(|e| format!("failed to spawn {module}: {e}"))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if err.is_empty() {
            format!("{module} exited {}", output.status)
        } else {
            err
        });
    }
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str(&raw).map_err(|e| format!("{module} JSON parse failed: {e}; raw={raw}"))
}

/// Due claims for the dock session. Empty `items` when nothing is scheduled.
pub fn run_due_reviews(rt: &Runtime) -> Result<Value, String> {
    tick_log("due-reviews");
    python_json(rt, "canvas_mcp.core.learn_loop", &["--json", "due"])
}

/// Brief-day streak. Does not increment — only a written brief does.
pub fn run_brief_streak(rt: &Runtime) -> Result<Value, String> {
    tick_log("brief-streak");
    python_json(rt, "canvas_mcp.core.habit", &["--json", "show"])
}

/// Per-course stability counts. Empty `courses` when no claims are stored.
pub fn run_learn_progress(rt: &Runtime) -> Result<Value, String> {
    tick_log("learn-progress");
    python_json(rt, "canvas_mcp.core.learn_loop", &["--json", "progress"])
}

const EVAL_NOTE: &str =
    "A single window is not causal. A longer brief count is exposure, not success.";

/// Diff the last two recorded snapshots. Never passes `--record`.
pub fn run_evaluation_compare(rt: &Runtime) -> Result<Value, String> {
    tick_log("evaluation-compare");
    let output = rt
        .python_module("canvas_mcp.core.learn_loop", &["evaluate", "--compare"])
        .output()
        .map_err(|e| format!("failed to spawn canvas_mcp.core.learn_loop: {e}"))?;
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if let Ok(value) = serde_json::from_str::<Value>(&raw) {
        if value.is_object() {
            return Ok(value);
        }
    }
    Ok(serde_json::json!({
        "ok": false,
        "reason": "compare unavailable",
        "note": EVAL_NOTE,
    }))
}

/// Current commitment. Does not create or resolve one.
pub fn run_read_commitment(rt: &Runtime) -> Result<Value, String> {
    tick_log("read-commitment");
    python_json(rt, "canvas_mcp.core.commitment", &["--json", "status"])
}

/// Store one student-authored commitment. Refuses if one is already open.
pub fn run_set_commitment(
    rt: &Runtime,
    text: &str,
    deadline: &str,
    course: &str,
    linked_item_id: &str,
) -> Result<Value, String> {
    tick_log("set-commitment");
    let mut owned = vec![
        "--json".to_string(),
        "add".into(),
        "--text".into(),
        text.to_string(),
        "--deadline".into(),
        deadline.to_string(),
    ];
    if !course.is_empty() {
        owned.push("--course".into());
        owned.push(course.to_string());
    }
    if !linked_item_id.is_empty() {
        owned.push("--linked-item-id".into());
        owned.push(linked_item_id.to_string());
    }
    let refs: Vec<&str> = owned.iter().map(|part| part.as_str()).collect();
    python_json(rt, "canvas_mcp.core.commitment", &refs)
}

/// Student-scored close. Does not infer the outcome from activity.
pub fn run_resolve_commitment(rt: &Runtime, status: &str) -> Result<Value, String> {
    tick_log("resolve-commitment");
    python_json(
        rt,
        "canvas_mcp.core.commitment",
        &["--json", "resolve", "--status", status],
    )
}

/// Record a retrieval score. `same_session` must stay false for a scheduled dock check.
pub fn run_record_review_outcome(
    rt: &Runtime,
    item_id: &str,
    outcome: &str,
    same_session: bool,
) -> Result<Value, String> {
    tick_log("review-outcome");
    let mut args = vec![
        "--json",
        "outcome",
        "--id",
        item_id,
        "--outcome",
        outcome,
    ];
    if same_session {
        args.push("--same-session");
    }
    python_json(rt, "canvas_mcp.core.learn_loop", &args)
}

/// Student's optional start line from the learning profile. Empty when unset.
pub fn run_read_check_intention(rt: &Runtime) -> Result<String, String> {
    tick_log("read-check-intention");
    let value = python_json(rt, "canvas_mcp.core.learning_profile", &["--json", "show"])?;
    Ok(value
        .get("if_then")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string())
}

/// Write the onboarding learning-profile games' answers via the Python CLI.
pub fn run_save_learning_profile(
    rt: &Runtime,
    practice_format: &str,
    autonomy: &str,
    chunk_size: &str,
    check_depth: &str,
    if_then: &str,
) -> Result<(), String> {
    tick_log("save-learning-profile");
    let output = rt
        .python_module(
        "canvas_mcp.core.learning_profile",
        &[
            "--json",
            "save",
            "--practice-format",
            practice_format,
            "--autonomy",
            autonomy,
            "--chunk-size",
            chunk_size,
            "--check-depth",
            check_depth,
            "--if-then",
            if_then,
        ],
    )
    .output()
    .map_err(|e| format!("failed to spawn learning_profile: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if err.is_empty() {
            format!("learning_profile exited {}", output.status)
        } else {
            err
        })
    }
}

/// Write the onboarding "Profile" step's identity/program answers via the
/// Python CLI (see canvas_mcp.core.user_profile). Ranked lists (interests,
/// career priorities, values) are passed as repeated `--flag value` pairs.
pub fn run_save_user_profile(
    rt: &Runtime,
    name: &str,
    institution: &str,
    school_slug: &str,
    major: &str,
    minor: &str,
    catalog_year: &str,
    target_grad_term: &str,
    interests: &[String],
    good_standing_gpa: &str,
    scholarship_min_gpa: &str,
    career_priorities: &[String],
    values: &[String],
    transfer_notes: &str,
) -> Result<(), String> {
    tick_log("save-user-profile");
    let mut args: Vec<&str> = vec![
        "--json",
        "save",
        "--name",
        name,
        "--institution",
        institution,
        "--school-slug",
        school_slug,
        "--major",
        major,
        "--minor",
        minor,
        "--catalog-year",
        catalog_year,
        "--target-grad-term",
        target_grad_term,
        "--good-standing-gpa",
        good_standing_gpa,
        "--scholarship-min-gpa",
        scholarship_min_gpa,
        "--transfer-notes",
        transfer_notes,
    ];
    for interest in interests {
        args.push("--interest");
        args.push(interest);
    }
    for priority in career_priorities {
        args.push("--career-priority");
        args.push(priority);
    }
    for value in values {
        args.push("--values");
        args.push(value);
    }
    let output = rt
        .python_module("canvas_mcp.core.user_profile", &args)
        .output()
        .map_err(|e| format!("failed to spawn user_profile: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if err.is_empty() {
            format!("user_profile exited {}", output.status)
        } else {
            err
        })
    }
}

/// Background cadence loop — logs ticks and optionally runs sync on each interval.
pub fn spawn_cadence_loop(rt: Arc<Runtime>) {
    thread::spawn(move || {
        loop {
            let weekend = is_weekend_now();
            let wait = next_sync_interval(weekend);
            thread::sleep(wait);
            tick_log(if weekend {
                "cadence-weekend"
            } else {
                "cadence-weekday"
            });
            if let Err(e) = run_canvas_sync(&rt) {
                eprintln!("[productname-daemon] sync error: {e}");
            }
        }
    });
}

/// Study command bridge: the request JSON goes over stdin (no shell quoting,
/// no argv length limit) and the reply is the CLI's single JSON envelope.
/// Answer keys never appear in argv or logs.
/// Keys the renderer may never send: the clock, the profile root, and local
/// file paths are decided natively (adopted from candidate B's bridge).
const FORBIDDEN_REQUEST_KEYS: [&str; 5] = ["now", "user_root", "root", "path", "zone"];
const MAX_REQUEST_BYTES: usize = 256 * 1024;
const MAX_REPLY_BYTES: usize = 4 * 1024 * 1024;

pub fn validate_study_request(request: &Value) -> Result<(), String> {
    let object = request.as_object().ok_or("study request must be an object")?;
    match object.get("cmd").and_then(Value::as_str) {
        Some(cmd) if !cmd.is_empty() && cmd.len() <= 64 && cmd.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') => {}
        _ => return Err("study request needs a short cmd".into()),
    }
    for key in object.keys() {
        if FORBIDDEN_REQUEST_KEYS.contains(&key.as_str()) {
            return Err(format!("study request may not set {key}"));
        }
        if key != "cmd" && key != "params" {
            return Err(format!("unexpected study request field {key}"));
        }
    }
    if let Some(params) = object.get("params") {
        let params = params.as_object().ok_or("params must be an object")?;
        for key in params.keys() {
            if FORBIDDEN_REQUEST_KEYS.contains(&key.as_str()) {
                return Err(format!("study params may not set {key}"));
            }
        }
    }
    if request.to_string().len() > MAX_REQUEST_BYTES {
        return Err("study request too large".into());
    }
    Ok(())
}

pub fn run_study(rt: &Runtime, request: &Value) -> Result<Value, String> {
    tick_log("study");
    rt.usable()?;
    validate_study_request(request)?;
    let mut child = rt
        .study_command(&["--json", "run"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to spawn study core: {e}"))?;
    {
        let stdin = child.stdin.as_mut().ok_or("study core stdin unavailable")?;
        stdin
            .write_all(request.to_string().as_bytes())
            .map_err(|e| format!("failed to send study request: {e}"))?;
    }
    let output = child
        .wait_with_output()
        .map_err(|e| format!("study core failed: {e}"))?;
    if output.stdout.len() > MAX_REPLY_BYTES {
        return Err("study core reply too large; narrow the request (history is paginated)".into());
    }
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let line = raw
        .lines()
        .rev()
        .find(|l| l.trim_start().starts_with('{'))
        .ok_or_else(|| {
            // stderr may carry a traceback with response text: log it locally,
            // never hand it to the webview.
            let err = String::from_utf8_lossy(&output.stderr);
            for l in err.lines().rev().take(3) {
                eprintln!("[productname-daemon] study core: {l}");
            }
            format!("study core produced no reply (exit {})", output.status)
        })?;
    serde_json::from_str(line).map_err(|e| format!("study core JSON parse failed: {e}"))
}

fn is_weekend_now() -> bool {
    use std::time::SystemTime;
    // Local weekday via chrono would be nicer; avoid extra dep — use UTC day-of-week
    // approximation sufficient for cadence scaffolding.
    let secs = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // 1970-01-01 was Thursday; days since epoch.
    let days = secs / 86_400;
    let weekday = ((days + 4) % 7) as u8; // 0=Sun .. 6=Sat
    weekday == 0 || weekday == 6
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Rust ↔ Python contract: a real study round trip on a throwaway profile.
    /// Skips (with a note) when the repo venv is absent, e.g. on CI without Python deps.
    #[test]
    fn study_roundtrip_via_python_core() {
        let tmp = std::env::temp_dir().join(format!("pn-study-rt-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        std::env::set_var("DEV_USER_ROOT", &tmp);
        let rt = crate::runtime::resolve(None);
        if !rt.python.is_file() || rt.mode != crate::runtime::RuntimeMode::Dev {
            eprintln!("skipping: no dev python at {}", rt.python.display());
            return;
        }
        let status = run_study(&rt, &serde_json::json!({"cmd": "status"})).expect("status");
        assert_eq!(status["ok"], true);
        assert_eq!(status["items"]["active"], 0);
        let offer = run_study(&rt, &serde_json::json!({"cmd": "offer", "params": {}})).expect("offer");
        assert_eq!(offer["kind"], "missing_source");
        let imported = run_study(&rt, &serde_json::json!({"cmd": "import-template", "params": {"packet_id": "Q"}}))
            .expect("import");
        assert_eq!(imported["ok"], true);
        let offer = run_study(&rt, &serde_json::json!({"cmd": "offer", "params": {}})).expect("offer");
        assert_eq!(offer["kind"], "offer");
        // The public item carries no key before submission.
        assert!(offer["item"].get("key").is_none());
        // Error envelope surfaces as Ok(json) with ok=false, never a panic.
        let bad = run_study(&rt, &serde_json::json!({"cmd": "start", "params": {"item_id": "nope"}})).expect("envelope");
        assert_eq!(bad["ok"], false);
        assert_eq!(bad["error"]["code"], "not_found");
        std::env::remove_var("DEV_USER_ROOT");
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn study_requests_cannot_move_the_clock_or_choose_paths() {
        assert!(validate_study_request(&serde_json::json!({"cmd": "status"})).is_ok());
        assert!(validate_study_request(&serde_json::json!({"cmd": "offer", "params": {"minutes": 5}})).is_ok());
        for bad in [
            serde_json::json!({"cmd": "status", "now": "2030-01-01T00:00:00Z"}),
            serde_json::json!({"cmd": "import", "params": {"path": "/etc/passwd"}}),
            serde_json::json!({"cmd": "status", "params": {"user_root": "/tmp/x"}}),
            serde_json::json!({"cmd": "../evil"}),
            serde_json::json!(["status"]),
        ] {
            assert!(validate_study_request(&bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn cadence_respects_floor() {
        assert!(next_sync_interval(false) >= SYNC_FLOOR);
        assert_eq!(next_sync_interval(false), SYNC_WEEKDAY);
        assert_eq!(next_sync_interval(true), SYNC_WEEKEND);
    }
}

#[cfg(test)]
mod round1_tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::Instant;

    /// The stubbed core (scripts/stub-core.sh) built for this checkout, or None.
    fn stub_core() -> Option<PathBuf> {
        let repo = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..");
        let script = repo.join("scripts").join("stub-core.sh");
        let out = Command::new("bash").arg(&script).output().ok()?;
        if !out.status.success() {
            return None;
        }
        let dir = PathBuf::from(String::from_utf8_lossy(&out.stdout).trim());
        dir.join("browser").join("scripts").join("sync-study-sources.mjs").is_file().then_some(dir)
    }

    fn runtime_with(core: &std::path::Path, root: &std::path::Path) -> Runtime {
        std::env::set_var("PRODUCTNAME_CORE_DIR", core);
        std::env::set_var("DEV_USER_ROOT", root);
        let python = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..").join(".venv").join("bin").join("python");
        if python.is_file() {
            std::env::set_var("PRODUCTNAME_PYTHON", &python);
        }
        for node in ["/opt/homebrew/bin/node", "/usr/local/bin/node"] {
            if std::path::Path::new(node).is_file() {
                std::env::set_var("PRODUCTNAME_NODE", node);
                break;
            }
        }
        let rt = crate::runtime::resolve(None);
        for key in ["PRODUCTNAME_CORE_DIR", "DEV_USER_ROOT", "PRODUCTNAME_PYTHON", "PRODUCTNAME_NODE"] {
            std::env::remove_var(key);
        }
        rt
    }

    /// Daemon-side end-to-end: stub session → streamed source sync → profile
    /// on disk → read_semester → canvas-import → study status knows the
    /// course. Everything the onboarding Screen 3 + Home depend on, minus the
    /// webview. Skips when node or the stub core is unavailable.
    #[test]
    fn stubbed_sync_streams_events_and_feeds_home() {
        let Some(core) = stub_core() else {
            eprintln!("skipping: stub core unavailable");
            return;
        };
        let root = std::env::temp_dir().join(format!("pn-e2e-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let rt = runtime_with(&core, &root);
        if rt.node.is_none() || !rt.python.is_file() {
            eprintln!("skipping: no node/python");
            return;
        }
        assert!(!run_check_canvas_session(&rt).unwrap(), "fresh profile has no session");
        std::env::set_var("STUB_SSO_DELAY_MS", "10");
        run_open_canvas(&rt).unwrap();
        assert!(run_check_canvas_session(&rt).unwrap(), "stub SSO leaves a session");
        std::env::set_var("STUB_COURSE_DELAY_MS", "5");
        let mut events: Vec<Value> = Vec::new();
        run_sync_study_sources_streaming(&rt, |e| events.push(e)).unwrap();
        let kinds: Vec<&str> = events.iter().filter_map(|e| e["event"].as_str()).collect();
        assert_eq!(kinds, ["courses", "course", "course", "course", "course", "done"]);
        assert_eq!(events[0]["courses"].as_array().unwrap().len(), 4);
        assert_eq!(events[1]["course"]["counts"]["exams"], 3);
        let sem = crate::semester::read_semester(&root, "semester", Some("2026-09-18"));
        assert_eq!(sem.courses.len(), 4);
        assert_eq!(sem.status["state"], "ok");
        // What the command does after the stream: each synced course WITH
        // sources becomes a Study packet (PHYS 1110 has none and is skipped).
        let with_sources: Vec<String> = events
            .iter()
            .filter(|e| e["event"] == "course" && e["course"]["sources"].as_u64().unwrap_or(0) > 0)
            .map(|e| e["course"]["id"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(with_sources.len(), 3);
        for id in &with_sources {
            let req = serde_json::json!({"cmd": "canvas-import", "params": {"course_id": id, "source_ids": Value::Null}});
            let reply = run_study(&rt, &req).unwrap();
            assert_eq!(reply["ok"], true, "{reply}");
        }
        let status = run_study(&rt, &serde_json::json!({"cmd": "status"})).unwrap();
        let courses = status["courses"].as_array().unwrap();
        assert!(courses.iter().any(|c| c.as_str() == Some("CSCI 2270 — Data Structures")), "{status}");
        let _ = std::fs::remove_dir_all(&root);
    }

    /// Before/after for the Calendar (Plan) tab load on a fresh profile:
    /// six Python processes (old) vs one (read_plan_surface). Prints the
    /// numbers; asserts only that the batched read is not slower.
    #[test]
    fn plan_surface_is_one_process_not_six() {
        let root = std::env::temp_dir().join(format!("pn-perf-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::env::set_var("DEV_USER_ROOT", &root);
        let rt = crate::runtime::resolve(None);
        std::env::remove_var("DEV_USER_ROOT");
        if !rt.python.is_file() || rt.mode != crate::runtime::RuntimeMode::Dev {
            eprintln!("skipping: no dev python");
            return;
        }
        let _ = run_plan_surface(&rt); // warm caches
        let t0 = Instant::now();
        let _ = run_due_reviews(&rt);
        let _ = run_read_check_intention(&rt);
        let _ = run_brief_streak(&rt);
        let _ = run_learn_progress(&rt);
        let _ = run_evaluation_compare(&rt);
        let _ = run_read_commitment(&rt);
        let six = t0.elapsed();
        let t1 = Instant::now();
        let surface = run_plan_surface(&rt).unwrap();
        let one = t1.elapsed();
        eprintln!("[perf] plan tab reads on a fresh profile: six processes = {six:?}, read_plan_surface = {one:?}");
        assert_eq!(surface["ok"], true);
        assert!(surface["errors"].as_array().unwrap().is_empty(), "{surface}");
        assert!(one <= six, "batched read must not be slower: {one:?} vs {six:?}");
        let _ = std::fs::remove_dir_all(&root);
    }
}
