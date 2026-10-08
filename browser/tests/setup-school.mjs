// Tests run against a pinned curated tenant so date/time expectations are stable.
// Product code never assumes a school; see docs/architecture/school-personalization.md.
process.env.SCHOOL_SLUG ||= "cu-boulder";
