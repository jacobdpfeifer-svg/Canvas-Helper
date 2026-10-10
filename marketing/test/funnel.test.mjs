import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadFunnel } from "../lib/funnel.mjs";
import { validate } from "../make-codes.mjs";

const F = loadFunnel();

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.0.0 Mobile/15E148 Safari/604.1",
  // iPadOS Safari defaults to the desktop site and reports a Mac.
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
  androidPhone:
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
  chromebook:
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0",
};

test("phones scanning a code get the hand-off", () => {
  assert.equal(F.detectDevice({ ua: UA.iphoneSafari, maxTouchPoints: 5 }), "phone");
  assert.equal(F.detectDevice({ ua: UA.iphoneChrome, maxTouchPoints: 5 }), "phone");
  assert.equal(F.detectDevice({ ua: UA.androidPhone, maxTouchPoints: 5 }), "phone");
});

test("tablets, including an iPad pretending to be a Mac, are handheld", () => {
  assert.equal(F.detectDevice({ ua: UA.ipadDesktopMode, maxTouchPoints: 5 }), "tablet");
  assert.equal(F.detectDevice({ ua: UA.androidTablet, maxTouchPoints: 10 }), "tablet");
  assert.ok(F.isHandheld("tablet"));
  assert.ok(F.isHandheld("phone"));
});

test("a real Mac gets the download, other computers get the not-yet note", () => {
  assert.equal(F.detectDevice({ ua: UA.ipadDesktopMode, maxTouchPoints: 0 }), "mac");
  assert.equal(F.detectDevice({ ua: UA.macChrome, maxTouchPoints: 0 }), "mac");
  assert.equal(F.detectDevice({ ua: UA.windowsEdge, maxTouchPoints: 0 }), "windows");
  assert.equal(F.detectDevice({ ua: UA.chromebook, maxTouchPoints: 0 }), "chromeos");
  assert.equal(F.detectDevice({ ua: UA.linuxFirefox, maxTouchPoints: 0 }), "linux");
  assert.ok(!F.isHandheld("mac"));
});

test("UA client hints mark an unknown mobile browser as a phone", () => {
  assert.equal(F.detectDevice({ ua: "SomeBrowser/1.0", uaDataMobile: true }), "phone");
  assert.equal(F.detectDevice({ ua: "SomeBrowser/1.0" }), "other");
});

test("?as= previews another device, and ignores junk", () => {
  assert.equal(F.detectDevice({ ua: UA.macChrome, override: "phone" }), "phone");
  assert.equal(F.detectDevice({ ua: UA.macChrome, override: "<script>" }), "mac");
});

test("the placement comes from the path", () => {
  assert.equal(F.placementFromPath("/go/hoodie"), "hoodie");
  assert.equal(F.placementFromPath("/go/nfc-norlin-3/"), "nfc-norlin-3");
  assert.equal(F.placementFromPath("/go/HOODIE"), "hoodie");
  assert.equal(F.placementFromPath("/go"), null);
  assert.equal(F.placementFromPath("/go/"), null);
  assert.equal(F.placementFromPath("/go/a/b"), null);
  assert.equal(F.placementFromPath("/go/-bad"), null);
  assert.equal(F.placementFromPath("/go/%3Cscript%3E"), null);
  assert.equal(F.placementFromPath("/go/%E0%A4%A"), null);
  assert.equal(F.placementFromPath("/go/" + "a".repeat(41)), null);
});

test("the hand-off link keeps the placement so the Mac visit is counted with the scan", () => {
  assert.equal(F.handoffUrl("https://kairos.example", "hoodie"), "https://kairos.example/go/hoodie");
  assert.equal(F.handoffUrl("https://kairos.example/", null), "https://kairos.example/go");
});

test("placements.json is valid today, apart from the domain", () => {
  const config = JSON.parse(readFileSync(new URL("../placements.json", import.meta.url), "utf8"));
  const { errors } = validate(config);
  assert.deepEqual(errors.filter((e) => !e.startsWith("No domain yet")), []);
  for (const p of config.placements) assert.equal(F.placementFromPath(`/go/${p.slug}`), p.slug);
});

test("the generator refuses bad domains and duplicate slugs", () => {
  const ok = { placements: [{ slug: "hoodie", kind: "qr" }] };
  assert.match(validate(ok).errors[0], /No domain yet/);
  assert.deepEqual(validate(ok, "https://kairos.example").errors, []);
  assert.match(validate(ok, "http://kairos.example").errors.join(), /https/);
  assert.match(validate(ok, "https://kairos.example/go").errors.join(), /bare domain/);
  const dup = { placements: [{ slug: "a", kind: "qr" }, { slug: "a", kind: "nfc" }] };
  assert.match(validate(dup, "https://kairos.example").errors.join(), /twice/);
  assert.match(validate({ placements: [{ slug: "x", kind: "poster" }] }, "https://k.example").errors.join(), /kind/);
});
