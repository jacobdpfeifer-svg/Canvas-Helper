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
    // Cloud key is optional. A blank key stores nothing — there is no local-model path.
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
    if_then: Option<String>,
) -> Result<(), String> {
    daemon::run_save_learning_profile(
        &practice_format,
        &autonomy,
        &chunk_size,
        &check_depth,
        if_then.as_deref().unwrap_or(""),
    )
}

/// Due retrieval checks (at most two). Does not invent cards from the week list.
#[tauri::command]
pub fn read_due_reviews() -> Result<serde_json::Value, String> {
    daemon::run_due_reviews()
}

/// Brief-day streak line. Empty `line` when there is nothing to show.
#[tauri::command]
pub fn read_brief_streak() -> Result<serde_json::Value, String> {
    daemon::run_brief_streak()
}

/// Per-course retention counts from stored claims. Not a skill tree.
#[tauri::command]
pub fn read_learn_progress() -> Result<serde_json::Value, String> {
    daemon::run_learn_progress()
}

/// Last two evaluation snapshots. Does not record one.
#[tauri::command]
pub fn read_evaluation_compare() -> Result<serde_json::Value, String> {
    daemon::run_evaluation_compare()
}

/// Open commitment and one-time check-in. Does not create or resolve.
#[tauri::command]
pub fn read_commitment() -> Result<serde_json::Value, String> {
    daemon::run_read_commitment()
}

/// Store one student-authored commitment. Refuses if one is already open.
#[tauri::command]
pub fn set_commitment(
    text: String,
    deadline: String,
    course: Option<String>,
    linked_item_id: Option<String>,
) -> Result<serde_json::Value, String> {
    daemon::run_set_commitment(
        &text,
        &deadline,
        course.as_deref().unwrap_or(""),
        linked_item_id.as_deref().unwrap_or(""),
    )
}

/// Student-scored close: met, not_met, or dropped.
#[tauri::command]
pub fn resolve_commitment(status: String) -> Result<serde_json::Value, String> {
    daemon::run_resolve_commitment(&status)
}

/// Student-scored retrieval. Dock checks of scheduled items pass same_session=false.
#[tauri::command]
pub fn record_review_outcome(
    item_id: String,
    outcome: String,
    same_session: Option<bool>,
) -> Result<serde_json::Value, String> {
    daemon::run_record_review_outcome(&item_id, &outcome, same_session.unwrap_or(false))
}

/// Optional implementation intention written at onboarding. Empty if skipped.
#[tauri::command]
pub fn read_check_intention() -> Result<String, String> {
    daemon::run_read_check_intention()
}

/// Route a natural-language trigger via the Python skill router CLI.
#[tauri::command]
pub fn route_intent(trigger: String) -> Result<daemon::RouteResultDto, String> {
    daemon::run_route_intent(&trigger)
}
