/* OneOrtho Patient Concierge widget v2 — vanilla JS, no dependencies (2026-10-26)
   ============================================================================
   KNOWLEDGE BASE: every answer the concierge can give lives in the KB array
   below. To change an answer, edit the `reply` text. To teach it a new
   question, add patterns (regular expressions, lowercase) to an intent.
   Intents are checked in order — first match wins. Anything unmatched gets
   the FALLBACK response (routes to a human path: call or booking).
   Guardrails: the concierge never diagnoses, never advises on treatment for
   a specific person, and never promises individual coverage or pricing
   beyond the published Self-Pay Fee Schedule. Emergencies route to 911.
   ========================================================================== */
(function () {
  "use strict";
  var PHONE_DISPLAY = "(972) 457-1530";
  var PHONE_TEL = "tel:+19724571530";
  var ADDRESS = "12222 N Central Expy, Suite 130, Dallas, TX 75243";

  var FLOWS; // defined after KB (schedule/second/insurance/location are flows, not just answers)

  var KB = [
    {
      id: "emergency",
      patterns: [/emergency/, /911/, /chest pain/, /can'?t breathe|trouble breathing/, /heavy bleeding|won'?t stop bleeding/, /suicid/],
      reply: "If this is a medical emergency, call 911 now. If you are a patient with an urgent concern, call our office at " + PHONE_DISPLAY + " and we will route you to the care team right away.",
      actions: [{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL }]
    },
    {
      id: "diagnosis",
      patterns: [/diagnos/, /what'?s wrong with/, /should i (have|get) surgery/, /do i need surgery/, /(my )?(knee|hip|shoulder|joint) (hurts|aches|pain)/, /is it normal (to|that)/, /symptom/],
      reply: "I can't assess symptoms or medical questions in chat — that takes an in-person evaluation with imaging. The fastest route is a specialist evaluation, and we offer same-day and next-day appointments. Want me to start a request?",
      actions: [{ label: "Start Appointment Request", intent: "schedule" }, { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }]
    },
    {
      id: "schedule",
      patterns: [/schedul/, /book/, /appointment/, /\bappt\b/, /see (a|the|dr|doctor)/, /consult/, /visit/, /come in/, /make an? (appt|appointment)/, /reschedul/, /cancel/],
      flow: "schedule"
    },
    {
      id: "second",
      patterns: [/second opinion/, /another opinion/, /told (i|me|you) need surgery/, /review my (mri|x-?ray|scan|imaging)/, /already (saw|seen|have) a (doctor|surgeon)/],
      flow: "second"
    },
    {
      id: "insurance",
      patterns: [/insurance/, /in[- ]?network/, /accept/, /coverage/, /cover(ed)? (my|me|this)/, /bcbs|blue ?cross|aetna|cigna|united ?health|humana/, /medicare/, /\bppo\b|\bhmo\b/, /verify/],
      flow: "insurance"
    },
    {
      id: "cost",
      patterns: [/cost/, /price|pricing/, /self[- ]?pay/, /\bcash\b/, /how much/, /fee schedule/, /afford/, /payment plan/, /financ/],
      reply: "Two ways to pay: most patients use insurance or Medicare, and we verify your exact coverage before your visit. Prefer self-pay? Our published Self-Pay Fee Schedule lists flat rates — a new patient evaluation is $249. No surprise bills, ever.",
      actions: [{ label: "See Self-Pay Fee Schedule", href: "/cash-prices" }, { label: "Verify My Coverage", intent: "insurance", ghost: true }]
    },
    {
      id: "location",
      patterns: [/where/, /located/, /location/, /address/, /directions?/, /parking/, /map/, /which (city|office)/, /dallas|plano|frisco/],
      flow: "location"
    },
    {
      id: "hours",
      patterns: [/hours?/, /when (are|do) you (open|close)/, /open (now|on)/, /weekend/, /saturday|sunday/],
      reply: "Our Dallas clinic is open Monday through Friday, 8:00 AM to 5:00 PM. Consults can be requested online anytime — we confirm your exact time by phone.",
      actions: [{ label: "Request an Appointment", intent: "schedule" }, { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }]
    },
    {
      id: "portal",
      patterns: [/portal/, /healow/, /log ?in|sign ?in/, /my (records?|results?|chart)/, /test results?/, /medical records?/],
      reply: "Your records, results, and secure messaging live in the Healow Patient Portal. It opens in a new tab — you can also reach it anytime from the Patient Portal button at the top of this site.",
      actions: [{ label: "Open Patient Portal", href: "https://health.healow.com/OneOrtho", external: true }]
    },
    {
      id: "doctor",
      patterns: [/pradhan/, /who (is|will|would)/, /doctor|surgeon/, /credentials?/, /experience/, /best doctor/, /board[- ]certified/, /trained|training/],
      reply: "Your surgeon is Anup Pradhan, MD — board-certified, Vanderbilt MD and residency, Duke fellowship, and former Chair of Orthopedics at Medical City Dallas. He has been named a D Magazine Best Doctor seven years in a row (2020–2026).",
      actions: [{ label: "About Dr. Pradhan", href: "/about" }, { label: "Book a Consult", intent: "schedule", ghost: true }]
    },
    {
      id: "prepare",
      patterns: [/bring/, /first visit/, /prepare|preparation/, /paperwork/, /intake/, /what (do|should) i (do|bring|expect)/, /before my (visit|appointment|surgery)/],
      reply: "For a first visit, bring your insurance card, a photo ID, and any prior imaging (MRI or X-rays) — reports are fine if you don't have the images. You can also complete your intake forms online before you arrive, which speeds everything up.",
      actions: [{ label: "Complete Intake Forms", href: "/#intake", intake: true }, { label: "Book a Consult", intent: "schedule", ghost: true }]
    },
    {
      id: "recovery",
      patterns: [/recover/, /outpatient/, /same[- ]day/, /\basc\b|surgery center/, /physical therapy|\bpt\b|rehab/, /how (long|soon) (until|before|to) (i )?(walk|recover|back)/, /hospital stay/],
      reply: "Most of our joint replacements are outpatient — surgery at an advanced surgery center, home the same day, walking the same day. Recovery is structured: you leave with a clear plan, scheduled follow-ups, and a team that tracks your progress.",
      actions: [{ label: "Book a Consult", intent: "schedule" }, { label: "Second Opinion", intent: "second", ghost: true }]
    },
    {
      id: "knee",
      patterns: [/knee/, /meniscus/, /\bacl\b/, /cartilage/],
      reply: "Our knee care covers reconstruction and joint preservation through to full replacement — the goal is the least invasive option that actually fixes the problem. Explore knee care, or start with an evaluation.",
      actions: [{ label: "Knee Care", href: "/knee" }, { label: "Book an Evaluation", intent: "schedule", ghost: true }]
    },
    {
      id: "hip",
      patterns: [/\bhip\b/, /groin pain/],
      reply: "Our hip care centers on the anterior, muscle-sparing approach to replacement — most patients are home the same day. Explore hip care, or start with an evaluation.",
      actions: [{ label: "Hip Care", href: "/hip" }, { label: "Book an Evaluation", intent: "schedule", ghost: true }]
    },
    {
      id: "shoulder",
      patterns: [/shoulder/, /rotator cuff/, /labrum|labral/],
      reply: "Our shoulder care runs from rotator cuff repair to total shoulder replacement, with preservation options first when they can work. Explore shoulder care, or start with an evaluation.",
      actions: [{ label: "Shoulder Care", href: "/shoulder" }, { label: "Book an Evaluation", intent: "schedule", ghost: true }]
    },
    {
      id: "human",
      patterns: [/human/, /real person/, /someone (real|live)/, /speak|talk (to|with)/, /phone|call (me|you|us)/, /contact/],
      reply: "Of course — our intake desk answers Monday through Friday, 8:00 AM to 5:00 PM at " + PHONE_DISPLAY + ". Or leave your number in an appointment request and we'll call you.",
      actions: [{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL }, { label: "Request a Callback", intent: "schedule", ghost: true }]
    },
    {
      id: "greeting",
      patterns: [/^(hi|hey|hello|good (morning|afternoon|evening)|yo)\b/],
      reply: "Hello — welcome to OneOrtho. I can help you schedule an appointment, start a second opinion, verify insurance, or answer questions about our care. What would you like to do?",
      actions: [{ label: "Schedule", intent: "schedule" }, { label: "Second Opinion", intent: "second", ghost: true }, { label: "Insurance", intent: "insurance", ghost: true }, { label: "Location & Hours", intent: "location", ghost: true }]
    },
    {
      id: "thanks",
      patterns: [/thank/, /thanks/, /great|awesome|perfect|that helps/],
      reply: "You're welcome. Anything else I can help with — scheduling, insurance, or directions?",
      actions: [{ label: "Schedule", intent: "schedule" }, { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }]
    }
  ];

  var FALLBACK = {
    reply: "I want to make sure you get an exact answer. I can help right away with scheduling, second opinions, insurance verification, costs, and locations — or our team can help directly at " + PHONE_DISPLAY + ".",
    actions: [
      { label: "Schedule an Appointment", intent: "schedule" },
      { label: "Second Opinion", intent: "second", ghost: true },
      { label: "Insurance", intent: "insurance", ghost: true },
      { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }
    ]
  };

  var EMBLEM =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22.5" fill="none" stroke="#8494A1" stroke-width="1.6"/>' +
    '<path d="M14 16.5c0-1.9 1.6-3.5 3.5-3.5h13c1.9 0 3.5 1.6 3.5 3.5v9c0 1.9-1.6 3.5-3.5 3.5H22l-5.4 4.6c-.5.4-1.3.1-1.3-.6V16.5z" fill="#fff"/>' +
    '<circle cx="19.5" cy="21" r="1.7" fill="#0B1B2B"/><circle cx="24" cy="21" r="1.7" fill="#0B1B2B"/><circle cx="28.5" cy="21" r="1.7" fill="#0B1B2B"/></svg>';
  var SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#0B1B2B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5M5.5 11.5L12 5l6.5 6.5"/></svg>';

  var root = document.createElement("div");
  root.id = "oo-concierge";
  root.innerHTML =
    '<div class="oo-teaser" id="ooTeaser">' +
      '<div class="oo-greet" id="ooGreet">' +
        '<button class="oo-greet-x" id="ooGreetX" aria-label="Dismiss greeting">&times;</button>' +
        '<div class="oo-greet-head"><div class="oo-avatar">' + EMBLEM + "</div>" +
        "<div><h4>Hi there. Welcome to OneOrtho \u2014 how can we help you today?</h4>" +
        '<p><span class="oo-dot"></span>Patient Concierge \u00B7 Online now</p></div></div>' +
      "</div>" +
      '<button class="oo-pill" data-intent="schedule">Can I schedule an appointment?</button>' +
      '<button class="oo-pill" data-intent="second">Need a surgical second opinion?</button>' +
      '<button class="oo-pill" data-intent="insurance">Do you accept my insurance?</button>' +
      '<button class="oo-pill" data-intent="location">Where are you located &amp; what do you treat?</button>' +
    "</div>" +
    '<div class="oo-drawer" id="ooDrawer" role="dialog" aria-label="Patient Concierge chat">' +
      '<div class="oo-drawer-head"><div class="oo-avatar">' + EMBLEM + "</div>" +
        '<div><div class="oo-drawer-title">Patient Concierge</div>' +
        '<div class="oo-drawer-sub"><span class="oo-dot"></span>Online now \u00B7 OneOrtho</div></div>' +
        '<button class="oo-drawer-x" id="ooDrawerX" aria-label="Close chat">&times;</button></div>' +
      '<div class="oo-msgs" id="ooMsgs"></div>' +
      '<div class="oo-inputrow"><form class="oo-inputwrap" id="ooInputForm">' +
        '<input type="text" id="ooInput" placeholder="Type your question\u2026" autocomplete="off" aria-label="Type your question">' +
        '<button class="oo-send" type="submit" aria-label="Send message">' + SEND_ICON + "</button></form>" +
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
    function showTyping() {
      var t = document.createElement("div");
      t.className = "oo-typing"; t.innerHTML = "<i></i><i></i><i></i>";
      msgs.appendChild(t); scrollDown();
      return t;
    }
    function botSay(text, actions) {
      var t = showTyping();
      setTimeout(function () {
        t.remove();
        addMsg(text, "bot");
        if (actions) addActions(actions);
      }, 650);
    }
    function intakeLink(e) {
      var onHome = /^\/(index\.html)?$/.test(window.location.pathname);
      if (onHome) {
        e.preventDefault(); closeDrawer();
        var target = document.getElementById("intake");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }
    }
    function addActions(items) {
      var wrap = document.createElement("div");
      wrap.className = "oo-actions";
      items.forEach(function (it) {
        var el;
        if (it.intent) {
          el = document.createElement("button");
          el.className = "oo-btn" + (it.ghost ? " ghost" : "");
          el.textContent = it.label;
          el.addEventListener("click", function () { runIntent(it.intent); });
        } else if (it.href) {
          el = document.createElement("a");
          el.href = it.href; el.className = "oo-btn" + (it.ghost ? " ghost" : "");
          el.textContent = it.label;
          if (it.external) { el.target = "_blank"; el.rel = "noopener"; }
          if (it.intake) el.addEventListener("click", intakeLink);
        } else {
          el = document.createElement("button");
          el.className = "oo-btn" + (it.ghost ? " ghost" : "");
          el.textContent = it.label;
          el.addEventListener("click", it.onClick || function () {});
        }
        wrap.appendChild(el);
      });
      msgs.appendChild(wrap); scrollDown();
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
          })
          .catch(function () {
            btn.disabled = false; btn.textContent = "Request My Appointment";
            addMsg("That didn\u2019t go through \u2014 please call us at " + PHONE_DISPLAY + " and we\u2019ll book you right away.", "bot");
          });
      });
      msgs.appendChild(form); scrollDown();
    }

    FLOWS = {
      schedule: function () {
        botSay("We offer same-day and next-day specialist evaluations in North Texas. Would you like to request a time right here or call our intake desk?");
        setTimeout(function () {
          scheduleForm();
          addActions([{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }]);
        }, 700);
      },
      second: function () {
        botSay("Told you need knee, hip, or shoulder surgery? We review your existing MRI/X-rays directly and give you a clear, honest surgical vs. non-surgical plan within 48 hours.", [
          { label: "Start Second Opinion Request", href: "/second-opinion" },
          { label: "Ask a Question", ghost: true, onClick: function () { document.getElementById("ooInput").focus(); } }
        ]);
      },
      insurance: function () {
        botSay("We accept Medicare and major commercial insurance plans, and our team verifies your exact coverage before your visit so there are no surprises.", [
          { label: "Verify My Coverage & Book", href: "/#intake", intake: true }
        ]);
      },
      location: function () {
        botSay("We specialize in advanced outpatient knee, hip, and shoulder care across North Texas (Dallas \u00B7 Plano \u00B7 Frisco corridor). Our flagship Dallas clinic is at " + ADDRESS + ". Parking is free, and the suite is on the ground floor.", [
          { label: "Knee Care", href: "/knee", ghost: true },
          { label: "Hip Care", href: "/hip", ghost: true },
          { label: "Shoulder Care", href: "/shoulder", ghost: true },
          { label: "Book Consult", href: "/#intake", intake: true }
        ]);
      }
    };

    function runIntent(id) {
      if (FLOWS[id]) { FLOWS[id](); return; }
      for (var i = 0; i < KB.length; i++) {
        if (KB[i].id === id) { botSay(KB[i].reply, KB[i].actions); return; }
      }
    }

    function respondTo(text) {
      var t = " " + text.toLowerCase() + " ";
      for (var i = 0; i < KB.length; i++) {
        var entry = KB[i];
        for (var j = 0; j < entry.patterns.length; j++) {
          if (entry.patterns[j].test(t)) {
            if (entry.flow) { FLOWS[entry.flow](); }
            else botSay(entry.reply, entry.actions);
            return;
          }
        }
      }
      botSay(FALLBACK.reply, FALLBACK.actions);
    }

    function openDrawer(intent) {
      teaser.classList.remove("show");
      drawer.classList.add("open");
      badge.style.display = "none";
      try { localStorage.setItem("ooConciergeSeen", "1"); } catch (e) {}
      if (!greeted) {
        greeted = true;
        if (!intent) {
          botSay("Hi there. Welcome to OneOrtho \u2014 how can we help you today?", [
            { label: "Schedule an Appointment", intent: "schedule" },
            { label: "Second Opinion", intent: "second", ghost: true },
            { label: "Insurance", intent: "insurance", ghost: true },
            { label: "Location & Hours", intent: "location", ghost: true }
          ]);
          return;
        }
        addMsg("Hi there. Welcome to OneOrtho \u2014 how can we help you today?", "bot");
      }
      if (intent) runIntent(intent);
    }
    function closeDrawer() { drawer.classList.remove("open"); }

    document.getElementById("ooLauncher").addEventListener("click", function () {
      if (drawer.classList.contains("open")) closeDrawer(); else openDrawer(null);
    });
    document.getElementById("ooDrawerX").addEventListener("click", closeDrawer);
    document.getElementById("ooGreetX").addEventListener("click", function (ev) {
      ev.stopPropagation();
      teaser.classList.remove("show");
      try { localStorage.setItem("ooConciergeSeen", "1"); } catch (e) {}
    });
    root.querySelectorAll(".oo-pill").forEach(function (p) {
      p.addEventListener("click", function () { openDrawer(p.getAttribute("data-intent")); });
    });
    document.getElementById("ooGreet").addEventListener("click", function () { openDrawer(null); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

    document.getElementById("ooInputForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var input = document.getElementById("ooInput");
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMsg(text, "user");
      respondTo(text);
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
