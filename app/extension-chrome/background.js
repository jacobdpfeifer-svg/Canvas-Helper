/**
 * Chrome extension — sensors only.
 * Focus / tab-URL / "Canvas visible" events → Native Messaging → local daemon.
 * Never uses Canvas cookies for writes; daemon issues MCP tool calls.
 */

const NATIVE_HOST = "com.productname.daemon";

function isCanvasUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("instructure.com") ||
      u.hostname.includes("canvas.")
    );
  } catch {
    return false;
  }
}

function notifyDaemon(payload) {
  try {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, payload, (response) => {
      if (chrome.runtime.lastError) {
        console.debug("daemon unreachable", chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.debug("native messaging failed", e);
  }
}

chrome.tabs.onActivated.addListener(async (info) => {
  try {
    const tab = await chrome.tabs.get(info.tabId);
    if (tab.url && isCanvasUrl(tab.url)) {
      notifyDaemon({
        type: "canvas_focus",
        url: tab.url,
        ts: Date.now(),
      });
    }
  } catch {
    /* ignore */
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && isCanvasUrl(tab.url)) {
    notifyDaemon({
      type: "canvas_visible",
      url: tab.url,
      ts: Date.now(),
    });
  }
});
