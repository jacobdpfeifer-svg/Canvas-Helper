//! ProductName local daemon — sync cadence, sensors, self-improve cron, ledger.
//!
//! Canvas sync: every 2h on term weekdays, 6h weekends, plus event-driven when
//! the Chrome extension reports Canvas tab focus. Never sub-5-minute polling.
//!
//! Autostart: enable via tauri-plugin-autostart so the daemon runs on login.

use std::time::Duration;

/// Weekday sync interval during term.
pub const SYNC_WEEKDAY: Duration = Duration::from_secs(2 * 60 * 60);
/// Weekend sync interval.
pub const SYNC_WEEKEND: Duration = Duration::from_secs(6 * 60 * 60);
/// Absolute floor — never poll Canvas more often than this.
pub const SYNC_FLOOR: Duration = Duration::from_secs(5 * 60);

pub struct DaemonConfig {
    pub user_id: String,
    pub school_slug: String,
    pub sentry_opt_in: bool,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            user_id: "dev".into(),
            school_slug: "cu-boulder".into(),
            sentry_opt_in: false,
        }
    }
}

pub fn next_sync_interval(is_weekend: bool) -> Duration {
    let candidate = if is_weekend { SYNC_WEEKEND } else { SYNC_WEEKDAY };
    if candidate < SYNC_FLOOR {
        SYNC_FLOOR
    } else {
        candidate
    }
}

/// Placeholder entry — full Tauri `main.rs` wires menubar + this loop.
pub fn tick_log(reason: &str) {
    eprintln!("[productname-daemon] tick: {reason}");
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
