//! Exam Prep: a deterministic *draft* plan from today to the exam, built from
//! the synced course material. `build_exam_plan(exam, sources, today, seed)`
//! is the seam a model-backed planner replaces later; the payload shape stays.
//! No model call, no invented topics: every focus row points at a synced
//! source id, and an exam with no material gets an honest empty plan.

use serde::Serialize;
use serde_json::Value;

use crate::civil::{self, Date};

#[derive(Debug, Clone, Serialize)]
pub struct ExamInfo {
    pub id: String,
    pub title: String,
    pub kind: String,
    pub due_at: String,
    pub points_possible: Option<f64>,
    pub weight_share: f64,
    pub html_url: Option<String>,
    /// Instructor description (assignment body) when synced — the closest
    /// thing to "what it covers" that exists on disk.
    pub description: Option<String>,
    /// Syllabus lines that mention the exam by name.
    pub syllabus_mentions: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Source {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub excerpt: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Focus {
    pub source_id: String,
    pub title: String,
    pub how: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PlanDay {
    pub date: String,
    pub weekday: String,
    pub label: String,
    pub is_today: bool,
    pub is_review: bool,
    pub focus: Vec<Focus>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Plan {
    pub seed: u64,
    pub draft: bool,
    pub method: String,
    pub note: String,
    pub days_until: i64,
    pub days: Vec<PlanDay>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExamPrep {
    pub course: Value,
    pub exam: ExamInfo,
    pub covers: Vec<Source>,
    pub plan: Plan,
}

const HOW_READ: [&str; 3] = [
    "Read once, then close it and write down the three ideas you remember.",
    "Skim the headings, then explain the page to yourself out loud.",
    "Read it and turn each heading into a question you could be asked.",
];
const HOW_PRACTICE: [&str; 3] = [
    "Redo it from a blank page without looking at your old work.",
    "Work it again; note every step you had to look up.",
    "Solve it cold, then check against the description.",
];
const HOW_REVIEW: [&str; 2] = [
    "Answer your own questions from memory; reopen only what you missed.",
    "Quick pass: recall each topic in one sentence, no notes.",
];

fn excerpt(text: &str, max: usize) -> String {
    let flat: String = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if flat.chars().count() <= max {
        return flat;
    }
    let cut: String = flat.chars().take(max).collect();
    format!("{}…", cut.trim_end())
}

pub fn exam_info(item: &Value, record: &Value) -> ExamInfo {
    let title = item.get("title").and_then(Value::as_str).unwrap_or("Exam").to_string();
    let source_id = item.get("source_id").and_then(Value::as_str);
    let sources = record.get("sources").and_then(Value::as_array).cloned().unwrap_or_default();
    let description = source_id
        .and_then(|sid| sources.iter().find(|s| s.get("id").and_then(Value::as_str) == Some(sid)))
        .and_then(|s| s.get("text").and_then(Value::as_str))
        .map(|t| excerpt(t, 700));
    let needle = title.to_lowercase();
    let syllabus_mentions: Vec<String> = sources
        .iter()
        .filter(|s| s.get("kind").and_then(Value::as_str) == Some("syllabus"))
        .filter_map(|s| s.get("text").and_then(Value::as_str))
        .flat_map(|t| t.split(['\n', '.']).map(|l| l.trim().to_string()).collect::<Vec<_>>())
        .filter(|l| !l.is_empty() && l.to_lowercase().contains(&needle))
        .take(3)
        .map(|l| excerpt(&l, 220))
        .collect();
    ExamInfo {
        id: item.get("id").and_then(Value::as_str).unwrap_or("").to_string(),
        title,
        kind: item.get("kind").and_then(Value::as_str).unwrap_or("exam").to_string(),
        due_at: item.get("due_at").and_then(Value::as_str).unwrap_or("").to_string(),
        points_possible: item.get("points_possible").and_then(Value::as_f64),
        weight_share: item.get("weight_share").and_then(Value::as_f64).unwrap_or(0.0),
        html_url: item.get("html_url").and_then(Value::as_str).map(String::from),
        description,
        syllabus_mentions,
    }
}

/// Material the exam plausibly covers: pages and assignment descriptions
/// published before the exam, in course order (updated_at, then title). The
/// exam's own description and the syllabus are context, not study units.
pub fn covered_sources(record: &Value, exam_item: &Value) -> Vec<Source> {
    let exam_due = exam_item.get("due_at").and_then(Value::as_str).and_then(civil::parse_instant).unwrap_or(i64::MAX);
    let exam_source = exam_item.get("source_id").and_then(Value::as_str).unwrap_or("");
    let items = record.get("items").and_then(Value::as_array).cloned().unwrap_or_default();
    let due_of_source = |sid: &str| -> Option<i64> {
        items
            .iter()
            .find(|i| i.get("source_id").and_then(Value::as_str) == Some(sid))
            .and_then(|i| i.get("due_at").and_then(Value::as_str))
            .and_then(civil::parse_instant)
    };
    let mut out: Vec<(i64, Source)> = record
        .get("sources")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|s| {
            let id = s.get("id").and_then(Value::as_str)?.to_string();
            let kind = s.get("kind").and_then(Value::as_str)?.to_string();
            if kind == "syllabus" || id == exam_source {
                return None;
            }
            let updated = s.get("updated_at").and_then(Value::as_str).map(String::from);
            let order = match kind.as_str() {
                "assignment" => due_of_source(&id),
                _ => updated.as_deref().and_then(civil::parse_instant),
            }
            .unwrap_or(0);
            if order > exam_due {
                return None;
            }
            Some((
                order,
                Source {
                    id,
                    kind,
                    title: s.get("title").and_then(Value::as_str).unwrap_or("Untitled").to_string(),
                    excerpt: excerpt(s.get("text").and_then(Value::as_str).unwrap_or(""), 160),
                    updated_at: updated,
                },
            ))
        })
        .collect();
    out.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.title.cmp(&b.1.title)));
    out.into_iter().map(|(_, s)| s).collect()
}

/// The seam. Splits `sources` across the days from `today` up to the exam:
/// earlier material earlier, the heaviest/most recent material later, last
/// study day kept for review. `seed` only reshuffles which sources share a
/// day — it never invents a source.
pub fn build_exam_plan(exam: &ExamInfo, sources: &[Source], today: Date, seed: u64) -> Plan {
    let exam_day = exam
        .due_at
        .as_str()
        .get(0..10)
        .and_then(Date::parse)
        .unwrap_or(today);
    let days_until = exam_day.days() - today.days();
    let note = if sources.is_empty() {
        "No synced pages or assignment descriptions for this course yet, so there is nothing to spread across days. Sync Canvas again once the instructor posts material.".to_string()
    } else if days_until < 0 {
        "This exam date is in the past.".to_string()
    } else {
        "Draft plan: an even split of the synced material across the days you have, last day for review. \"Redo this plan\" reshuffles the split; it does not yet consult a model.".to_string()
    };
    let mut days = Vec::new();
    if sources.is_empty() || days_until < 0 {
        return Plan { seed, draft: true, method: "deterministic-split-v1".into(), note, days_until, days };
    }
    // Study days: today … exam_day - 1 (exam day itself is not a study day).
    // Same-day exam → one block today.
    let study_days = days_until.max(1) as usize;
    let last_is_review = study_days >= 2;
    let content_days = if last_is_review { study_days - 1 } else { study_days };
    let n = sources.len();
    // Assign each source (in course order) to a content day. Sparse material
    // is spaced out; dense material is chunked. The seed shifts where the
    // boundaries fall without reordering the material.
    let mut per_day: Vec<Vec<&Source>> = vec![Vec::new(); content_days];
    if n <= content_days {
        let spacing = content_days as f64 / n as f64;
        let sp = spacing.floor() as usize;
        let offset = if seed == 0 || sp < 2 { 0 } else { 1 + ((seed - 1) as usize) % (sp - 1).max(1) };
        for (i, src) in sources.iter().enumerate() {
            let day = ((i as f64 * spacing).floor() as usize + offset).min(content_days - 1);
            per_day[day].push(src);
        }
    } else {
        let chunk = (n as f64 / content_days as f64).ceil() as usize;
        let mut day = 0usize;
        let mut fill = if seed == 0 { 0 } else { (seed as usize) % chunk };
        for src in sources.iter() {
            if per_day[day].len() >= chunk.saturating_sub(fill).max(1) && day + 1 < content_days {
                day += 1;
                fill = 0;
            }
            per_day[day].push(src);
        }
    }
    let mut last_studied: Vec<&Source> = Vec::new();
    for d in 0..study_days {
        let date = today.add_days(d as i64);
        let is_review = last_is_review && d == study_days - 1;
        let (label, focus): (String, Vec<Focus>) = if is_review {
            (
                "Review".to_string(),
                sources
                    .iter()
                    .rev()
                    .take(4)
                    .enumerate()
                    .map(|(i, s)| Focus { source_id: s.id.clone(), title: s.title.clone(), how: HOW_REVIEW[(i + seed as usize) % HOW_REVIEW.len()].into() })
                    .collect(),
            )
        } else if !per_day[d].is_empty() {
            last_studied = per_day[d].clone();
            (
                if d == 0 { "Start".to_string() } else { format!("Day {}", d + 1) },
                per_day[d]
                    .iter()
                    .enumerate()
                    .map(|(i, s)| {
                        let bank: &[&str] = if s.kind == "assignment" { &HOW_PRACTICE } else { &HOW_READ };
                        Focus { source_id: s.id.clone(), title: s.title.clone(), how: bank[(i + d + seed as usize) % bank.len()].into() }
                    })
                    .collect(),
            )
        } else {
            // Gap day: a short revisit of what was last studied, from memory.
            (
                "Revisit".to_string(),
                last_studied
                    .iter()
                    .take(2)
                    .map(|s| Focus { source_id: s.id.clone(), title: s.title.clone(), how: "Ten minutes: recall it from memory, then check one thing you were unsure of.".into() })
                    .collect(),
            )
        };
        days.push(PlanDay { date: date.iso(), weekday: date.weekday_name().into(), label, is_today: d == 0, is_review, focus });
    }
    Plan { seed, draft: true, method: "deterministic-split-v1".into(), note, days_until, days }
}

pub fn exam_prep(record: &Value, item: &Value, today: Date, seed: u64) -> ExamPrep {
    let exam = exam_info(item, record);
    let covers = covered_sources(record, item);
    let plan = build_exam_plan(&exam, &covers, today, seed);
    ExamPrep { course: record["course"].clone(), exam, covers, plan }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::semester::{find_item, fixture};

    #[test]
    fn plan_spreads_material_and_ends_with_review() {
        let root = fixture::synthetic_root("plan");
        let (record, item) = find_item(&root, "3101", "a1018").expect("Midterm 1 is item a1018");
        assert_eq!(item["title"], "Midterm 1");
        let today = Date::parse("2026-09-18").unwrap();
        let prep = exam_prep(&record, &item, today, 0);
        assert!(prep.exam.description.as_deref().unwrap().contains("arrays"));
        // Three pages + one assignment description (Homework 3), all before the exam.
        assert_eq!(prep.covers.len(), 4);
        assert_eq!(prep.plan.days_until, 14);
        assert_eq!(prep.plan.days.len(), 14);
        assert!(prep.plan.days[0].is_today);
        assert!(prep.plan.days.last().unwrap().is_review);
        assert!(prep.plan.draft);
        let mentioned: std::collections::HashSet<&str> = prep.plan.days.iter().flat_map(|d| d.focus.iter().map(|f| f.source_id.as_str())).collect();
        for s in &prep.covers {
            assert!(mentioned.contains(s.id.as_str()), "{} scheduled", s.title);
        }
        // Every focus points at a real synced source.
        let ids: Vec<&str> = prep.covers.iter().map(|s| s.id.as_str()).collect();
        for d in &prep.plan.days {
            for f in &d.focus {
                assert!(ids.contains(&f.source_id.as_str()));
            }
        }
        // Redo (seed) changes the split but not the set.
        let redo = build_exam_plan(&prep.exam, &prep.covers, today, 3);
        let a: Vec<String> = prep.plan.days.iter().map(|d| d.focus.iter().map(|f| f.source_id.clone()).collect::<Vec<_>>().join(",")).collect();
        let b: Vec<String> = redo.days.iter().map(|d| d.focus.iter().map(|f| f.source_id.clone()).collect::<Vec<_>>().join(",")).collect();
        assert_ne!(a, b);
        assert_eq!(build_exam_plan(&prep.exam, &prep.covers, today, 3).days.len(), redo.days.len());
        // No study day is empty: gaps become short revisits of the last material.
        assert!(prep.plan.days.iter().all(|d| !d.focus.is_empty()));
        // Dense material (more sources than days) still schedules everything.
        let many: Vec<Source> = (0..20).map(|i| Source { id: format!("p{i}"), kind: "page".into(), title: format!("Week {i}"), excerpt: "".into(), updated_at: None }).collect();
        let dense = build_exam_plan(&prep.exam, &many, Date::parse("2026-09-28").unwrap(), 2);
        let scheduled: std::collections::HashSet<&str> = dense.days.iter().filter(|d| !d.is_review).flat_map(|d| d.focus.iter().map(|f| f.source_id.as_str())).collect();
        assert_eq!(scheduled.len(), 20);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn no_material_means_an_honest_empty_plan() {
        let root = fixture::synthetic_root("empty-plan");
        let (record, item) = find_item(&root, "3103", "a1047").expect("PHYS midterm");
        assert_eq!(item["title"], "Midterm");
        let prep = exam_prep(&record, &item, Date::parse("2026-09-18").unwrap(), 0);
        assert!(prep.covers.is_empty());
        assert!(prep.plan.days.is_empty());
        assert!(prep.plan.note.contains("nothing to spread"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn same_day_exam_is_one_review_block() {
        let exam = ExamInfo { id: "x".into(), title: "Quiz".into(), kind: "quiz".into(), due_at: "2026-09-18T15:00:00Z".into(), points_possible: Some(10.0), weight_share: 0.02, html_url: None, description: None, syllabus_mentions: vec![] };
        let sources = vec![Source { id: "p1".into(), kind: "page".into(), title: "Week 1".into(), excerpt: "".into(), updated_at: None }];
        let plan = build_exam_plan(&exam, &sources, Date::parse("2026-09-18").unwrap(), 0);
        assert_eq!(plan.days.len(), 1);
        assert!(!plan.days[0].is_review);
        assert_eq!(plan.days[0].focus.len(), 1);
    }
}
