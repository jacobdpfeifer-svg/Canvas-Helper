//! Tauri commands bridging the React shell to daemon sync + inbox + onboarding.

use crate::daemon;
use crate::inbox;
use serde::Serialize;
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub ok: bool,
    pub error: Option<String>,
}

fn emit_inbox_updated(app: &AppHandle) {
    let _ = app.emit("inbox-updated", ());
}

/// Run Canvas sync (same helper as the tray menu) and notify the UI.
#[tauri::command]
pub fn sync_canvas(app: AppHandle) -> Result<SyncResult, String> {
    // Run off the main thread so the webview stays responsive; still block
    // this command until done so invoke() callers get a real result.
    let handle = app.clone();
    let result = thread::spawn(move || daemon::run_canvas_sync())
        .join()
        .map_err(|_| "sync thread panicked".to_string())?;
    match result {
        Ok(()) => {
            emit_inbox_updated(&handle);
            Ok(SyncResult {
                ok: true,
                error: None,
            })
        }
        Err(e) => Ok(SyncResult {
            ok: false,
            error: Some(e),
        }),
    }
}

#[tauri::command]
pub fn read_top3() -> Result<Vec<inbox::Top3Item>, String> {
    inbox::read_top3(3)
}

#[tauri::command]
pub fn open_canvas_sso() -> Result<(), String> {
    daemon::run_open_canvas()
}

#[tauri::command]
pub fn save_onboarding(school_slug: String, cloud_key: String) -> Result<(), String> {
    if school_slug.trim().is_empty() {
        return Err("school slug is required".into());
    }
    inbox::save_school_slug(&school_slug)?;
    // Cloud key is optional — a blank key means no key is stored.
    if !cloud_key.trim().is_empty() {
        inbox::save_cloud_key(&cloud_key)?;
    }
    // Honor school for subsequent sync shells in this process.
    std::env::set_var("SCHOOL_SLUG", school_slug.trim());
    Ok(())
}

/// Save the onboarding learning-profile games' answers (see docs/design/learning-profile.md).
#[tauri::command]
pub fn save_learning_profile(
    practice_format: String,
    autonomy: String,
    chunk_size: String,
    check_depth: String,
) -> Result<(), String> {
    daemon::run_save_learning_profile(
        &practice_format,
        &autonomy,
        &chunk_size,
        &check_depth,
    )
}

/// Route a natural-language trigger via the Python skill router CLI.
#[tauri::command]
pub fn route_intent(trigger: String) -> Result<daemon::RouteResultDto, String> {
    daemon::run_route_intent(&trigger)
}
