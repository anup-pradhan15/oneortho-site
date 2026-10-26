/* OneOrtho Patient Concierge widget — vanilla JS, no dependencies (2026-10-26) */
(function () {
  "use strict";
  var PHONE_DISPLAY = "(972) 457-1530";
  var PHONE_TEL = "tel:+19724571530";

  var EMBLEM =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22.5" fill="none" stroke="#8494A1" stroke-width="1.6"/>' +
    '<path d="M14 16.5c0-1.9 1.6-3.5 3.5-3.5h13c1.9 0 3.5 1.6 3.5 3.5v9c0 1.9-1.6 3.5-3.5 3.5H22l-5.4 4.6c-.5.4-1.3.1-1.3-.6V16.5z" fill="#fff"/>' +
    '<circle cx="19.5" cy="21" r="1.7" fill="#0B1B2B"/><circle cx="24" cy="21" r="1.7" fill="#0B1B2B"/><circle cx="28.5" cy="21" r="1.7" fill="#0B1B2B"/></svg>';

  var root = document.createElement("div");
  root.id = "oo-concierge";
  root.innerHTML =
    '<div class="oo-teaser" id="ooTeaser">' +
      '<div class="oo-greet">' +
        '<button class="oo-greet-x" id="ooGreetX" aria-label="Dismiss greeting">&times;</button>' +
        '<div class="oo-greet-head"><div class="oo-avatar">' + EMBLEM + "</div>" +
        "<div><h4>Hi there. Welcome to OneOrtho \u2014 how can we help you today?</h4>" +
        "<p>Patient Concierge \u00B7 Online now</p></div></div>" +
      "</div>" +
      '<button class="oo-pill" data-intent="schedule">Can I schedule an appointment?</button>' +
      '<button class="oo-pill" data-intent="second">Need a surgical second opinion?</button>' +
      '<button class="oo-pill" data-intent="insurance">Do you accept my insurance?</button>' +
      '<button class="oo-pill" data-intent="location">Where are you located &amp; what do you treat?</button>' +
    "</div>" +
    '<div class="oo-drawer" id="ooDrawer" role="dialog" aria-label="Patient Concierge chat">' +
      '<div class="oo-drawer-head"><div class="oo-avatar">' + EMBLEM + "</div>" +
        '<div><div class="oo-drawer-title">Patient Concierge</div>' +
        '<div class="oo-drawer-sub"><span class="oo-online">\u25CF</span> Online now \u00B7 OneOrtho</div></div>' +
        '<button class="oo-drawer-x" id="ooDrawerX" aria-label="Close chat">&times;</button></div>' +
      '<div class="oo-msgs" id="ooMsgs"></div>' +
      '<div class="oo-inputrow"><form class="oo-inputwrap" id="ooInputForm">' +
        '<input type="text" id="ooInput" placeholder="Type your question\u2026" autocomplete="off" aria-label="Type your question">' +
        '<button class="oo-send" type="submit">Send</button></form>' +
        '<p class="oo-note">For your privacy, please do not share sensitive medical records in chat.</p></div>' +
    "</div>" +
    '<button class="oo-launcher" id="ooLauncher" aria-label="Open Patient Concierge chat">' + EMBLEM +
      '<span class="oo-badge" id="ooBadge">1</span></button>';

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    document.body.appendChild(root);
    var teaser = document.getElementById("ooTeaser");
    var drawer = document.getElementById("ooDrawer");
    var msgs = document.getElementById("ooMsgs");
    var badge = document.getElementById("ooBadge");
    var greeted = false;

    function scrollDown() { msgs.scrollTop = msgs.scrollHeight; }
    function addMsg(text, who) {
      var d = document.createElement("div");
      d.className = "oo-msg " + who;
      d.textContent = text;
      msgs.appendChild(d); scrollDown();
      return d;
    }
    function addActions(items) {
      var wrap = document.createElement("div");
      wrap.className = "oo-actions";
      items.forEach(function (it) {
        var el;
        if (it.href) {
          el = document.createElement("a");
          el.href = it.href; el.className = "oo-btn" + (it.ghost ? " ghost" : "");
          el.textContent = it.label;
        } else {
          el = document.createElement("button");
          el.className = "oo-btn" + (it.ghost ? " ghost" : "");
          el.textContent = it.label;
          el.addEventListener("click", it.onClick);
        }
        wrap.appendChild(el);
      });
      msgs.appendChild(wrap); scrollDown();
    }
    function intakeLink(e) {
      var onHome = /^\/(index\.html)?$/.test(window.location.pathname);
      if (onHome) {
        e.preventDefault(); closeDrawer();
        var t = document.getElementById("intake");
        if (t) t.scrollIntoView({ behavior: "smooth" });
      }
    }

    function scheduleForm() {
      var form = document.createElement("form");
      form.className = "oo-form";
      form.innerHTML =
        '<div><label for="ooFName">Name</label><input id="ooFName" name="name" type="text" required autocomplete="name"></div>' +
        '<div><label for="ooFPhone">Mobile Phone</label><input id="ooFPhone" name="phone" type="tel" required autocomplete="tel"></div>' +
        '<div><label for="ooFJoint">Joint</label><select id="ooFJoint" name="interest" required>' +
        '<option value="" selected>Select\u2026</option><option value="knee">Knee</option><option value="hip">Hip</option><option value="shoulder">Shoulder</option></select></div>' +
        '<div><label for="ooFDay">Preferred Day</label><select id="ooFDay" name="day">' +
        '<option value="First available" selected>First available</option><option value="Today">Today</option><option value="Tomorrow">Tomorrow</option><option value="This week">This week</option><option value="Next week">Next week</option></select></div>' +
        '<button class="oo-btn" type="submit">Request My Appointment</button>';
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var name = document.getElementById("ooFName").value.trim();
        var phone = document.getElementById("ooFPhone").value.trim();
        var joint = document.getElementById("ooFJoint").value;
        var day = document.getElementById("ooFDay").value;
        var btn = form.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Sending\u2026";
        var body = new URLSearchParams();
        body.append("form-name", "appointment-request");
        body.append("name", name);
        body.append("phone", phone);
        body.append("interest", joint);
        body.append("message", "Patient Concierge chat request. Preferred day: " + day + ".");
        body.append("source", "Patient Concierge widget");
        body.append("bot-field", "");
        fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
          .then(function (r) {
            if (!r.ok) throw new Error("submit failed");
            form.remove();
            addMsg("Thanks, " + name.split(" ")[0] + " \u2014 your request is in. Our intake desk will call " + phone + " shortly to confirm your time.", "bot");
            addActions([{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }]);
          })
          .catch(function () {
            btn.disabled = false; btn.textContent = "Request My Appointment";
            addMsg("That didn\u2019t go through \u2014 please call us at " + PHONE_DISPLAY + " and we\u2019ll book you right away.", "bot");
          });
      });
      msgs.appendChild(form); scrollDown();
      var first = document.getElementById("ooFName");
      if (first) first.focus({ preventScroll: true });
    }

    var FLOWS = {
      schedule: function () {
        addMsg("We offer same-day and next-day specialist evaluations in North Texas. Would you like to request a time right here or call our intake desk?", "bot");
        scheduleForm();
        addActions([{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }]);
      },
      second: function () {
        addMsg("Told you need knee, hip, or shoulder surgery? We review your existing MRI/X-rays directly and give you a clear, honest surgical vs. non-surgical plan within 48 hours.", "bot");
        addActions([
          { label: "Start Second Opinion Request", href: "/second-opinion" },
          { label: "Ask a Question", ghost: true, onClick: function () { document.getElementById("ooInput").focus(); } }
        ]);
      },
      insurance: function () {
        addMsg("We accept Medicare and major commercial insurance plans, and our team verifies your exact coverage before your visit so there are no surprises.", "bot");
        addActions([{ label: "Verify My Coverage & Book", href: "/#intake", onClick: null, _link: true }].map(function (b) {
          return { label: b.label, href: b.href };
        }));
        var links = msgs.querySelectorAll(".oo-actions a");
        var last = links[links.length - 1];
        if (last) last.addEventListener("click", intakeLink);
      },
      location: function () {
        addMsg("We specialize in advanced outpatient knee, hip, and shoulder care across North Texas (Dallas \u00B7 Plano \u00B7 Frisco corridor). Our flagship Dallas clinic is at 12222 N Central Expy, Suite 130.", "bot");
        addActions([
          { label: "Knee Care", href: "/knee", ghost: true },
          { label: "Hip Care", href: "/hip", ghost: true },
          { label: "Shoulder Care", href: "/shoulder", ghost: true },
          { label: "Book Consult", href: "/#intake" }
        ]);
        var links = msgs.querySelectorAll(".oo-actions a");
        var last = links[links.length - 1];
        if (last) last.addEventListener("click", intakeLink);
      }
    };

    function openDrawer(intent) {
      teaser.classList.remove("show");
      drawer.classList.add("open");
      badge.style.display = "none";
      try { localStorage.setItem("ooConciergeSeen", "1"); } catch (e) {}
      if (!greeted) {
        greeted = true;
        addMsg("Hi there. Welcome to OneOrtho \u2014 how can we help you today?", "bot");
      }
      if (intent && FLOWS[intent]) FLOWS[intent]();
    }
    function closeDrawer() { drawer.classList.remove("open"); }

    document.getElementById("ooLauncher").addEventListener("click", function () {
      if (drawer.classList.contains("open")) closeDrawer(); else openDrawer(null);
    });
    document.getElementById("ooDrawerX").addEventListener("click", closeDrawer);
    document.getElementById("ooGreetX").addEventListener("click", function () {
      teaser.classList.remove("show");
      try { localStorage.setItem("ooConciergeSeen", "1"); } catch (e) {}
    });
    root.querySelectorAll(".oo-pill").forEach(function (p) {
      p.addEventListener("click", function () { openDrawer(p.getAttribute("data-intent")); });
    });
    document.querySelector(".oo-greet").addEventListener("click", function (e) {
      if (e.target.id !== "ooGreetX") openDrawer(null);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

    document.getElementById("ooInputForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var input = document.getElementById("ooInput");
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMsg(text, "user");
      addMsg("Thanks for reaching out. For the fastest answer, call us at " + PHONE_DISPLAY + " \u2014 or pick a path below and we\u2019ll take it from there.", "bot");
      addActions([
        { label: "Schedule an Appointment", onClick: function () { FLOWS.schedule(); } },
        { label: "Second Opinion", ghost: true, onClick: function () { FLOWS.second(); } },
        { label: "Insurance", ghost: true, onClick: function () { FLOWS.insurance(); } }
      ]);
    });

    var seen = false;
    try { seen = !!localStorage.getItem("ooConciergeSeen"); } catch (e) {}
    if (!seen) {
      setTimeout(function () {
        if (!drawer.classList.contains("open")) teaser.classList.add("show");
      }, 2500);
    } else {
      badge.style.display = "none";
    }
  });
})();
