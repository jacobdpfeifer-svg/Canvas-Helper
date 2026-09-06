//! ProductName local daemon — sync cadence, sensors, self-improve cron, ledger.
//!
//! Canvas sync: every 2h on term weekdays, 6h weekends, plus event-driven when
//! the Chrome extension reports Canvas tab focus. Never sub-5-minute polling.
//!
//! Autostart: enable via tauri-plugin-autostart so the daemon runs on login.

use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::thread;
use std::time::Duration;

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

/// Shell `npm run sync` in browser/ with DEV_USER_ROOT / SCHOOL_SLUG when set.
pub fn run_canvas_sync() -> Result<(), String> {
    tick_log("sync");
    let browser = browser_dir();
    if !browser.is_dir() {
        return Err(format!("browser dir missing: {}", browser.display()));
    }
    let mut cmd = Command::new("npm");
    cmd.arg("run").arg("sync").current_dir(&browser);
    if let Ok(root) = env::var("DEV_USER_ROOT") {
        cmd.env("DEV_USER_ROOT", root);
    }
    if let Ok(slug) = env::var("SCHOOL_SLUG") {
        cmd.env("SCHOOL_SLUG", slug);
    }
    let status = cmd
        .status()
        .map_err(|e| format!("failed to spawn npm run sync: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("npm run sync exited with {status}"))
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
