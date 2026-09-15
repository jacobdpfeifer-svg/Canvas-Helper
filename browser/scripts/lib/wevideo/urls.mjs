/**
 * WeVideo / PlayPosit URL helpers (CU still launches via playposit.com → wevideo.com).
 */

export const WEVIDEO_HOST_RE =
  /(?:^|\.)(?:wevideo\.com|playposit\.com)(?:\/|$)/i;

export const WEVIDEO_LAUNCH_RE =
  /wevideo\.com|playposit\.com|interactivityRedirect|\/api\/5\/(?:bulbs|lti)|player_v2/i;

export function isWeVideoUrl(url) {
  if (!url) return false;
  return WEVIDEO_LAUNCH_RE.test(String(url));
}

export function isWeVideoToolAttrs(attrs) {
  if (!attrs) return false;
  const blob = JSON.stringify(attrs);
  return isWeVideoUrl(attrs.url) || isWeVideoUrl(blob);
}

/** Known Canvas course ids for discovery defaults. */
export const WEVIDEO_COURSE_IDS = {
  BCOR1030: 141523,
  ONLINEEXP: 135245,
  LEEDSFYE: 21463,
};

export function courseCodeFromCanvasUrl(url) {
  const m = String(url || "").match(/courses\/(\d+)/);
  if (!m) return null;
  const id = Number(m[1]);
  for (const [code, cid] of Object.entries(WEVIDEO_COURSE_IDS)) {
    if (cid === id) return code;
  }
  return null;
}
