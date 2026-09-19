//! Local calendar (Calendar tab): append-only JSONL under `{user_root}/inbox/`.
//!
//! `calendar.jsonl` — student-added events. Row schema (all strings ISO-8601
//! UTC unless noted):
//!   {id, kind: "study"|"class"|"exam"|"personal", title, course_id?, color_index?,
//!    start, end, note, created_at, source: "local"|"suggestion:<message_id>",
//!    deleted?: true}
//! A delete appends a tombstone `{id, deleted: true, created_at}`; readers fold.
//!
//! `calendar-suggestions.jsonl` — CONTRACT ONLY this round, written by the
//! Gmail triage path (producer pending): `{source_message_id, title, start,
//! end, confidence, why}`. The app never auto-adds; each row gets Add /
//! Dismiss, recorded in `calendar-suggestion-decisions.jsonl` as
//! `{source_message_id, decision: "added"|"dismissed", at, event_id?}`.
//!
//! Google Calendar writes are NOT wired here. When they are, they go through
//! the connector's ConfirmationGuard (preview → per-instance "yes" → execute),
//! never from this file.

use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::civil;

pub const KINDS: [&str; 4] = ["study", "class", "exam", "personal"];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub kind: String,
    pub title: String,
    #[serde(default)]
    pub course_id: Option<String>,
    #[serde(default)]
    pub color_index: Option<u64>,
    pub start: String,
    pub end: String,
    #[serde(default)]
    pub note: String,
    pub created_at: String,
    #[serde(default = "local")]
    pub source: String,
}

fn local() -> String {
    "local".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suggestion {
    pub source_message_id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    #[serde(default)]
    pub confidence: f64,
    #[serde(default)]
    pub why: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Decision {
    pub source_message_id: String,
    pub decision: String,
    pub at: String,
    #[serde(default)]
    pub event_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CalendarPayload {
    pub events: Vec<Event>,
    pub suggestions: Vec<Suggestion>,
    pub decisions: Vec<Decision>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewEvent {
    pub kind: String,
    pub title: String,
    #[serde(default)]
    pub course_id: Option<String>,
    #[serde(default)]
    pub color_index: Option<u64>,
    pub start: String,
    pub end: String,
    #[serde(default)]
    pub note: String,
    #[serde(default)]
    pub source: Option<String>,
}

fn inbox(user_root: &Path) -> PathBuf {
    user_root.join("inbox")
}

fn events_path(user_root: &Path) -> PathBuf {
    inbox(user_root).join("calendar.jsonl")
}

fn suggestions_path(user_root: &Path) -> PathBuf {
    inbox(user_root).join("calendar-suggestions.jsonl")
}

fn decisions_path(user_root: &Path) -> PathBuf {
    inbox(user_root).join("calendar-suggestion-decisions.jsonl")
}

fn read_lines(path: &Path) -> Vec<Value> {
    fs::read_to_string(path)
        .map(|t| t.lines().filter(|l| !l.trim().is_empty()).filter_map(|l| serde_json::from_str::<Value>(l).ok()).collect())
        .unwrap_or_default()
}

fn append_line(path: &Path, value: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut f = OpenOptions::new().create(true).append(true).open(path).map_err(|e| e.to_string())?;
    writeln!(f, "{}", serde_json::to_string(value).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

fn now_iso() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    civil::iso_instant(secs)
}

fn new_id(prefix: &str) -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{prefix}-{nanos:x}-{}", std::process::id())
}

pub fn read_events(user_root: &Path) -> Vec<Event> {
    let mut folded: HashMap<String, Event> = HashMap::new();
    let mut order: Vec<String> = Vec::new();
    for row in read_lines(&events_path(user_root)) {
        let Some(id) = row.get("id").and_then(Value::as_str).map(String::from) else { continue };
        if row.get("deleted").and_then(Value::as_bool) == Some(true) {
            folded.remove(&id);
            continue;
        }
        if let Ok(ev) = serde_json::from_value::<Event>(row) {
            if !folded.contains_key(&id) {
                order.push(id.clone());
            }
            folded.insert(id, ev);
        }
    }
    let mut out: Vec<Event> = order.into_iter().filter_map(|id| folded.remove(&id)).collect();
    out.sort_by(|a, b| a.start.cmp(&b.start));
    out
}

pub fn read_calendar(user_root: &Path) -> CalendarPayload {
    let decisions: Vec<Decision> = read_lines(&decisions_path(user_root))
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect();
    let decided: std::collections::HashSet<&str> = decisions.iter().map(|d| d.source_message_id.as_str()).collect();
    let suggestions: Vec<Suggestion> = read_lines(&suggestions_path(user_root))
        .into_iter()
        .filter_map(|v| serde_json::from_value::<Suggestion>(v).ok())
        .filter(|s| !decided.contains(s.source_message_id.as_str()))
        .collect();
    CalendarPayload { events: read_events(user_root), suggestions, decisions }
}

pub fn validate(input: &NewEvent) -> Result<(), String> {
    if !KINDS.contains(&input.kind.as_str()) {
        return Err(format!("unknown event kind {:?}", input.kind));
    }
    if input.title.trim().is_empty() || input.title.len() > 200 {
        return Err("title is required (≤ 200 characters)".into());
    }
    let start = civil::parse_instant(&input.start).ok_or("start must be an ISO-8601 instant")?;
    let end = civil::parse_instant(&input.end).ok_or("end must be an ISO-8601 instant")?;
    if end <= start {
        return Err("end must be after start".into());
    }
    if input.note.len() > 2000 {
        return Err("note too long".into());
    }
    Ok(())
}

pub fn add_event(user_root: &Path, input: NewEvent) -> Result<Event, String> {
    validate(&input)?;
    let event = Event {
        id: new_id("ev"),
        kind: input.kind,
        title: input.title.trim().to_string(),
        course_id: input.course_id.filter(|c| !c.is_empty()),
        color_index: input.color_index,
        start: input.start,
        end: input.end,
        note: input.note,
        created_at: now_iso(),
        source: input.source.unwrap_or_else(local),
    };
    append_line(&events_path(user_root), &serde_json::to_value(&event).map_err(|e| e.to_string())?)?;
    Ok(event)
}

pub fn delete_event(user_root: &Path, id: &str) -> Result<(), String> {
    if !read_events(user_root).iter().any(|e| e.id == id) {
        return Err("no such event".into());
    }
    append_line(&events_path(user_root), &serde_json::json!({"id": id, "deleted": true, "created_at": now_iso()}))
}

/// Add (as a local event) or dismiss one suggestion. Never touches Google.
pub fn decide_suggestion(user_root: &Path, message_id: &str, decision: &str) -> Result<CalendarPayload, String> {
    let cal = read_calendar(user_root);
    let Some(s) = cal.suggestions.iter().find(|s| s.source_message_id == message_id) else {
        return Err("suggestion not found or already decided".into());
    };
    let event_id = match decision {
        "added" => Some(
            add_event(
                user_root,
                NewEvent {
                    kind: "personal".into(),
                    title: s.title.clone(),
                    course_id: None,
                    color_index: None,
                    start: s.start.clone(),
                    end: s.end.clone(),
                    note: s.why.clone(),
                    source: Some(format!("suggestion:{message_id}")),
                },
            )?
            .id,
        ),
        "dismissed" => None,
        _ => return Err("decision must be added or dismissed".into()),
    };
    append_line(
        &decisions_path(user_root),
        &serde_json::json!({"source_message_id": message_id, "decision": decision, "at": now_iso(), "event_id": event_id}),
    )?;
    Ok(read_calendar(user_root))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn root(tag: &str) -> PathBuf {
        let r = std::env::temp_dir().join(format!("pn-cal-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&r);
        fs::create_dir_all(r.join("inbox")).unwrap();
        r
    }

    #[test]
    fn add_delete_fold() {
        let r = root("fold");
        let ev = add_event(&r, NewEvent { kind: "study".into(), title: " Trees ".into(), course_id: Some("3101".into()), color_index: Some(6), start: "2026-09-20T15:00:00Z".into(), end: "2026-09-20T16:00:00Z".into(), note: "".into(), source: None }).unwrap();
        assert_eq!(ev.title, "Trees");
        assert_eq!(read_events(&r).len(), 1);
        assert!(add_event(&r, NewEvent { kind: "nap".into(), title: "x".into(), course_id: None, color_index: None, start: "2026-09-20T15:00:00Z".into(), end: "2026-09-20T16:00:00Z".into(), note: "".into(), source: None }).is_err());
        assert!(add_event(&r, NewEvent { kind: "study".into(), title: "x".into(), course_id: None, color_index: None, start: "2026-09-20T16:00:00Z".into(), end: "2026-09-20T15:00:00Z".into(), note: "".into(), source: None }).is_err());
        delete_event(&r, &ev.id).unwrap();
        assert!(read_events(&r).is_empty());
        assert!(delete_event(&r, &ev.id).is_err());
        // The file is append-only: three rows (add, add-rejected-not-written, tombstone).
        assert_eq!(fs::read_to_string(events_path(&r)).unwrap().lines().count(), 2);
        let _ = fs::remove_dir_all(&r);
    }

    #[test]
    fn suggestions_are_read_only_until_decided_and_never_auto_added() {
        let r = root("sugg");
        fs::write(
            suggestions_path(&r),
            "{\"source_message_id\":\"m1\",\"title\":\"Review session\",\"start\":\"2026-10-19T23:00:00Z\",\"end\":\"2026-10-20T00:30:00Z\",\"confidence\":0.8,\"why\":\"email\"}\n{\"source_message_id\":\"m2\",\"title\":\"Fair\",\"start\":\"2026-09-30T16:00:00Z\",\"end\":\"2026-09-30T20:00:00Z\",\"confidence\":0.5,\"why\":\"newsletter\"}\n",
        )
        .unwrap();
        let cal = read_calendar(&r);
        assert_eq!(cal.suggestions.len(), 2);
        assert!(cal.events.is_empty(), "reading suggestions adds nothing");
        let after = decide_suggestion(&r, "m1", "added").unwrap();
        assert_eq!(after.events.len(), 1);
        assert_eq!(after.events[0].source, "suggestion:m1");
        assert_eq!(after.suggestions.len(), 1);
        let after = decide_suggestion(&r, "m2", "dismissed").unwrap();
        assert!(after.suggestions.is_empty());
        assert_eq!(after.events.len(), 1);
        assert!(decide_suggestion(&r, "m2", "added").is_err());
        let _ = fs::remove_dir_all(&r);
    }
}
