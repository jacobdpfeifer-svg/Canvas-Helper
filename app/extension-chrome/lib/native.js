/** Promise wrapper for the local ProductName native host (`com.productname.daemon`). */

export const NATIVE_HOST = "com.productname.daemon";

/**
 * @returns {Promise<{ ok: boolean, error?: string, [k: string]: any }>}
 *   `error: "host_missing"` when the desktop app's host is not installed.
 */
export function callHost(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(NATIVE_HOST, message, (reply) => {
        const err = chrome.runtime.lastError?.message;
        if (err) {
          resolve({ ok: false, error: /not found|forbidden|exited/i.test(err) ? "host_missing" : "host_error", detail: err });
          return;
        }
        resolve(reply && typeof reply === "object" ? reply : { ok: false, error: "empty_reply" });
      });
    } catch (e) {
      resolve({ ok: false, error: "host_error", detail: String(e?.message || e) });
    }
  });
}
