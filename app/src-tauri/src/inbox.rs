//! Parse `{user_root}/inbox/focus.md` into the practice peek.
//!
//! Prefer `Open with:` (the closed-book check). Do not fall back to
//! `week.md` — that due-list is not a retrieval.

use serde::Serialize;
use std::env;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
pub struct Top3Item {
    pub id: String,
    pub title: String,
    pub due: String,
}

/// Resolve the active user root (DEV_USER_ROOT or OS app-support `dev`).
pub fn user_root() -> PathBuf {
    if let Ok(root) = env::var("DEV_USER_ROOT") {
        let trimmed = root.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    default_user_root()
}

fn default_user_root() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        dirs_home()
            .join("Library")
            .join("Application Support")
            .join("ProductName")
            .join("dev")
    }
    #[cfg(target_os = "windows")]
    {
        env::var_os("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|| dirs_home().join("AppData").join("Roaming"))
            .join("ProductName")
            .join("dev")
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| dirs_home().join(".local").join("share"))
            .join("ProductName")
            .join("dev")
    }
}

fn dirs_home() -> PathBuf {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

pub fn week_md_path() -> PathBuf {
    user_root().join("inbox").join("week.md")
}

pub fn focus_md_path() -> PathBuf {
    user_root().join("inbox").join("focus.md")
}

pub fn auth_dir() -> PathBuf {
    user_root().join("auth")
}

/// Parse markdown table rows from sync-week output.
pub fn parse_week_top3(md: &str, limit: usize) -> Vec<Top3Item> {
    let mut items = Vec::new();
    let mut in_table = false;
    for line in md.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("| Course |") {
            in_table = true;
            continue;
        }
        if !in_table {
            continue;
        }
        if !trimmed.starts_with('|') {
            break;
        }
        // Skip separator |---|---|
        if trimmed.contains("---") {
            continue;
        }
        let cells: Vec<&str> = trimmed
            .trim_matches('|')
            .split('|')
            .map(|c| c.trim())
            .collect();
        if cells.len() < 3 {
            continue;
        }
        let course = cells[0];
        let assignment = cells[1];
        let due = cells[2];
        if course.is_empty() && assignment.is_empty() {
            continue;
        }
        let title = if course.is_empty() {
            assignment.to_string()
        } else if assignment.is_empty() {
            course.to_string()
        } else {
            format!("{course}: {assignment}")
        };
        let id = format!("week-{}", items.len() + 1);
        items.push(Top3Item {
            id,
            title,
            due: due.to_string(),
        });
        if items.len() >= limit {
            break;
        }
    }
    items
}

/// Parse the practice handoff. `Open with:` becomes the first item's subtitle
/// so Today shows the check, not only the assignment title.
pub fn parse_focus_top3(md: &str, limit: usize) -> Vec<Top3Item> {
    let mut open_with = String::new();
    let mut items = Vec::new();
    for line in md.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("Open with:") {
            let text = rest.trim();
            if !text.is_empty() {
                open_with = text.to_string();
            }
            continue;
        }
        let Some(rest) = strip_numbered_item(trimmed) else {
            continue;
        };
        let (title, due) = split_focus_item(rest);
        if title.is_empty() {
            continue;
        }
        items.push(Top3Item {
            id: format!("focus-{}", items.len() + 1),
            title,
            due,
        });
        if items.len() >= limit {
            break;
        }
    }
    if items.is_empty() && !open_with.is_empty() {
        items.push(Top3Item {
            id: "focus-1".to_string(),
            title: "Open with".to_string(),
            due: open_with,
        });
        return items;
    }
    if !items.is_empty() && !open_with.is_empty() {
        items[0].due = open_with;
    }
    items
}

fn strip_numbered_item(line: &str) -> Option<&str> {
    let mut chars = line.chars();
    let first = chars.next()?;
    if !first.is_ascii_digit() {
        return None;
    }
    let rest = chars.as_str();
    let after_digits = rest.trim_start_matches(|c: char| c.is_ascii_digit());
    let after_digits = after_digits.trim_start();
    let body = after_digits.strip_prefix('.')?.trim();
    if body.is_empty() { None } else { Some(body) }
}

fn split_focus_item(body: &str) -> (String, String) {
    let parts: Vec<&str> = body
        .split(" — ")
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect();
    if parts.is_empty() {
        return (body.to_string(), String::new());
    }
    let mut due = String::new();
    let mut title_parts: Vec<&str> = Vec::new();
    for part in &parts {
        let lower = part.to_ascii_lowercase();
        if lower.starts_with("due ") {
            due = part[4..].trim().to_string();
        } else if lower.starts_with("check:") {
            continue;
        } else if title_parts.len() < 2 {
            title_parts.push(*part);
        }
    }
    let title = if title_parts.is_empty() {
        parts[0].to_string()
    } else {
        title_parts.join(" — ")
    };
    (title, due)
}

pub fn read_top3(limit: usize) -> Result<Vec<Top3Item>, String> {
    let focus = focus_md_path();
    if !focus.is_file() {
        return Ok(Vec::new());
    }
    let md = fs::read_to_string(&focus)
        .map_err(|e| format!("failed to read {}: {e}", focus.display()))?;
    Ok(parse_focus_top3(&md, limit))
}

pub fn save_school_slug(slug: &str) -> Result<(), String> {
    let root = user_root();
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    fs::write(root.join("school_slug"), slug.trim()).map_err(|e| e.to_string())
}

pub fn save_cloud_key(key: &str) -> Result<(), String> {
    let dir = auth_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("cloud_key");
    fs::write(&path, key.trim()).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_week_table() {
        let md = r#"# Week ahead

| Course | Assignment | Due | Points | Type | Notes |
|--------|------------|-----|--------|------|-------|
| BCOR | Draft discussion | 2026-09-07 23:59 | 10 | discussion | |
| CSCI | Lab notes | 2026-09-08 17:00 | 5 | assignment | |
| COEN | Dinner RSVP | 2026-09-10 | | calendar | |

## Enrolled courses
"#;
        let items = parse_week_top3(md, 3);
        assert_eq!(items.len(), 3);
        assert_eq!(items[0].title, "BCOR: Draft discussion");
        assert_eq!(items[0].due, "2026-09-07 23:59");
        assert_eq!(items[2].id, "week-3");
    }

    #[test]
    fn focus_open_with_is_first_subtitle() {
        let md = r#"Updated: 2026-09-08
Open with: state the chain rule for sin(x^2); do not open notes
Format: worked_example

1. MATH — Chain rule set — due Thu — Check: state the rule
2. CSCI — Quiz 1 — due Fri — Check: close the notes
"#;
        let items = parse_focus_top3(md, 3);
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].title, "MATH — Chain rule set");
        assert_eq!(
            items[0].due,
            "state the chain rule for sin(x^2); do not open notes"
        );
        assert_eq!(items[1].title, "CSCI — Quiz 1");
        assert_eq!(items[1].due, "Fri");
        assert_eq!(items[0].id, "focus-1");
    }
}
