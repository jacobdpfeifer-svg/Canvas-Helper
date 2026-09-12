//! ProductName local daemon — sync cadence, sensors, ledger.
//!
//! Canvas sync: every 2h on term weekdays, 6h weekends, plus event-driven when
//! the Chrome extension reports Canvas tab focus. Never sub-5-minute polling.
//!
//! Autostart: enable via tauri-plugin-autostart so the daemon runs on login.

use serde::Serialize;
use serde_json::Value;
use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::thread;
use std::time::Duration;

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

/// Resolve `browser/` relative to the repo (CARGO_MANIFEST_DIR = app/src-tauri).
pub fn browser_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("browser")
}

/// Resolve repo root (parent of `browser/` / `app/`).
pub fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
}

fn forward_user_env(cmd: &mut Command) {
    if let Ok(root) = env::var("DEV_USER_ROOT") {
        cmd.env("DEV_USER_ROOT", root);
    }
    if let Ok(slug) = env::var("SCHOOL_SLUG") {
        cmd.env("SCHOOL_SLUG", slug);
    }
}

/// Spawn ``python3 -m <module> …`` with repo ``PYTHONPATH`` + user env.
fn python_module(module: &str, args: &[&str]) -> Command {
    let root = repo_root();
    let mut cmd = Command::new("python3");
    let mut full = vec!["-m", module];
    full.extend_from_slice(args);
    cmd.args(&full).current_dir(&root);
    let src = root.join("src");
    if src.is_dir() {
        let existing = env::var("PYTHONPATH").unwrap_or_default();
        let joined = if existing.is_empty() {
            src.display().to_string()
        } else {
            format!("{}:{}", src.display(), existing)
        };
        cmd.env("PYTHONPATH", joined);
    }
    forward_user_env(&mut cmd);
    cmd
}

/// Shell `npm run sync` in browser/ with DEV_USER_ROOT / SCHOOL_SLUG when set.
pub fn run_canvas_sync() -> Result<(), String> {
    tick_log("sync");
    let browser = browser_dir();
    if !browser.is_dir() {
        return Err(format!("browser dir missing: {}", browser.display()));
    }
    let mut cmd = Command::new("npm");
    cmd.arg("run").arg("sync").current_dir(&browser);
    forward_user_env(&mut cmd);
    let status = cmd
        .status()
        .map_err(|e| format!("failed to spawn npm run sync: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("npm run sync exited with {status}"))
    }
}

/// First-run deep crawl: same `npm run sync`, but widened to the whole term
/// (`DAYS`/`CATALOG_DAYS`≈150) instead of the daily 14-day window, so course
/// catalogs are populated before the student ever asks. Fired once, right
/// after onboarding confirms a Canvas session — never on the daily cadence.
pub fn run_bootstrap_sync() -> Result<(), String> {
    tick_log("bootstrap-sync");
    let browser = browser_dir();
    if !browser.is_dir() {
        return Err(format!("browser dir missing: {}", browser.display()));
    }
    let mut cmd = Command::new("npm");
    cmd.arg("run").arg("sync").current_dir(&browser);
    cmd.env("DAYS", "150").env("CATALOG_DAYS", "150");
    forward_user_env(&mut cmd);
    let status = cmd
        .status()
        .map_err(|e| format!("failed to spawn npm run sync (bootstrap): {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("npm run sync (bootstrap) exited with {status}"))
    }
}

/// Shell `npm run open-canvas` for SSO login (onboarding "I signed in").
pub fn run_open_canvas() -> Result<(), String> {
    tick_log("open-canvas");
    let browser = browser_dir();
    if !browser.is_dir() {
        return Err(format!("browser dir missing: {}", browser.display()));
    }
    let mut cmd = Command::new("npm");
    cmd.arg("run").arg("open-canvas").current_dir(&browser);
    forward_user_env(&mut cmd);
    let status = cmd
        .status()
        .map_err(|e| format!("failed to spawn npm run open-canvas: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("npm run open-canvas exited with {status}"))
    }
}

/// Shell `npm run check-session` — headless probe of browser/.auth cookies.
/// Used by onboarding to skip the sign-in step when a session is already open.
pub fn run_check_canvas_session() -> Result<bool, String> {
    tick_log("check-session");
    let browser = browser_dir();
    if !browser.is_dir() {
        return Err(format!("browser dir missing: {}", browser.display()));
    }
    let mut cmd = Command::new("npm");
    cmd.arg("run").arg("check-session").current_dir(&browser);
    forward_user_env(&mut cmd);
    let output = cmd
        .output()
        .map_err(|e| format!("failed to spawn npm run check-session: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "npm run check-session exited with {}",
            output.status
        ));
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
pub fn run_route_intent(trigger: &str) -> Result<RouteResultDto, String> {
    tick_log("route-intent");
    let output = python_module(
        "canvas_mcp.core.skill_router",
        &["--json", trigger],
    )
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

fn python_json(module: &str, args: &[&str]) -> Result<Value, String> {
    let output = python_module(module, args)
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
pub fn run_due_reviews() -> Result<Value, String> {
    tick_log("due-reviews");
    python_json("canvas_mcp.core.learn_loop", &["--json", "due"])
}

/// Brief-day streak. Does not increment — only a written brief does.
pub fn run_brief_streak() -> Result<Value, String> {
    tick_log("brief-streak");
    python_json("canvas_mcp.core.habit", &["--json", "show"])
}

/// Per-course stability counts. Empty `courses` when no claims are stored.
pub fn run_learn_progress() -> Result<Value, String> {
    tick_log("learn-progress");
    python_json("canvas_mcp.core.learn_loop", &["--json", "progress"])
}

const EVAL_NOTE: &str =
    "A single window is not causal. A longer brief count is exposure, not success.";

/// Diff the last two recorded snapshots. Never passes `--record`.
pub fn run_evaluation_compare() -> Result<Value, String> {
    tick_log("evaluation-compare");
    let output = python_module("canvas_mcp.core.learn_loop", &["evaluate", "--compare"])
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
pub fn run_read_commitment() -> Result<Value, String> {
    tick_log("read-commitment");
    python_json("canvas_mcp.core.commitment", &["--json", "status"])
}

/// Store one student-authored commitment. Refuses if one is already open.
pub fn run_set_commitment(
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
    python_json("canvas_mcp.core.commitment", &refs)
}

/// Student-scored close. Does not infer the outcome from activity.
pub fn run_resolve_commitment(status: &str) -> Result<Value, String> {
    tick_log("resolve-commitment");
    python_json(
        "canvas_mcp.core.commitment",
        &["--json", "resolve", "--status", status],
    )
}

/// Record a retrieval score. `same_session` must stay false for a scheduled dock check.
pub fn run_record_review_outcome(
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
    python_json("canvas_mcp.core.learn_loop", &args)
}

/// Student's optional start line from the learning profile. Empty when unset.
pub fn run_read_check_intention() -> Result<String, String> {
    tick_log("read-check-intention");
    let value = python_json("canvas_mcp.core.learning_profile", &["--json", "show"])?;
    Ok(value
        .get("if_then")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string())
}

/// Write the onboarding learning-profile games' answers via the Python CLI.
pub fn run_save_learning_profile(
    practice_format: &str,
    autonomy: &str,
    chunk_size: &str,
    check_depth: &str,
    if_then: &str,
) -> Result<(), String> {
    tick_log("save-learning-profile");
    let output = python_module(
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

/// Background cadence loop — logs ticks and optionally runs sync on each interval.
pub fn spawn_cadence_loop() {
    thread::spawn(|| {
        loop {
            let weekend = is_weekend_now();
            let wait = next_sync_interval(weekend);
            thread::sleep(wait);
            tick_log(if weekend {
                "cadence-weekend"
            } else {
                "cadence-weekday"
            });
            if let Err(e) = run_canvas_sync() {
                eprintln!("[productname-daemon] sync error: {e}");
            }
        }
    });
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

    #[test]
    fn cadence_respects_floor() {
        assert!(next_sync_interval(false) >= SYNC_FLOOR);
        assert_eq!(next_sync_interval(false), SYNC_WEEKDAY);
        assert_eq!(next_sync_interval(true), SYNC_WEEKEND);
    }
}
