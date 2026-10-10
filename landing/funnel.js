// Kairos landing: which device is this, and which QR code or NFC tag brought it here.
// Pure functions, no DOM. A plain script (no module system) so the pages load it
// as window.KairosFunnel and marketing/ loads the same file in a Node sandbox.
(function (root) {
  "use strict";

  // A placement slug names one physical thing: a hoodie, a tag, a flyer.
  // marketing/make-codes.mjs enforces the same pattern when it prints codes.
  var SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

  // The slug lives in the path (/go/hoodie-01), not a query string, because the
  // free Vercel Web Analytics tier reports paths and device type but not query
  // parameters or custom events.
  function placementFromPath(pathname) {
    var m = /^\/go\/([^/?#]+)\/?$/.exec(pathname || "");
    if (!m) return null;
    var slug = decodeURIComponentSafe(m[1]).toLowerCase();
    return SLUG.test(slug) ? slug : null;
  }

  function decodeURIComponentSafe(s) {
    try {
      return decodeURIComponent(s);
    } catch (e) {
      return "";
    }
  }

  // What the visitor is holding. "phone" and "tablet" get the hand-off to a Mac;
  // "mac" gets the download; anything else gets the not-yet note.
  // info: { ua, maxTouchPoints, uaDataMobile, override }
  function detectDevice(info) {
    var ua = (info && info.ua) || "";
    var override = info && info.override;
    if (override && /^(phone|tablet|mac|windows|chromeos|linux|other)$/.test(override)) {
      return override;
    }
    if (/iPhone|iPod/.test(ua)) return "phone";
    if (/iPad/.test(ua)) return "tablet";
    // iPadOS Safari asks for the desktop site and reports itself as a Mac.
    // Real Macs have no touch points.
    if (/Macintosh/.test(ua) && info && info.maxTouchPoints > 1) return "tablet";
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? "phone" : "tablet";
    if (info && info.uaDataMobile === true) return "phone";
    if (/CrOS/.test(ua)) return "chromeos";
    if (/Windows/.test(ua)) return "windows";
    if (/Macintosh|Mac OS X/.test(ua)) return "mac";
    if (/Linux/.test(ua)) return "linux";
    return "other";
  }

  function isHandheld(kind) {
    return kind === "phone" || kind === "tablet";
  }

  // Reads the live browser. `?as=phone` (or mac, windows...) previews another
  // device's version of the page from a laptop.
  function currentDevice(win) {
    var nav = win.navigator || {};
    var override = null;
    try {
      override = new URLSearchParams(win.location.search).get("as");
    } catch (e) {
      override = null;
    }
    return detectDevice({
      ua: nav.userAgent || "",
      maxTouchPoints: nav.maxTouchPoints || 0,
      uaDataMobile: nav.userAgentData ? nav.userAgentData.mobile : undefined,
      override: override,
    });
  }

  // The link a phone sends to its Mac. It keeps the placement path, so the Mac
  // visit shows up on the same analytics row as the scan, as a desktop view.
  function handoffUrl(origin, slug) {
    return origin.replace(/\/$/, "") + (slug ? "/go/" + slug : "/go");
  }

  var api = {
    SLUG: SLUG,
    placementFromPath: placementFromPath,
    detectDevice: detectDevice,
    isHandheld: isHandheld,
    currentDevice: currentDevice,
    handoffUrl: handoffUrl,
  };

  root.KairosFunnel = api;
})(typeof window !== "undefined" ? window : globalThis);
