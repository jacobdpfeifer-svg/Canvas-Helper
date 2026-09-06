// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod daemon;

fn main() {
    // Autostart plugin is registered in a full `tauri::Builder` setup.
    // Cadence constants live in daemon.rs (2h weekday / 6h weekend / focus).
    daemon::tick_log("boot");
    println!(
        "ProductName daemon scaffold. Weekday sync {:?}, weekend {:?}",
        daemon::SYNC_WEEKDAY,
        daemon::SYNC_WEEKEND
    );
}
