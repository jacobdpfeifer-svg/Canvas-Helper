// /go and /go/<placement>: where every QR code and NFC tag lands.
// A phone gets the hand-off to its Mac, a Mac gets the download, anything else
// gets the not-yet note. No backend: nothing here claims to have saved anything.
(function () {
  "use strict";

  var F = window.KairosFunnel;
  var CONFIG = window.KAIROS_CONFIG || {};
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var device = F.currentDevice(window);
  var slug = F.placementFromPath(window.location.pathname);
  var link = F.handoffUrl(window.location.origin, slug);

  function $(id) {
    return document.getElementById(id);
  }

  function say(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = "form-status" + (kind ? " " + kind : "");
  }

  function pickView() {
    var view = F.isHandheld(device) ? "handheld" : device === "mac" ? "mac" : "other";
    document.body.setAttribute("data-view", view);
    var other = $("other-link");
    if (other) other.href = link;
  }

  // ---- phone: send the link to the Mac ----

  function canShare() {
    if (!navigator.share) return false;
    if (navigator.canShare) {
      try {
        return navigator.canShare({ url: link });
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  function showLink() {
    var box = $("send-link");
    var input = $("send-link-input");
    if (!box || !input) return;
    input.value = link;
    box.hidden = false;
    input.focus();
    input.select();
  }

  function copyLink(status) {
    function fallback() {
      showLink();
      say(status, "Copy this link and send it to yourself.", "ok");
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(function () {
        say(status, "Link copied. Paste it into a message to yourself.", "ok");
      }, fallback);
    } else {
      fallback();
    }
  }

  function initSend() {
    var btn = $("send-btn");
    var status = $("send-status");
    if (!btn) return;
    var sharing = canShare();
    var help = $("send-help");
    if (!sharing) {
      btn.textContent = "Copy the link";
      if (help) help.textContent = "Paste it into a message to yourself, then open it on your Mac.";
    } else if (help && !/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)) {
      // AirDrop is Apple-only; the HTML copy assumes an iPhone.
      help.textContent = "Text it to yourself, email it, or save it to a note. It'll be waiting when you open your laptop.";
    }
    btn.addEventListener("click", function () {
      if (!sharing) {
        copyLink(status);
        return;
      }
      // Title and url only: with a text field, iOS "Copy" copies the text, not the link.
      navigator.share({ title: "Kairos", url: link }).then(
        function () {
          say(status, "Sent. Open it on your Mac when you get there.", "ok");
        },
        function (err) {
          if (err && err.name === "AbortError") return; // they closed the sheet
          copyLink(status);
        }
      );
    });
  }

  // ---- the forms: all mailto until a real endpoint exists ----

  function mailto(to, subject, body) {
    return "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  var INTENTS = {
    // To themselves: the link lands in their inbox, which is open on their Mac.
    self: function (email) {
      return {
        href: mailto(email, "Kairos for my Mac", "Open this on your Mac to get Kairos:\n" + link + "\n"),
        status: "Opening your email app. Hit send and the link will be waiting on your Mac.",
      };
    },
    early: function (email) {
      return {
        href: mailto(CONFIG.contactEmail, "Kairos beta: early access",
          "Please let me know when there's a spot in the Kairos Mac beta.\n\nMy email: " + email +
          "\nFound it through: " + (slug || "direct") + "\n"),
        status: "Opening your email app so you can send this. Nothing was sent yet.",
      };
    },
    waitlist: function (email) {
      return {
        href: mailto(CONFIG.contactEmail, "Kairos: tell me when it works on my computer",
          "Please tell me when Kairos runs on " + deviceName() + ".\n\nMy email: " + email +
          "\nFound it through: " + (slug || "direct") + "\n"),
        status: "Opening your email app so you can send this. Nothing was sent yet.",
      };
    },
  };

  function deviceName() {
    return { windows: "Windows", chromeos: "a Chromebook", linux: "Linux" }[device] || "my computer";
  }

  function initForms() {
    var forms = document.querySelectorAll("form[data-intent]");
    Array.prototype.forEach.call(forms, function (form) {
      var intent = INTENTS[form.getAttribute("data-intent")];
      var input = form.querySelector("input[type=email]");
      var status = form.querySelector(".form-status");
      if (!intent || !input) return;
      form.addEventListener("submit", function (evt) {
        evt.preventDefault();
        var email = (input.value || "").trim();
        if (!EMAIL.test(email)) {
          say(status, "That doesn't look like a full email address. Try again?", "err");
          input.focus();
          return;
        }
        if (!CONFIG.contactEmail && form.getAttribute("data-intent") !== "self") {
          say(status, "Sign-ups aren't open yet. Check back soon.", "err");
          return;
        }
        var result = intent(email);
        say(status, result.status, "ok");
        window.location.href = result.href;
      });
    });
  }

  // ---- Mac: the download, once it exists ----

  function initDownload() {
    if (!CONFIG.downloadUrl) return;
    var ready = $("dl-ready");
    var waiting = $("dl-waiting");
    var btn = $("dl-btn");
    var note = $("dl-note");
    if (!ready || !btn) return;
    btn.href = CONFIG.downloadUrl;
    if (note) note.textContent = CONFIG.downloadNote || "";
    ready.hidden = false;
    if (waiting) waiting.hidden = true;
  }

  pickView();
  initSend();
  initForms();
  initDownload();
})();
