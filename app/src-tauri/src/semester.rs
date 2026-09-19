//! Home semester line: one native read over `inbox/study-sources/*.json`
//! (schema 2, written by browser/scripts/sync-study-sources.mjs) that returns
//! every course row and its ticks for a window. No Python hop, no Canvas
//! payload parsing in the renderer. Weights and term inference are computed
//! at sync time (browser/scripts/lib/semester.mjs); this module only reads,
//! filters and labels.

use std::fs;
use std::path::Path;

use serde::Serialize;
use serde_json::Value;

use crate::civil::{self, Date};

/// Days of recent past kept on the left of "today" so overdue / just-finished
/// items stay visible (dimmed). Full semester ignores this and starts at the
/// earliest term start.
pub const PAST_CONTEXT_DAYS: i64 = 7;

#[derive(Debug, Clone, Serialize)]
pub struct Color {
    pub name: String,
    pub light: String,
    pub dark: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Term {
    pub start_at: Option<String>,
    pub end_at: Option<String>,
    /// "canvas" | "inferred" | "mixed" | "none" — the UI must not imply a
    /// certainty the data does not carry.
    pub source: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Tick {
    pub id: String,
    pub course_id: String,
    pub kind: String,
    pub title: String,
    pub due_at: String,
    pub points_possible: Option<f64>,
    pub weight_share: f64,
    pub group_name: Option<String>,
    pub html_url: Option<String>,
    pub submitted: Option<bool>,
    pub graded: Option<bool>,
    pub score: Option<f64>,
    pub past: bool,
    pub has_description: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct CourseRow {
    pub id: String,
    pub label: String,
    pub code: String,
    pub color_index: usize,
    pub color: Color,
    pub term: Term,
    pub fetched_at: Option<String>,
    pub ticks: Vec<Tick>,
    /// Items with no due date are not drawable; count them so the row can say so.
    pub undated: usize,
    pub total_items: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Window {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Semester {
    pub today: String,
    pub range: String,
    pub window: Window,
    pub courses: Vec<CourseRow>,
    pub status: Value,
}

pub fn sources_dir(user_root: &Path) -> std::path::PathBuf {
    user_root.join("inbox").join("study-sources")
}

fn str_of(v: &Value, key: &str) -> Option<String> {
    v.get(key).and_then(Value::as_str).map(|s| s.to_string())
}

fn f64_of(v: &Value, key: &str) -> Option<f64> {
    v.get(key).and_then(Value::as_f64)
}

fn bool_of(v: &Value, key: &str) -> Option<bool> {
    v.get(key).and_then(Value::as_bool)
}

/// Every course record on disk (schema ≥ 2 only: older records have no items).
pub fn load_records(user_root: &Path) -> Vec<Value> {
    let dir = sources_dir(user_root);
    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(&dir) else {
        return out;
    };
    let mut paths: Vec<_> = entries
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().map(|e| e == "json").unwrap_or(false))
        .filter(|p| p.file_name().map(|n| n != "status.json").unwrap_or(false))
        .collect();
    paths.sort();
    for path in paths {
        let Ok(text) = fs::read_to_string(&path) else { continue };
        let Ok(value) = serde_json::from_str::<Value>(&text) else { continue };
        if value.get("course").map(Value::is_object).unwrap_or(false) && value.get("schema").and_then(Value::as_i64).unwrap_or(1) >= 2 {
            out.push(value);
        }
    }
    out
}

pub fn load_status(user_root: &Path) -> Value {
    let path = sources_dir(user_root).join("status.json");
    match fs::read_to_string(&path).ok().and_then(|t| serde_json::from_str::<Value>(&t).ok()) {
        Some(v) => serde_json::json!({
            "state": if v.get("session").and_then(Value::as_str) != Some("ok") { "session_expired" } else if v.get("ok").and_then(Value::as_bool) != Some(true) { "failed" } else if v.get("partial").and_then(Value::as_bool) == Some(true) { "partial" } else { "ok" },
            "finished_at": v.get("finished_at").cloned().unwrap_or(Value::Null),
            "errors": v.get("errors").cloned().unwrap_or_else(|| Value::Array(vec![])),
        }),
        None => serde_json::json!({"state": "never", "finished_at": Value::Null, "errors": []}),
    }
}

fn color_of(course: &Value) -> (usize, Color) {
    let idx = course.get("color_index").and_then(Value::as_u64).unwrap_or(0) as usize;
    let c = course.get("color").cloned().unwrap_or(Value::Null);
    (
        idx,
        Color {
            name: str_of(&c, "name").unwrap_or_else(|| "blue".into()),
            light: str_of(&c, "light").unwrap_or_else(|| "#2a78d6".into()),
            dark: str_of(&c, "dark").unwrap_or_else(|| "#3987e5".into()),
        },
    )
}

fn term_of(record: &Value) -> Term {
    let t = record.get("term").cloned().unwrap_or(Value::Null);
    Term {
        start_at: str_of(&t, "start_at"),
        end_at: str_of(&t, "end_at"),
        source: str_of(&t, "source").unwrap_or_else(|| "none".into()),
    }
}

fn tick_of(course_id: &str, item: &Value, today_secs: i64) -> Option<Tick> {
    let due_at = str_of(item, "due_at")?;
    let due_secs = civil::parse_instant(&due_at)?;
    Some(Tick {
        id: str_of(item, "id")?,
        course_id: course_id.to_string(),
        kind: str_of(item, "kind").unwrap_or_else(|| "assignment".into()),
        title: str_of(item, "title").unwrap_or_else(|| "Item".into()),
        due_at,
        points_possible: f64_of(item, "points_possible"),
        weight_share: f64_of(item, "weight_share").unwrap_or(0.0),
        group_name: str_of(item, "group_name"),
        html_url: str_of(item, "html_url"),
        submitted: bool_of(item, "submitted"),
        graded: bool_of(item, "graded"),
        score: f64_of(item, "score"),
        past: due_secs < today_secs,
        has_description: item.get("source_id").and_then(Value::as_str).is_some(),
    })
}

/// Window for a range key. "1m" | "2m" | "3m" start PAST_CONTEXT_DAYS before
/// today and end N calendar months after today; "semester" spans the earliest
/// term start to the latest term end (falling back to the tick extent).
pub fn window_for(range: &str, today: Date, records: &[Value]) -> (String, Window) {
    let months = match range {
        "1m" => Some(1),
        "2m" => Some(2),
        "3m" => Some(3),
        _ => None,
    };
    if let Some(n) = months {
        return (
            range.to_string(),
            Window {
                start: today.add_days(-PAST_CONTEXT_DAYS).iso(),
                end: today.add_months(n).iso(),
            },
        );
    }
    let mut start = i64::MAX;
    let mut end = i64::MIN;
    for r in records {
        let t = term_of(r);
        if let Some(s) = t.start_at.as_deref().and_then(civil::parse_instant) {
            start = start.min(s);
        }
        if let Some(e) = t.end_at.as_deref().and_then(civil::parse_instant) {
            end = end.max(e);
        }
        for item in r.get("items").and_then(Value::as_array).into_iter().flatten() {
            if let Some(d) = str_of(item, "due_at").as_deref().and_then(civil::parse_instant) {
                start = start.min(d);
                end = end.max(d);
            }
        }
    }
    let today_secs = today.start_secs();
    if start == i64::MAX {
        start = today.add_days(-PAST_CONTEXT_DAYS).start_secs();
    }
    if end == i64::MIN || end < today_secs {
        end = today.add_months(3).start_secs();
    }
    (
        "semester".to_string(),
        Window {
            start: civil::civil_from_days(start.div_euclid(civil::DAY_SECS)).iso(),
            end: civil::civil_from_days(end.div_euclid(civil::DAY_SECS) + 1).iso(),
        },
    )
}

pub fn read_semester(user_root: &Path, range: &str, today: Option<&str>) -> Semester {
    let today = today.and_then(Date::parse).unwrap_or_else(civil::utc_today);
    let today_secs = today.start_secs();
    let records = load_records(user_root);
    let (range, window) = window_for(range, today, &records);
    let start_secs = civil::parse_instant(&window.start).unwrap_or(i64::MIN);
    let end_secs = civil::parse_instant(&window.end).unwrap_or(i64::MAX) + civil::DAY_SECS;
    let mut courses = Vec::new();
    for r in &records {
        let course = &r["course"];
        let id = str_of(course, "id").unwrap_or_default();
        let (color_index, color) = color_of(course);
        let items: Vec<&Value> = r.get("items").and_then(Value::as_array).map(|a| a.iter().collect()).unwrap_or_default();
        let mut ticks = Vec::new();
        let mut undated = 0usize;
        for item in &items {
            match tick_of(&id, item, today_secs) {
                Some(t) => {
                    let due = civil::parse_instant(&t.due_at).unwrap_or(i64::MIN);
                    if due >= start_secs && due < end_secs {
                        ticks.push(t);
                    }
                }
                None => undated += 1,
            }
        }
        ticks.sort_by(|a, b| a.due_at.cmp(&b.due_at));
        courses.push(CourseRow {
            id,
            label: str_of(course, "label").unwrap_or_default(),
            code: str_of(course, "code").unwrap_or_default(),
            color_index,
            color,
            term: term_of(r),
            fetched_at: str_of(r, "fetched_at"),
            ticks,
            undated,
            total_items: items.len(),
            errors: r
                .get("errors")
                .and_then(Value::as_array)
                .map(|a| a.iter().filter_map(Value::as_str).map(String::from).collect())
                .unwrap_or_default(),
        });
    }
    courses.sort_by(|a, b| a.label.cmp(&b.label));
    Semester {
        today: today.iso(),
        range,
        window,
        courses,
        status: load_status(user_root),
    }
}

/// One course record + one item, for the click popup and Exam Prep.
pub fn find_item(user_root: &Path, course_id: &str, item_id: &str) -> Option<(Value, Value)> {
    load_records(user_root).into_iter().find_map(|r| {
        if str_of(&r["course"], "id").as_deref() != Some(course_id) {
            return None;
        }
        let item = r
            .get("items")
            .and_then(Value::as_array)?
            .iter()
            .find(|i| str_of(i, "id").as_deref() == Some(item_id))?
            .clone();
        Some((r, item))
    })
}

#[cfg(test)]
pub(crate) mod fixture {
    use std::path::PathBuf;
    use std::process::Command;

    /// Materialise the synthetic profile with the same generator the JS tests
    /// use, so the Rust reader is checked against real sync output.
    pub fn synthetic_root(tag: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("pn-semester-{tag}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let repo = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..");
        let node = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "node"]
            .iter()
            .find(|p| Command::new(p).arg("--version").output().map(|o| o.status.success()).unwrap_or(false))
            .expect("node available for fixture generation");
        let status = Command::new(node)
            .arg(repo.join("browser").join("scripts").join("make-synthetic-profile.mjs"))
            .arg(&root)
            .current_dir(repo.join("browser"))
            .status()
            .expect("run make-synthetic-profile");
        assert!(status.success());
        root
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_four_rows_with_labeled_terms_and_weighted_ticks() {
        let root = fixture::synthetic_root("rows");
        let s = read_semester(&root, "semester", Some("2026-09-18"));
        assert_eq!(s.today, "2026-09-18");
        assert_eq!(s.courses.len(), 4);
        assert_eq!(s.status["state"], "ok");
        let csci = s.courses.iter().find(|c| c.code == "CSCI 2270").unwrap();
        assert_eq!(csci.term.source, "canvas");
        assert_eq!(csci.term.end_at.as_deref(), Some("2026-12-18T06:59:59.000Z"));
        let phys = s.courses.iter().find(|c| c.code == "PHYS 1110").unwrap();
        assert_eq!(phys.term.source, "inferred");
        // Exams carry the largest share; the ungraded item the smallest.
        let final_exam = csci.ticks.iter().find(|t| t.title == "Final Exam").unwrap();
        assert_eq!(final_exam.kind, "exam");
        assert!(final_exam.weight_share > 0.29);
        let ack = csci.ticks.iter().find(|t| t.title == "Syllabus acknowledgement").unwrap();
        assert_eq!(ack.weight_share, 0.0);
        assert!(ack.past);
        assert!(!final_exam.past);
        // Submission state is passed through only where Canvas returned it.
        let ps1 = phys.ticks.iter().find(|t| t.title == "Problem set 1").unwrap();
        assert_eq!(ps1.submitted, Some(true));
        assert_eq!(ps1.score, Some(23.0));
        assert_eq!(phys.ticks.iter().find(|t| t.title == "Midterm").unwrap().submitted, None);
        // Full semester window spans the earliest term start to the latest end.
        assert_eq!(s.window.start, "2026-08-24");
        assert_eq!(s.window.end, "2026-12-19");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn month_ranges_filter_ticks_and_keep_a_week_of_past_context() {
        let root = fixture::synthetic_root("range");
        let one = read_semester(&root, "1m", Some("2026-09-18"));
        assert_eq!(one.window.start, "2026-09-11");
        assert_eq!(one.window.end, "2026-10-18");
        let all: Vec<&Tick> = one.courses.iter().flat_map(|c| c.ticks.iter()).collect();
        assert!(all.iter().all(|t| t.due_at.as_str() >= "2026-09-11" && t.due_at.as_str() < "2026-10-19"));
        assert!(all.iter().any(|t| t.past), "recent past items stay visible");
        assert!(all.iter().any(|t| t.title == "Midterm 1"));
        assert!(!all.iter().any(|t| t.title == "Final Exam"));
        let three = read_semester(&root, "3m", Some("2026-09-18"));
        let n3: usize = three.courses.iter().map(|c| c.ticks.len()).sum();
        assert!(n3 > all.len());
        assert!(three.courses.iter().flat_map(|c| c.ticks.iter()).any(|t| t.title == "Final Exam"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn empty_profile_is_an_honest_empty_state() {
        let root = std::env::temp_dir().join(format!("pn-semester-empty-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let s = read_semester(&root, "1m", Some("2026-09-18"));
        assert!(s.courses.is_empty());
        assert_eq!(s.status["state"], "never");
        let sem = read_semester(&root, "semester", Some("2026-09-18"));
        assert_eq!(sem.window.start, "2026-09-11");
    }

    /// Refresh the frontend contract fixtures from real daemon output:
    /// `cargo test --locked dump_frontend_fixtures -- --ignored`
    #[test]
    #[ignore]
    fn dump_frontend_fixtures() {
        let root = fixture::synthetic_root("dump");
        let dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("src").join("test").join("fixtures");
        std::fs::create_dir_all(&dir).unwrap();
        for range in ["1m", "3m", "semester"] {
            let s = read_semester(&root, range, Some("2026-09-18"));
            std::fs::write(dir.join(format!("semester-{range}.json")), serde_json::to_string_pretty(&s).unwrap()).unwrap();
        }
        let (record, item) = find_item(&root, "3101", "a1018").unwrap();
        let prep = crate::exam_plan::exam_prep(&record, &item, Date::parse("2026-09-18").unwrap(), 0);
        std::fs::write(dir.join("exam-prep-midterm1.json"), serde_json::to_string_pretty(&prep).unwrap()).unwrap();
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn find_item_returns_the_record_and_the_item() {
        let root = fixture::synthetic_root("find");
        let s = read_semester(&root, "semester", Some("2026-09-18"));
        let csci = s.courses.iter().find(|c| c.code == "CSCI 2270").unwrap();
        let mid = csci.ticks.iter().find(|t| t.title == "Midterm 1").unwrap();
        let (record, item) = find_item(&root, &csci.id, &mid.id).unwrap();
        assert_eq!(record["course"]["code"], "CSCI 2270");
        assert_eq!(item["title"], "Midterm 1");
        assert!(find_item(&root, &csci.id, "nope").is_none());
        let _ = fs::remove_dir_all(&root);
    }
}
