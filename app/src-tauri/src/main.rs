// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod calendar;
mod canvas;
mod commands;
mod daemon;
mod dock;
mod inbox;
mod runtime;
mod semester;

use std::sync::Arc;

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
            commands::save_user_profile,
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
            commands::study,
            commands::sync_study_sources,
            commands::read_semester,
            commands::read_sync_progress,
            commands::read_calendar_surface,
            commands::read_sync_health,
            commands::read_work_surface,
            commands::read_course_map,
            commands::read_grade_truth,
            commands::add_calendar_event,
            commands::dismiss_calendar_suggestion,
            commands::open_external_url,
            commands::runtime_info,
            commands::set_profile,
            commands::list_profiles,
        ])
        .setup(|app| {
            // Resolve bundled resources vs dev checkout once; share with every command.
            let resource_dir = app.path().resource_dir().ok();
            let rt = Arc::new(runtime::resolve(resource_dir.as_deref()));
            for note in &rt.diagnostics {
                eprintln!("[productname-daemon] runtime: {note}");
            }
            eprintln!(
                "[productname-daemon] runtime {:?} profile={} root={}",
                rt.mode,
                rt.profile_id,
                rt.user_root.display()
            );
            app.manage(Arc::clone(&rt));

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
                        let rt: tauri::State<'_, Arc<runtime::Runtime>> = app.state();
                        match daemon::run_canvas_sync(&rt) {
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

            // The main window is the study workspace (normal, resizable). The
            // compact dock geometry is opt-in from the frontend (set_dock_mode).
            daemon::spawn_cadence_loop(Arc::clone(&rt));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ProductName");
}
