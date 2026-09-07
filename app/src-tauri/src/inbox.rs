//! Parse `{user_root}/inbox/week.md` into Top-3 sticky items.
//!
//! Until `focus.md` exists, derive Top-3 from the due-window table (soonest
//! open rows already ordered by sync-week).

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

pub fn read_top3(limit: usize) -> Result<Vec<Top3Item>, String> {
    let path = week_md_path();
    if !path.is_file() {
        return Ok(Vec::new());
    }
    let md = fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    Ok(parse_week_top3(&md, limit))
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
}
