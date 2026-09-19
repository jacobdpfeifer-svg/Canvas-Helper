//! Tauri commands bridging the React shell to daemon sync + inbox + onboarding.

use crate::daemon;
use crate::inbox;
use crate::runtime::{self, Runtime};
use serde::Serialize;
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter, State};

type Rt<'a> = State<'a, Arc<Runtime>>;

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
pub fn sync_canvas(app: AppHandle, rt: Rt<'_>) -> Result<SyncResult, String> {
    // Run off the main thread so the webview stays responsive; still block
    // this command until done so invoke() callers get a real result.
    let handle = app.clone();
    let rt = Arc::clone(&rt);
    let result = thread::spawn(move || daemon::run_canvas_sync(&rt))
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
pub fn read_top3(rt: Rt<'_>) -> Result<Vec<inbox::Top3Item>, String> {
    inbox::read_top3(&rt.user_root, 3)
}

#[tauri::command]
pub fn open_canvas_sso(rt: Rt<'_>) -> Result<(), String> {
    daemon::run_open_canvas(&rt)
}

/// Headless probe: is there already a valid Canvas session in browser/.auth?
/// Onboarding calls this before showing the sign-in step.
#[tauri::command]
pub fn check_canvas_session(rt: Rt<'_>) -> Result<bool, String> {
    daemon::run_check_canvas_session(&rt)
}

/// Fire-and-forget deep first-sync, launched the moment onboarding confirms
/// a Canvas session (silent cookie hit or fresh SSO login) — runs in the
/// background while the student finishes the rest of the wizard, so the
/// dock already has a full-term picture by the time they land on it.
/// Does not block the caller and swallows its own errors: the daily
/// `sync_canvas` cadence will retry on the normal schedule regardless.
#[tauri::command]
pub fn bootstrap_canvas_sync(app: AppHandle, rt: Rt<'_>) -> Result<(), String> {
    let rt = Arc::clone(&rt);
    thread::spawn(move || {
        if daemon::run_bootstrap_sync(&rt).is_ok() {
            emit_inbox_updated(&app);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn save_onboarding(
    rt: Rt<'_>,
    school_slug: String,
    cloud_key: String,
    priorities: Option<String>,
    sentry_opt_in: Option<bool>,
    waitlist_email: Option<String>,
) -> Result<(), String> {
    if school_slug.trim().is_empty() {
        return Err("school slug is required".into());
    }
    let slug = school_slug.trim();
    if slug == "waitlist" {
        let email = waitlist_email.as_deref().unwrap_or("").trim();
        if email.is_empty() {
            return Err("waitlist email is required when your school is not listed".into());
        }
        inbox::save_waitlist_email(&rt.user_root, email)?;
        inbox::save_school_slug(&rt.user_root, "waitlist")?;
        if let Some(opt_in) = sentry_opt_in {
            inbox::save_sentry_opt_in(&rt.user_root, opt_in)?;
        }
        return Ok(());
    }
    inbox::save_school_slug(&rt.user_root, slug)?;
    // Cloud key is optional. A blank key stores nothing — there is no local-model path.
    if !cloud_key.trim().is_empty() {
        inbox::save_cloud_key(&rt.user_root, &cloud_key)?;
    }
    if let Some(text) = priorities.as_deref() {
        if !text.trim().is_empty() {
            inbox::save_priorities(&rt.user_root, text)?;
        }
    }
    if let Some(opt_in) = sentry_opt_in {
        inbox::save_sentry_opt_in(&rt.user_root, opt_in)?;
    }
    // Honor school for subsequent sync shells in this process.
    std::env::set_var("SCHOOL_SLUG", slug);
    Ok(())
}

/// Save the onboarding learning-profile games' answers (see docs/design/learning-profile.md).
#[tauri::command]
pub fn save_learning_profile(
    rt: Rt<'_>,
    practice_format: String,
    autonomy: String,
    chunk_size: String,
    check_depth: String,
    if_then: Option<String>,
) -> Result<(), String> {
    daemon::run_save_learning_profile(
        &rt,
        &practice_format,
        &autonomy,
        &chunk_size,
        &check_depth,
        if_then.as_deref().unwrap_or(""),
    )
}

/// Save the onboarding "Profile" step's identity/program answers into
/// USER.md (see canvas_mcp.core.user_profile). Every field is optional —
/// blank fields keep the templates/USER.md placeholder text.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn save_user_profile(
    rt: Rt<'_>,
    name: String,
    institution: String,
    school_slug: String,
    major: String,
    minor: String,
    catalog_year: String,
    target_grad_term: String,
    interests: Vec<String>,
    good_standing_gpa: String,
    scholarship_min_gpa: String,
    career_priorities: Vec<String>,
    values: Vec<String>,
    transfer_notes: String,
) -> Result<(), String> {
    daemon::run_save_user_profile(
        &rt,
        &name,
        &institution,
        &school_slug,
        &major,
        &minor,
        &catalog_year,
        &target_grad_term,
        &interests,
        &good_standing_gpa,
        &scholarship_min_gpa,
        &career_priorities,
        &values,
        &transfer_notes,
    )
}

/// Due retrieval checks (at most two). Does not invent cards from the week list.
#[tauri::command]
pub fn read_due_reviews(rt: Rt<'_>) -> Result<serde_json::Value, String> {
    daemon::run_due_reviews(&rt)
}

/// Brief-day streak line. Empty `line` when there is nothing to show.
#[tauri::command]
pub fn read_brief_streak(rt: Rt<'_>) -> Result<serde_json::Value, String> {
    daemon::run_brief_streak(&rt)
}

/// Per-course retention counts from stored claims. Not a skill tree.
#[tauri::command]
pub fn read_learn_progress(rt: Rt<'_>) -> Result<serde_json::Value, String> {
    daemon::run_learn_progress(&rt)
}

/// Last two evaluation snapshots. Does not record one.
#[tauri::command]
pub fn read_evaluation_compare(rt: Rt<'_>) -> Result<serde_json::Value, String> {
    daemon::run_evaluation_compare(&rt)
}

/// Open commitment and one-time check-in. Does not create or resolve.
#[tauri::command]
pub fn read_commitment(rt: Rt<'_>) -> Result<serde_json::Value, String> {
    daemon::run_read_commitment(&rt)
}

/// Store one student-authored commitment. Refuses if one is already open.
#[tauri::command]
pub fn set_commitment(
    rt: Rt<'_>,
    text: String,
    deadline: String,
    course: Option<String>,
    linked_item_id: Option<String>,
) -> Result<serde_json::Value, String> {
    daemon::run_set_commitment(
        &rt,
        &text,
        &deadline,
        course.as_deref().unwrap_or(""),
        linked_item_id.as_deref().unwrap_or(""),
    )
}

/// Student-scored close: met, not_met, or dropped.
#[tauri::command]
pub fn resolve_commitment(rt: Rt<'_>, status: String) -> Result<serde_json::Value, String> {
    daemon::run_resolve_commitment(&rt, &status)
}

/// Student-scored retrieval. Dock checks of scheduled items pass same_session=false.
#[tauri::command]
pub fn record_review_outcome(
    rt: Rt<'_>,
    item_id: String,
    outcome: String,
    same_session: Option<bool>,
) -> Result<serde_json::Value, String> {
    daemon::run_record_review_outcome(&rt, &item_id, &outcome, same_session.unwrap_or(false))
}

/// Optional implementation intention written at onboarding. Empty if skipped.
#[tauri::command]
pub fn read_check_intention(rt: Rt<'_>) -> Result<String, String> {
    daemon::run_read_check_intention(&rt)
}

/// Route a natural-language trigger via the Python skill router CLI.
#[tauri::command]
pub fn route_intent(rt: Rt<'_>, trigger: String) -> Result<daemon::RouteResultDto, String> {
    daemon::run_route_intent(&rt, &trigger)
}

/// Study workspace bridge. `request` = {"cmd": .., "params": {..}}; the reply is
/// the Python study CLI's envelope ({"ok": true, ..} or {"ok": false, "error": ..}).
#[tauri::command]
pub fn study(rt: Rt<'_>, request: serde_json::Value) -> Result<serde_json::Value, String> {
    daemon::validate_study_request(&request)?;
    daemon::run_study(&rt, &request)
}

/// Sync Canvas study sources (blocking; the UI shows progress copy meanwhile).
#[tauri::command]
pub fn sync_study_sources(rt: Rt<'_>) -> Result<SyncResult, String> {
    let rt = Arc::clone(&rt);
    let result = thread::spawn(move || daemon::run_sync_study_sources(&rt))
        .join()
        .map_err(|_| "sync thread panicked".to_string())?;
    Ok(match result {
        Ok(()) => SyncResult { ok: true, error: None },
        Err(e) => SyncResult { ok: false, error: Some(e) },
    })
}

/// Runtime summary for Settings / first-run diagnostics (no secrets).
#[tauri::command]
pub fn runtime_info(rt: Rt<'_>) -> serde_json::Value {
    rt.summary()
}

/// Switch the active profile. Takes effect on the next launch: every child
/// process of THIS run already carries the boot-time identity.
#[tauri::command]
pub fn set_profile(app: AppHandle, profile_id: String) -> Result<serde_json::Value, String> {
    runtime::set_current_profile(&profile_id)?;
    let _ = app.emit("profile-changed", profile_id.clone());
    Ok(serde_json::json!({"ok": true, "profile_id": profile_id, "restart_required": true}))
}

/// List profiles that exist under the app-support root (directory names only).
#[tauri::command]
pub fn list_profiles(rt: Rt<'_>) -> serde_json::Value {
    let root = runtime::app_support_root();
    let mut ids: Vec<String> = std::fs::read_dir(&root)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .filter_map(|e| e.file_name().into_string().ok())
                .filter(|name| runtime::valid_profile_id(name))
                .collect()
        })
        .unwrap_or_default();
    ids.sort();
    serde_json::json!({"current": rt.profile_id, "profiles": ids, "root": root.display().to_string()})
}
