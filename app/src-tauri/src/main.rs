// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod daemon;
mod dock;
mod inbox;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_autostart::MacosLauncher;

fn main() {
    daemon::tick_log("boot");

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            dock::set_dock_mode,
            dock::show_dock,
            dock::hide_dock,
            commands::sync_canvas,
            commands::read_top3,
            commands::open_canvas_sso,
            commands::check_canvas_session,
            commands::bootstrap_canvas_sync,
            commands::save_onboarding,
            commands::save_learning_profile,
            commands::read_due_reviews,
            commands::read_brief_streak,
            commands::read_learn_progress,
            commands::read_evaluation_compare,
            commands::record_review_outcome,
            commands::read_commitment,
            commands::set_commitment,
            commands::resolve_commitment,
            commands::read_check_intention,
            commands::route_intent,
        ])
        .setup(|app| {
            let sync_now = MenuItem::with_id(app, "sync_now", "Sync now", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&sync_now, &quit])?;

            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("ProductName (private beta)")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "sync_now" => {
                        // Same helper the sync_canvas command uses — not a separate path.
                        match daemon::run_canvas_sync() {
                            Ok(()) => {
                                let _ = app.emit("inbox-updated", ());
                            }
                            Err(e) => {
                                eprintln!("[productname-daemon] Sync now failed: {e}");
                                let _ = app.emit("sync-failed", e.to_string());
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Err(e) = dock::toggle(app) {
                            eprintln!("[productname-daemon] dock toggle failed: {e}");
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }

            let _tray = tray.build(app)?;

            if let Some(window) = app.get_webview_window(dock::MAIN_WINDOW) {
                dock::apply_glass(&window);
                let mode = if onboarding_pending() {
                    dock::DockMode::Onboarding
                } else {
                    dock::DockMode::Peek
                };
                if let Err(e) = dock::place(&window, mode) {
                    eprintln!("[productname-daemon] initial dock placement failed: {e}");
                }
            }

            daemon::spawn_cadence_loop();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ProductName");
}

/// Onboarding state lives in the webview's localStorage, which Rust can't
/// read at boot — so the window opens at onboarding size on every fresh
/// profile and the frontend switches it to peek geometry once mounted and
/// onboarded is confirmed true (see `app/src/ipc.ts` `setDockMode`).
fn onboarding_pending() -> bool {
    true
}
