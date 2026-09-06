import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRsvpUrl,
  CG_EC_BASE,
  isCampusGroupsLoginUrl,
  isRsvpConfirmationUrl,
  majorMatches,
  parseEventIdFromUrl,
  parseMajorDinnersTable,
  parseSignupPreferences,
} from "../scripts/lib/campusgroups-session.mjs";

describe("isRsvpConfirmationUrl", () => {
  it("matches confirmation URL with event id", () => {
    assert.equal(
      isRsvpConfirmationUrl(
        "https://campusgroups.colorado.edu/engineeringconnections/confirmation?type=rsvp&type_id=385793",
        "385793"
      ),
      true
    );
  });

  it("rejects wrong event id", () => {
    assert.equal(
      isRsvpConfirmationUrl(
        "https://colorado.campusgroups.com/confirmation?type=rsvp&type_id=111",
        "385793"
      ),
      false
    );
  });
});

describe("parseEventIdFromUrl", () => {
  it("parses rsvp query param", () => {
    assert.equal(
      parseEventIdFromUrl("https://campusgroups.colorado.edu/engineeringconnections/rsvp_boot?id=385793"),
      "385793"
    );
  });

  it("parses cglink short URL", () => {
    assert.equal(parseEventIdFromUrl("https://cglink.me/2vs/r385793"), "385793");
  });
});

describe("buildRsvpUrl", () => {
  it("builds engineering connections RSVP URL", () => {
    assert.equal(
      buildRsvpUrl(385793),
      `${CG_EC_BASE}/rsvp_boot?id=385793`
    );
  });
});

describe("isCampusGroupsLoginUrl", () => {
  it("detects login and shibboleth URLs", () => {
    assert.equal(isCampusGroupsLoginUrl("https://campusgroups.colorado.edu/engineeringconnections/login"), true);
    assert.equal(isCampusGroupsLoginUrl("https://fedauth.colorado.edu/idp/profile/SAML2/Redirect/SSO"), true);
    assert.equal(isCampusGroupsLoginUrl("https://campusgroups.colorado.edu/engineeringconnections/home"), false);
  });
});

describe("parseMajorDinnersTable", () => {
  const md = `| Date | Slot | Major | RSVP ID | cglink |
|------|------|-------|---------|--------|
| 2026-08-26 | B | Computer Science | 385793 | cglink.me/2vs/r385793 |
| 2026-08-27 | A | Electrical Engineering | 385794 | cglink.me/2vs/r385794 |`;

  it("parses dinner rows", () => {
    const rows = parseMajorDinnersTable(md);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].rsvpId, "385793");
    assert.equal(rows[0].major, "Computer Science");
    assert.equal(rows[1].slot, "A");
  });
});

describe("majorMatches", () => {
  it("matches cs alias", () => {
    assert.equal(majorMatches("Computer Science", "cs"), true);
    assert.equal(majorMatches("Electrical Engineering", "cs"), false);
  });
});

describe("parseSignupPreferences", () => {
  it("reads major dinner defaults", () => {
    const md = `## Major dinner (COEN 1500)
- **Default preference:** Computer Science (software/startup alignment)
- **Status:** confirmed`;
    const prefs = parseSignupPreferences(md);
    assert.equal(prefs.majorDinnerDefault, "Computer Science (software/startup alignment)");
    assert.equal(prefs.majorDinnerStatus, "confirmed");
  });
});
