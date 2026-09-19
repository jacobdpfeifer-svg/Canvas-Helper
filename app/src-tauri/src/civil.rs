//! Minimal calendar arithmetic (no chrono): ISO-8601 instants ↔ days, month
//! stepping for the Home range selector, YYYY-MM-DD keys for plan days.
//! Howard Hinnant's civil-date algorithms; UTC only. The renderer passes its
//! local "today" as a date string for read-only views, so no local-zone
//! resolution happens here.

pub const DAY_SECS: i64 = 86_400;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Date {
    pub y: i32,
    pub m: u32,
    pub d: u32,
}

pub fn days_from_civil(y: i32, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y } as i64;
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (m as i64 + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn civil_from_days(z: i64) -> Date {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    Date { y: (if m <= 2 { y + 1 } else { y }) as i32, m, d }
}

impl Date {
    pub fn parse(text: &str) -> Option<Date> {
        let t = text.trim();
        if t.len() < 10 {
            return None;
        }
        let y: i32 = t[0..4].parse().ok()?;
        let m: u32 = t[5..7].parse().ok()?;
        let d: u32 = t[8..10].parse().ok()?;
        if !(1..=12).contains(&m) || !(1..=31).contains(&d) || &t[4..5] != "-" || &t[7..8] != "-" {
            return None;
        }
        Some(Date { y, m, d })
    }

    pub fn days(self) -> i64 {
        days_from_civil(self.y, self.m, self.d)
    }

    pub fn add_days(self, n: i64) -> Date {
        civil_from_days(self.days() + n)
    }

    /// Same day-of-month `n` months later, clamped to that month's length.
    pub fn add_months(self, n: i32) -> Date {
        let total = self.y * 12 + (self.m as i32 - 1) + n;
        let y = total.div_euclid(12);
        let m = (total.rem_euclid(12) + 1) as u32;
        let d = self.d.min(days_in_month(y, m));
        Date { y, m, d }
    }

    pub fn iso(self) -> String {
        format!("{:04}-{:02}-{:02}", self.y, self.m, self.d)
    }

    /// Seconds since the epoch at 00:00:00Z.
    pub fn start_secs(self) -> i64 {
        self.days() * DAY_SECS
    }

    pub fn weekday_name(self) -> &'static str {
        // 1970-01-01 was a Thursday.
        const NAMES: [&str; 7] = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
        NAMES[self.days().rem_euclid(7) as usize]
    }
}

pub fn days_in_month(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        _ => {
            if (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 {
                29
            } else {
                28
            }
        }
    }
}

/// Parse an ISO-8601 instant ("2026-09-18T15:00:00Z", "…+00:00", "…-06:00",
/// fractional seconds allowed) to epoch seconds. Returns None on anything else.
pub fn parse_instant(text: &str) -> Option<i64> {
    let t = text.trim();
    let date = Date::parse(t)?;
    if t.len() == 10 {
        return Some(date.start_secs());
    }
    let rest = &t[10..];
    let rest = rest.strip_prefix('T').or_else(|| rest.strip_prefix(' '))?;
    let (clock, zone) = match rest.find(['Z', '+', '-']) {
        Some(i) => (&rest[..i], &rest[i..]),
        None => (rest, "Z"),
    };
    let mut parts = clock.split(':');
    let h: i64 = parts.next()?.parse().ok()?;
    let mi: i64 = parts.next()?.parse().ok()?;
    let s: i64 = parts
        .next()
        .map(|p| p.split('.').next().unwrap_or("0").parse().unwrap_or(0))
        .unwrap_or(0);
    let offset = if zone == "Z" {
        0
    } else {
        let sign = if zone.starts_with('-') { -1 } else { 1 };
        let z = &zone[1..];
        let zh: i64 = z.get(0..2)?.parse().ok()?;
        let zm: i64 = z.get(3..5).and_then(|v| v.parse().ok()).unwrap_or(0);
        sign * (zh * 3600 + zm * 60)
    };
    Some(date.start_secs() + h * 3600 + mi * 60 + s - offset)
}

pub fn iso_instant(secs: i64) -> String {
    let days = secs.div_euclid(DAY_SECS);
    let rem = secs.rem_euclid(DAY_SECS);
    let date = civil_from_days(days);
    format!("{}T{:02}:{:02}:{:02}Z", date.iso(), rem / 3600, (rem % 3600) / 60, rem % 60)
}

/// Today's UTC date — used only as a fallback when the renderer sends no date.
pub fn utc_today() -> Date {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    civil_from_days(secs.div_euclid(DAY_SECS))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn civil_round_trips_and_steps_months() {
        let d = Date::parse("2026-09-18").unwrap();
        assert_eq!(civil_from_days(d.days()), d);
        assert_eq!(d.add_months(1).iso(), "2026-10-18");
        assert_eq!(Date::parse("2026-01-31").unwrap().add_months(1).iso(), "2026-02-28");
        assert_eq!(Date::parse("2026-11-30").unwrap().add_months(3).iso(), "2027-02-28");
        assert_eq!(d.add_days(-7).iso(), "2026-09-11");
        assert_eq!(d.weekday_name(), "Fri");
    }

    #[test]
    fn instants_parse_with_zones() {
        assert_eq!(parse_instant("1970-01-02T00:00:00Z"), Some(DAY_SECS));
        assert_eq!(parse_instant("2026-09-18T15:00:00.000Z"), parse_instant("2026-09-18T09:00:00-06:00"));
        assert_eq!(parse_instant("2026-09-18"), Some(Date::parse("2026-09-18").unwrap().start_secs()));
        assert_eq!(parse_instant("nope"), None);
        assert_eq!(iso_instant(parse_instant("2026-12-15T16:00:00Z").unwrap()), "2026-12-15T16:00:00Z");
    }
}
