/**
 * One-shot WeVideo/PlayPosit recon across BCOR, ONLINEEXP, FYE.
 * Writes inbox/courses/_raw/wevideo-recon-*.json (no cookies).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTH_DIR,
  BASE,
  COURSES_RAW_DIR,
  clearSingletonLocks,
  launchCanvasContext,
  requireLoggedIn,
} from "./lib/canvas-session.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(COURSES_RAW_DIR, "wevideo-recon.json");

const TARGETS = [
  {
    code: "BCOR1030",
    label: "VII PlayPosit Structure",
    url: "https://canvas.colorado.edu/courses/141523/assignments/2793023",
    courseId: 141523,
    assignmentId: 2793023,
  },
  {
    code: "ONLINEEXP",
    label: "Welcome and Introduction",
    url: "https://canvas.colorado.edu/courses/135245/assignments",
    courseId: 135245,
    listAssignments: true,
  },
  {
    code: "LEEDSFYE",
    label: "FYE course scan",
    url: "https://canvas.colorado.edu/courses/21463/assignments",
    courseId: 21463,
    listAssignments: true,
  },
];

function save(obj) {
  fs.mkdirSync(COURSES_RAW_DIR, { recursive: true });
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  } catch {
    /* first run */
  }
  const next = { ...prev, ...obj, savedAt: new Date().toISOString() };
  fs.writeFileSync(OUT, JSON.stringify(next, null, 2));
  console.log("saved", Object.keys(obj).join(", "));
}

async function apiGet(page, apiPath) {
  const res = await page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: "include" });
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { ok: r.ok, status: r.status, json, text: text.slice(0, 4000) };
  }, apiPath);
  return res;
}

async function listExternalAssignments(page, courseId) {
  const all = [];
  let pageNum = 1;
  for (;;) {
    const res = await apiGet(
      page,
      `/api/v1/courses/${courseId}/assignments?per_page=50&page=${pageNum}&include[]=external_tool_tag_attributes`
    );
    if (!res.ok || !Array.isArray(res.json)) break;
    all.push(...res.json);
    if (res.json.length < 50) break;
    pageNum += 1;
    if (pageNum > 20) break;
  }
  return all.map((a) => ({
    id: a.id,
    name: a.name,
    submission_types: a.submission_types,
    points: a.points_possible,
    url: a.html_url,
    external_tool_tag_attributes: a.external_tool_tag_attributes || null,
    external_tool_url: a.external_tool_tag_attributes?.url || null,
    isExternal: (a.submission_types || []).includes("external_tool"),
  }));
}

function summarizeFrames(page) {
  return page.frames().map((f) => ({
    url: f.url(),
    name: f.name(),
  }));
}

function isWeVideoUrl(u) {
  return /wevideo\.com|playposit\.com|api\/5\/(bulbs|lti)/i.test(u || "");
}

async function reconAssignment(page, context, target, assignmentUrl) {
  const network = [];
  const onResponse = async (res) => {
    const u = res.url();
    if (!/wevideo|playposit|lti|external_tools/i.test(u)) return;
    network.push({
      status: res.status(),
      url: u.slice(0, 300),
      contentType: res.headers()["content-type"] || "",
    });
  };
  page.on("response", onResponse);
  context.on("page", (p) => p.on("response", onResponse));

  await page.goto(assignmentUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(4000);

  // Try common Canvas external tool launch buttons / iframes
  const launchSelectors = [
    'a.btn[href*="external_tools"]',
    'button:has-text("Load")',
    'a:has-text("Load")',
    "#tool_content",
    'iframe#tool_content',
    'iframe[src*="wevideo"]',
    'iframe[src*="playposit"]',
    'a.external_tool_button',
    ".tool_launch",
  ];
  for (const sel of launchSelectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0) {
      try {
        await loc.click({ timeout: 2000 });
        await page.waitForTimeout(2500);
      } catch {
        /* ignore */
      }
    }
  }

  // Wait a bit for LTI iframe
  await page.waitForTimeout(5000);

  const frames = summarizeFrames(page);
  const wevideoFrames = frames.filter((f) => isWeVideoUrl(f.url));
  const popupUrls = context.pages().map((p) => p.url());

  let playerDom = null;
  let playerUrl = null;
  const playerPage =
    context.pages().find((p) => isWeVideoUrl(p.url())) ||
    (wevideoFrames.length ? page : null);

  if (wevideoFrames.length) {
    const frame = page.frames().find((f) => isWeVideoUrl(f.url()));
    if (frame) {
      playerUrl = frame.url();
      try {
        playerDom = await frame.evaluate(() => {
          const text = (document.body?.innerText || "").slice(0, 6000);
          const buttons = [...document.querySelectorAll("button, [role=button], a")]
            .slice(0, 40)
            .map((el) => ({
              tag: el.tagName,
              text: (el.innerText || el.getAttribute("aria-label") || "").slice(0, 80),
              cls: el.className?.toString?.().slice(0, 80) || "",
            }));
          const inputs = [...document.querySelectorAll("input, textarea, [contenteditable=true]")]
            .slice(0, 20)
            .map((el) => ({
              tag: el.tagName,
              type: el.getAttribute("type"),
              placeholder: el.getAttribute("placeholder"),
              cls: el.className?.toString?.().slice(0, 80) || "",
            }));
          return { title: document.title, text, buttons, inputs };
        });
      } catch (e) {
        playerDom = { error: String(e.message || e) };
      }
    }
  } else if (playerPage && playerPage !== page) {
    playerUrl = playerPage.url();
    try {
      playerDom = await playerPage.evaluate(() => ({
        title: document.title,
        text: (document.body?.innerText || "").slice(0, 6000),
      }));
    } catch (e) {
      playerDom = { error: String(e.message || e) };
    }
  }

  // Canvas page text for tool hints
  const canvasText = await page.evaluate(() =>
    (document.body?.innerText || "").slice(0, 3000)
  );
  const iframeSrcs = await page.evaluate(() =>
    [...document.querySelectorAll("iframe")].map((f) => f.src).filter(Boolean)
  );

  page.off("response", onResponse);

  return {
    assignmentUrl,
    pageUrl: page.url(),
    frames,
    wevideoFrames,
    popupUrls,
    iframeSrcs,
    playerUrl,
    playerDom,
    network: network.slice(0, 80),
    canvasTextPreview: canvasText.slice(0, 1500),
    detectedWeVideo: wevideoFrames.length > 0 || popupUrls.some(isWeVideoUrl) || iframeSrcs.some(isWeVideoUrl),
  };
}

clearSingletonLocks(AUTH_DIR);
const { context, page } = await launchCanvasContext({
  channel: "chrome",
  args: ["--disable-blink-features=AutomationControlled"],
});

try {
  await requireLoggedIn(page);
} catch (e) {
  console.error(String(e.message || e));
  save({ error: String(e.message || e), step: "login" });
  await context.close();
  process.exit(1);
}

const results = { step: "recon", targets: {} };

for (const t of TARGETS) {
  console.log("===", t.code, t.label);
  try {
    if (t.listAssignments) {
      const list = await listExternalAssignments(page, t.courseId);
      const external = list.filter((a) => a.isExternal);
      const wevideoish = external.filter(
        (a) =>
          isWeVideoUrl(a.external_tool_url || "") ||
          /playposit|wevideo|interactiv/i.test(a.name || "") ||
          /playposit|wevideo/i.test(JSON.stringify(a.external_tool_tag_attributes || {}))
      );
      results.targets[t.code] = {
        label: t.label,
        assignmentCount: list.length,
        externalCount: external.length,
        external: external.slice(0, 40),
        wevideoish,
      };
      save({ targets: results.targets });

      // Deep recon first external that looks like WeVideo, else first external
      const pick = wevideoish[0] || external[0];
      if (pick?.url) {
        console.log("deep recon", pick.name, pick.url);
        results.targets[t.code].deep = await reconAssignment(
          page,
          context,
          t,
          pick.url
        );
        save({ targets: results.targets });
      }
    } else {
      // Fetch assignment API meta
      const meta = await apiGet(
        page,
        `/api/v1/courses/${t.courseId}/assignments/${t.assignmentId}?include[]=external_tool_tag_attributes`
      );
      results.targets[t.code] = {
        label: t.label,
        api: meta.json
          ? {
              id: meta.json.id,
              name: meta.json.name,
              submission_types: meta.json.submission_types,
              external_tool_tag_attributes: meta.json.external_tool_tag_attributes,
            }
          : { status: meta.status, text: meta.text },
        deep: await reconAssignment(page, context, t, t.url),
      };
      save({ targets: results.targets });
    }
  } catch (e) {
    results.targets[t.code] = {
      label: t.label,
      error: String(e.message || e),
    };
    save({ targets: results.targets });
  }
}

save({ step: "recon-done", targets: results.targets });
console.log("done →", OUT);
await context.close();
