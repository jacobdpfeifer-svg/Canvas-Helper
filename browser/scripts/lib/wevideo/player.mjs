/**
 * WeVideo interactive player_v2 automation (Vuetify UI from recon).
 */
import { solveQuestion } from "./solver.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clickByText(root, texts, { exact = false } = {}) {
  for (const t of texts) {
    const loc = exact
      ? root.getByText(t, { exact: true })
      : root.getByRole("button", { name: new RegExp(t, "i") });
    if ((await loc.count()) > 0) {
      try {
        await loc.first().click({ timeout: 3000 });
        return t;
      } catch {
        /* try next */
      }
    }
    const loose = root.locator(`button:has-text("${t}"), [role=button]:has-text("${t}")`);
    if ((await loose.count()) > 0) {
      try {
        await loose.first().click({ timeout: 3000 });
        return t;
      } catch {
        /* continue */
      }
    }
  }
  return null;
}

/** Listen for WeVideo postMessage completion on the embedding page. */
export function attachCompletionWatcher(page, state) {
  if (!page || state._watchAttached) return;
  state._watchAttached = true;
  page.on("console", () => {});
  page
    .evaluate(() => {
      if (window.__wvCompleteWatch) return;
      window.__wvCompleteWatch = { completed: false, last: null };
      window.addEventListener("message", (event) => {
        try {
          if (!/wevideo\.com|playposit\.com/i.test(event.origin || "")) return;
          const message =
            typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (!message || !message.type) return;
          window.__wvCompleteWatch.last = message;
          if (
            message.type === "interactive_video_completed" ||
            message.data?.status === "completed"
          ) {
            window.__wvCompleteWatch.completed = true;
          }
        } catch {
          /* ignore */
        }
      });
    })
    .catch(() => {});
}

export async function postMessageCompleted(page) {
  if (!page) return false;
  try {
    return await page.evaluate(() => Boolean(window.__wvCompleteWatch?.completed));
  } catch {
    return false;
  }
}

export async function startPlayback(root, log) {
  const hit =
    (await clickByText(root, ["Start video playback", "Play", "Jump In"])) ||
    (await root.locator('button[aria-label*="Play" i], button:has-text("Start")').first().click({ timeout: 3000 }).then(() => "play").catch(() => null));
  log?.event("start_playback", { hit });
  // Try max speed if settings exist
  try {
    const settings = root.locator('button:has-text("Settings"), button[aria-label*="Settings" i]');
    if ((await settings.count()) > 0) {
      await settings.first().click({ timeout: 2000 });
      await sleep(400);
      const speed = root.getByText(/2x|1\.75x|1\.5x/i);
      if ((await speed.count()) > 0) await speed.first().click({ timeout: 2000 });
    }
  } catch {
    /* optional */
  }
  return hit;
}

export async function openTranscript(root) {
  try {
    const tab = root.getByText("Transcript", { exact: true });
    if ((await tab.count()) > 0) {
      await tab.first().click({ timeout: 2000 });
      await sleep(500);
    }
  } catch {
    /* ignore */
  }
  try {
    return await root.evaluate(() => {
      const body = document.body?.innerText || "";
      // Prefer a transcript panel if labeled
      const nodes = [...document.querySelectorAll("[class*='transcript'], [class*='Transcript']")];
      if (nodes.length) {
        return nodes.map((n) => n.innerText).join("\n").slice(0, 12000);
      }
      return body.slice(0, 8000);
    });
  } catch {
    return "";
  }
}

/**
 * Detect visible interaction overlay / dialog.
 */
export async function readInteraction(root) {
  return root.evaluate(() => {
    const dialogs = [
      ...document.querySelectorAll(
        '[role="dialog"], .v-dialog, .v-overlay--active, .interaction, [class*="Interaction"]'
      ),
    ].filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
    });

    const scope = dialogs[0] || null;
    const text = (scope || document.body).innerText || "";

    // Heuristic: interaction present if Submit enabled or question chrome visible
    const submitBtns = [...document.querySelectorAll("button")].filter((b) =>
      /^\s*Submit\s*$/i.test(b.innerText || "")
    );
    const enabledSubmit = submitBtns.find((b) => !b.disabled && !b.className.includes("v-btn--disabled"));
    const hasInteractionChrome =
      /multiple choice|check all|free response|fill.?in|poll|submit your|select all that apply/i.test(
        text
      ) || Boolean(enabledSubmit);

    if (!hasInteractionChrome && !scope) {
      const complete = /interactive video complete|assignment complete|you have completed/i.test(
        document.body?.innerText || ""
      );
      return { active: false, complete, type: null, stem: "", options: [] };
    }

    let type = "multiple_choice";
    if (/check all|select all that apply/i.test(text)) type = "check_all";
    else if (/free response|short answer|type your/i.test(text)) type = "free_response";
    else if (/\bpoll\b/i.test(text)) type = "poll";
    else if (/fill.?in.?the.?blank/i.test(text)) type = "fill_blank";

    const optionEls = [
      ...(scope || document).querySelectorAll(
        '[role="radio"], [role="checkbox"], .v-selection-control, .v-list-item, label'
      ),
    ];
    const options = [];
    const seen = new Set();
    for (const el of optionEls) {
      const t = (el.innerText || "").trim().replace(/\s+/g, " ");
      if (!t || t.length < 1 || t.length > 300) continue;
      if (/^submit$|^continue$|^retry$|^skip$/i.test(t)) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      options.push(t);
    }

    // Stem: first substantial paragraph in dialog
    let stem = "";
    const paras = (scope || document)
      .querySelectorAll("p, h1, h2, h3, h4, .question, [class*='question']");
    for (const p of paras) {
      const t = (p.innerText || "").trim();
      if (t.length > 20 && !/^submit$/i.test(t)) {
        stem = t;
        break;
      }
    }
    if (!stem) {
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      stem = lines.find((l) => l.length > 25 && !/^submit$/i.test(l)) || lines[0] || "";
    }

    return {
      active: true,
      complete: false,
      type,
      stem: stem.slice(0, 1000),
      options: options.slice(0, 12),
      hasEnabledSubmit: Boolean(enabledSubmit),
    };
  });
}

export async function applyAnswer(root, interaction, solution) {
  const indexes = solution.choiceIndexes || [];
  if (indexes.length && interaction.options?.length) {
    for (const idx of indexes) {
      const label = interaction.options[idx];
      if (!label) continue;
      // Click option by visible text
      const loc = root.getByText(label, { exact: false });
      if ((await loc.count()) > 0) {
        await loc.first().click({ timeout: 4000 }).catch(() => null);
        await sleep(300);
      }
    }
  }

  if (solution.text) {
    const input = root.locator(
      'textarea, input[type="text"], [contenteditable="true"], .ql-editor'
    );
    if ((await input.count()) > 0) {
      const el = input.first();
      await el.click({ timeout: 3000 }).catch(() => null);
      await el.fill(solution.text).catch(async () => {
        await el.pressSequentially(solution.text, { delay: 5 }).catch(() => null);
      });
    }
  }

  await sleep(400);
  const submitted = await clickByText(root, ["Submit"]);
  await sleep(1200);
  // Feedback then Continue / Next
  const cont = await clickByText(root, ["Continue", "Next", "OK", "Close"]);
  // Retry path if wrong + available
  return { submitted, cont };
}

export async function maybeRetry(root, log) {
  const retry = root.getByRole("button", { name: /retry/i });
  if ((await retry.count()) === 0) return false;
  try {
    await retry.first().click({ timeout: 2000 });
    log?.event("retry_clicked");
    return true;
  } catch {
    return false;
  }
}

export async function isComplete(root) {
  return root.evaluate(() => {
    const t = document.body?.innerText || "";
    return /interactive video complete|assignment complete|you finished|completed this interactive/i.test(
      t
    );
  });
}

export async function advancePlaylist(root, log) {
  const next = await clickByText(root, ["Next", "Finish"]);
  if (next) log?.event("playlist_next", { next });
  // PDF last page / 5s embeds: click through TOC green marks
  return Boolean(next);
}

/**
 * Full-auto loop until complete or timeout.
 */
export async function runPlayerLoop(player, { courseCode, log, maxMs = 45 * 60_000 } = {}) {
  const root = player.handle;
  const hostPage = player.page || null;
  const watchState = {};
  if (hostPage) attachCompletionWatcher(hostPage, watchState);
  const started = Date.now();
  await startPlayback(root, log);
  await sleep(2000);

  let transcript = await openTranscript(root);
  let answered = 0;
  let lastStem = "";
  let idleTicks = 0;

  while (Date.now() - started < maxMs) {
    if ((await isComplete(root)) || (await postMessageCompleted(hostPage))) {
      log?.event("complete_detected");
      return { status: "completed", answered };
    }

    const interaction = await readInteraction(root);
    if (interaction.complete) {
      log?.event("complete_detected", { via: "interaction_flag" });
      return { status: "completed", answered };
    }

    if (interaction.active && interaction.stem && interaction.stem !== lastStem) {
      idleTicks = 0;
      // Refresh transcript periodically
      if (answered % 3 === 0) {
        transcript = (await openTranscript(root)) || transcript;
      }
      const solution = await solveQuestion({
        type: interaction.type,
        stem: interaction.stem,
        options: interaction.options,
        transcript,
        courseCode,
      });
      log?.answer({
        stem: interaction.stem,
        type: interaction.type,
        options: interaction.options,
        solution,
      });
      const applied = await applyAnswer(root, interaction, solution);
      answered += 1;
      lastStem = interaction.stem;

      // If still showing same interaction with Retry, try once more with flipped heuristic
      if (await maybeRetry(root, log)) {
        const again = await readInteraction(root);
        if (again.active) {
          const alt = await solveQuestion({
            ...again,
            transcript: `${transcript}\nFEEDBACK: previous answer incorrect`,
            courseCode,
          });
          // Prefer second-best for MC
          if (alt.choiceIndexes?.length === 1 && interaction.options?.length > 1) {
            const prev = solution.choiceIndexes?.[0];
            const nextIdx = [...Array(interaction.options.length).keys()].find((i) => i !== prev) ?? 0;
            alt.choiceIndexes = [nextIdx];
            alt.rationale = `retry alternate index ${nextIdx}`;
          }
          log?.answer({ stem: again.stem, type: again.type, solution: alt, retry: true });
          await applyAnswer(root, again, alt);
        }
      }

      log?.event("answered", { n: answered, submitted: applied.submitted });
      await sleep(800);
      continue;
    }

    // Keep playing / advance playlist if stuck
    idleTicks += 1;
    if (idleTicks % 8 === 0) {
      await startPlayback(root, log);
      await advancePlaylist(root, log);
    }
    await sleep(1500);
  }

  return { status: "timeout", answered };
}
