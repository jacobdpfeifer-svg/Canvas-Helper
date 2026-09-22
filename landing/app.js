// ProductName landing page — no build step, no framework, no backend.
(function () {
  "use strict";

  var THEME_KEY = "pn_site_theme";

  function readTheme() {
    try {
      var stored = localStorage.getItem(THEME_KEY);
      if (stored === "paper" || stored === "night") return stored;
    } catch (e) {
      /* per-viewer convenience only */
    }
    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    return prefersLight ? "paper" : "night";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    var buttons = document.querySelectorAll(".theme-toggle button");
    buttons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.theme === theme));
    });
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* ignore */
    }
  }

  function initTheme() {
    applyTheme(readTheme());
    document.querySelectorAll(".theme-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyTheme(btn.dataset.theme);
      });
    });
  }

  // Email capture: no backend exists yet. We are honest about that in the
  // UI copy. Submitting opens the visitor's own mail client addressed to
  // the maintainer, with the entered address in the body, so nothing is
  // silently dropped and nothing is faked as "connected."
  function initEmailForm() {
    var form = document.getElementById("waitlist-form");
    if (!form) return;
    var input = document.getElementById("waitlist-email");
    var status = document.getElementById("waitlist-status");

    form.addEventListener("submit", function (evt) {
      evt.preventDefault();
      var email = (input.value || "").trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        status.textContent = "That doesn't look like a full email address — try again.";
        status.className = "form-status err";
        input.focus();
        return;
      }
      var subject = encodeURIComponent("ProductName beta — notify me");
      var body = encodeURIComponent(
        "Please notify me when the ProductName macOS build is ready for testing.\n\nMy email: " + email + "\n"
      );
      var mailto = "mailto:jacobdpfeifer@gmail.com?subject=" + subject + "&body=" + body;
      status.textContent = "Opening your email app to send this to jacobdpfeifer@gmail.com — nothing was sent automatically.";
      status.className = "form-status ok";
      window.location.href = mailto;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initEmailForm();
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  });
})();
