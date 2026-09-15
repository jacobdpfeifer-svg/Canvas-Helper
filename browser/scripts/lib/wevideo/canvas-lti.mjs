/**
 * Launch Canvas external_tool → WeVideo/PlayPosit player frame or page.
 */
import { isWeVideoUrl } from "./urls.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function findWeVideoFrame(page) {
  return page.frames().find((f) => isWeVideoUrl(f.url())) || null;
}

export function findWeVideoPage(context) {
  return context.pages().find((p) => isWeVideoUrl(p.url())) || null;
}

async function clickLaunchControls(page) {
  const selectors = [
    'a.btn[href*="external_tools"]',
    'a[href*="tool_launch"]',
    'a[href*="playposit.com"]',
    'a[href*="wevideo.com"]',
    'button:has-text("Load")',
    'a:has-text("Load")',
    'a:has-text("PlayPosit")',
    'a:has-text("WeVideo")',
    'button:has-text("Launch")',
    'a:has-text("this tool")',
    ".tool_content_wrapper a",
    "#tool_form input[type=submit]",
    "form#tool_form button",
    'button:has-text("Open")',
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) === 0) continue;
    try {
      await loc.click({ timeout: 2500 });
      await sleep(1500);
      return sel;
    } catch {
      /* try next */
    }
  }
  // Last resort: submit hidden LTI form if present
  try {
    const form = page.locator("form#tool_form, form.tool_form").first();
    if ((await form.count()) > 0) {
      await form.evaluate((f) => f.submit());
      await sleep(2000);
      return "form_submit";
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @returns {{ kind: 'frame'|'page', handle: import('playwright').Frame|import('playwright').Page, url: string }}
 */
export async function launchWeVideoPlayer(page, context, assignment, log) {
  const assignmentUrl = assignment.url;
  log?.event("goto_assignment", { url: assignmentUrl, newTab: assignment.newTab });

  const popupPromise = context
    .waitForEvent("page", { timeout: assignment.newTab ? 45_000 : 8_000 })
    .catch(() => null);

  await page.goto(assignmentUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await sleep(2000);

  // Direct tool_launch path (iframe embed)
  const toolLaunch = assignmentUrl.replace(/\/?$/, "") + "/tool_launch";
  if (!assignment.newTab) {
    // Many CU embeds load tool_launch iframe automatically; also try clicking Load
    await clickLaunchControls(page);
  } else {
    await clickLaunchControls(page);
  }

  let popup = await popupPromise;
  if (assignment.newTab && !popup) {
    // Retry: open tool_launch in new page manually if API says new_tab
    popup = await context.newPage();
    await popup.goto(toolLaunch, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => null);
  }

  // Wait for wevideo/playposit to appear in frames or pages
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const wvPage = findWeVideoPage(context);
    if (wvPage) {
      // Prefer player_v2 if redirected from playposit LTI
      try {
        await wvPage.waitForURL(/wevideo\.com|playposit\.com/i, { timeout: 15_000 });
      } catch {
        /* already there */
      }
      // Wait for interactive player if still on LTI bounce
      for (let i = 0; i < 30; i++) {
        if (/player_v2|interactive/i.test(wvPage.url())) break;
        const frame = findWeVideoFrame(wvPage) || findWeVideoFrame(page);
        if (frame && /player_v2|interactive/i.test(frame.url())) {
          log?.event("player_ready", { kind: "frame", url: frame.url() });
          return { kind: "frame", handle: frame, url: frame.url(), page: wvPage };
        }
        await sleep(1000);
      }
      const frameOnPopup = findWeVideoFrame(wvPage);
      if (frameOnPopup) {
        log?.event("player_ready", { kind: "frame", url: frameOnPopup.url() });
        return { kind: "frame", handle: frameOnPopup, url: frameOnPopup.url(), page: wvPage };
      }
      log?.event("player_ready", { kind: "page", url: wvPage.url() });
      return { kind: "page", handle: wvPage, url: wvPage.url(), page: wvPage };
    }

    const frame = findWeVideoFrame(page);
    if (frame) {
      log?.event("player_ready", { kind: "frame", url: frame.url() });
      return { kind: "frame", handle: frame, url: frame.url(), page };
    }

    // Navigate canvas page to tool_launch if still stuck
    if (!/tool_launch/i.test(page.url()) && Date.now() > deadline - 60_000) {
      await page.goto(toolLaunch, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    }

    await sleep(1500);
  }

  throw new Error(
    `WeVideo/PlayPosit player not found for ${assignment.name || assignmentUrl}. Not a WeVideo LTI or launch failed.`
  );
}

export function asLocatorRoot(player) {
  // Frame and Page both have locator/evaluate
  return player.handle;
}
