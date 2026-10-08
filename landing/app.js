// Kairos landing page: no build step, no framework, no backend.
(function () {
  "use strict";

  // Margin notes and the marker swipe draw in once, when they scroll into view.
  // Without JS (or with reduced motion) they are simply shown.
  function initReveal() {
    var targets = document.querySelectorAll(".note, .mark");
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  // Email capture: there is no backend yet, and the copy says so. Submitting opens
  // the visitor's own mail client addressed to the maintainer with the address in
  // the body, so nothing is silently dropped and nothing pretends to be saved.
  function initEmailForm() {
    var form = document.getElementById("waitlist-form");
    if (!form) return;
    var input = document.getElementById("waitlist-email");
    var status = document.getElementById("waitlist-status");
    var path = document.getElementById("beta-path");

    document.querySelectorAll("[data-beta-path]").forEach(function (link) {
      link.addEventListener("click", function () {
        if (path) path.value = link.getAttribute("data-beta-path") || "mac";
        window.setTimeout(function () {
          input.focus();
        }, 0);
      });
    });

    form.addEventListener("submit", function (evt) {
      evt.preventDefault();
      var email = (input.value || "").trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        status.textContent = "That doesn't look like a full email address. Try again?";
        status.className = "form-status err";
        input.focus();
        return;
      }
      var wantsGithub = path && path.value === "github";
      var subject = encodeURIComponent(wantsGithub ? "Kairos beta: GitHub access" : "Kairos beta: early access");
      var body = encodeURIComponent(
        (wantsGithub
          ? "I'd like GitHub/source instructions for the Kairos beta."
          : "Please let me know when there's a spot in the Kairos Mac beta.") +
        "\n\nMy email: " + email + "\n"
      );
      var mailto = "mailto:jacobdpfeifer@gmail.com?subject=" + subject + "&body=" + body;
      status.textContent = "Opening your email app so you can send this. Nothing was sent yet.";
      status.className = "form-status ok";
      window.location.href = mailto;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initEmailForm();
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  });
})();
