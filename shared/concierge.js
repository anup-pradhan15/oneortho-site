/* OneOrtho Patient Concierge v3 — light home/messages panel + hybrid brain.
   ---------------------------------------------------------------------------
   Routing for free text:
     1. Safety + conversion intents (scripted, deterministic): emergency,
        diagnosis guardrail, existing appointment, schedule, second opinion,
        insurance, human, greeting, thanks.
     2. AI endpoint (/.netlify/functions/concierge) for everything else —
        grounded in the approved practice knowledge base, hard guardrails.
     3. If the AI is unavailable (e.g. API key not yet configured), the
        built-in KB below answers, then a human-path fallback.
   Edit canned answers in KB / FLOWS. Never add diagnosis or treatment
   advice for a specific person.
--------------------------------------------------------------------------- */
(function () {
  "use strict";
  var PHONE_DISPLAY = "(972) 457-1530";
  var PHONE_TEL = "tel:+19724571530";
  var ADDRESS = "12222 N Central Expy, Suite 130, Dallas, TX 75243";
  var MAPS_URL = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("OneOrtho " + ADDRESS);

  var KB = [
    { id: "emergency",
      patterns: [/emergency/, /911/, /chest pain/, /can'?t breathe|trouble breathing/, /heavy bleeding|won'?t stop bleeding/, /suicid/],
      reply: "If this is a medical emergency, call 911 now. If you are a patient with an urgent concern, call our office at " + PHONE_DISPLAY + " and we will route you to the care team right away.",
      actions: [{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL }] },
    { id: "diagnosis",
      patterns: [/diagnos/, /what'?s wrong with/, /should i (have|get) surgery/, /do i need surgery/, /(my )?(knee|hip|shoulder|joint) (hurts|aches|pain)/, /is it normal (to|that)/, /symptom/],
      reply: "I can't assess symptoms or medical questions in chat — that takes an in-person evaluation with imaging. The fastest route is a specialist evaluation, and we offer same-day and next-day appointments. Want me to start a request?",
      actions: [{ label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true }, { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }] },
    { id: "existing",
      patterns: [/reschedul/, /cancel/, /existing appointment/, /change my (appointment|appt)/, /move my (appointment|appt)/],
      reply: "To reschedule or cancel, call our intake desk at " + PHONE_DISPLAY + " (Mon–Fri, 8 AM–5 PM) and we will move you right away. You can also send a fresh request here and we will call to confirm the new time.",
      actions: [{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL }, { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true, ghost: true }, { label: "Intake Forms", href: "/intake", ghost: true }] },
    { id: "cost",
      patterns: [/cost/, /price|pricing/, /self[- ]?pay/, /\bcash\b/, /how much/, /fee schedule/, /afford/, /payment plan/, /financ/],
      reply: "Two ways to pay: most patients use insurance or Medicare, and we verify your exact coverage before your visit. Prefer self-pay? Our published Self-Pay Fee Schedule lists flat rates — a new patient evaluation is $249. No surprise bills, ever.",
      actions: [{ label: "See Self-Pay Fee Schedule", href: "/cash-prices" }, { label: "Verify My Coverage", intent: "insurance", ghost: true }] },
    { id: "hours",
      patterns: [/hours?/, /when (are|do) you (open|close)/, /open (now|on)/, /weekend/, /saturday|sunday/],
      reply: "Our Dallas clinic is open Monday through Friday, 8:00 AM to 5:00 PM. Consults can be requested online anytime — we confirm your exact time by phone.",
      actions: [{ label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true }, { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }] },
    { id: "portal",
      patterns: [/portal/, /healow/, /log ?in|sign ?in/, /my (records?|results?|chart)/, /test results?/, /medical records?/],
      reply: "Your records, results, and secure messaging live in the Healow Patient Portal. It opens in a new tab — you can also reach it anytime from the Patient Portal button at the top of this site.",
      actions: [{ label: "Open Patient Portal", href: "https://health.healow.com/OneOrtho", external: true }] },
    { id: "doctor",
      patterns: [/pradhan/, /who (is|will|would)/, /doctor|surgeon/, /credentials?/, /experience/, /best doctor/, /board[- ]certified/, /trained|training/],
      reply: "Your surgeon is Anup Pradhan, MD — board-certified, Vanderbilt MD and residency, Duke fellowship, and former Chair of Orthopedics at Medical City Dallas. He has been named a D Magazine Best Doctor seven years in a row (2020–2026).",
      actions: [{ label: "About Dr. Pradhan", href: "/about" }, { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true, ghost: true }] },
    { id: "prepare",
      patterns: [/bring/, /first visit/, /prepare|preparation/, /paperwork/, /intake/, /what (do|should) i (do|bring|expect)/, /before my (visit|appointment|surgery)/],
      reply: "For a first visit, bring your insurance card, a photo ID, and any prior imaging (MRI or X-rays) — reports are fine if you don't have the images. You can also complete your intake forms online before you arrive, which speeds everything up.",
      actions: [{ label: "Complete Intake Forms", href: "/intake" }, { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true, ghost: true }] },
    { id: "recovery",
      patterns: [/recover/, /outpatient/, /same[- ]day/, /\basc\b|surgery center/, /physical therapy|\bpt\b|rehab/, /hospital stay/],
      reply: "Most of our joint replacements are outpatient — surgery at an advanced surgery center, home the same day, walking the same day. Recovery is structured: you leave with a clear plan, scheduled follow-ups, and a team that tracks your progress.",
      actions: [{ label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true }, { label: "Second Opinion", intent: "second", ghost: true }] },
    { id: "knee",
      patterns: [/knee/, /meniscus/, /\bacl\b/, /cartilage/],
      reply: "Our knee care covers reconstruction and joint preservation through to full replacement — the goal is the least invasive option that actually fixes the problem. Explore knee care, or start with an evaluation.",
      actions: [{ label: "Knee Care", href: "/knee" }, { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true, ghost: true }] },
    { id: "hip",
      patterns: [/\bhip\b/, /groin pain/],
      reply: "Our hip care centers on the anterior, muscle-sparing approach to replacement — most patients are home the same day. Explore hip care, or start with an evaluation.",
      actions: [{ label: "Hip Care", href: "/hip" }, { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true, ghost: true }] },
    { id: "shoulder",
      patterns: [/shoulder/, /rotator cuff/, /labrum|labral/],
      reply: "Our shoulder care runs from rotator cuff repair to total shoulder replacement, with preservation options first when they can work. Explore shoulder care, or start with an evaluation.",
      actions: [{ label: "Shoulder Care", href: "/shoulder" }, { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true, ghost: true }] },
    { id: "human",
      patterns: [/human/, /real person/, /someone (real|live)/, /speak|talk (to|with)/, /phone|call (me|you|us)/, /contact/],
      reply: "Of course — our intake desk answers Monday through Friday, 8:00 AM to 5:00 PM at " + PHONE_DISPLAY + ". Or leave your number in an appointment request and we'll call you.",
      actions: [{ label: "Call " + PHONE_DISPLAY, href: PHONE_TEL }, { label: "Request a Callback", intent: "schedule", ghost: true }] },
    { id: "greeting",
      patterns: [/^(hi|hey|hello|good (morning|afternoon|evening)|yo)\b/],
      reply: "Hello — welcome to OneOrtho. I can help you schedule an appointment, start a second opinion, verify insurance, or answer questions about our care. What would you like to do?",
      actions: [{ label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true }, { label: "Second Opinion", intent: "second", ghost: true }, { label: "Insurance", intent: "insurance", ghost: true }, { label: "Location & Hours", intent: "location", ghost: true }] },
    { id: "thanks",
      patterns: [/thank/, /thanks/, /great|awesome|perfect|that helps/],
      reply: "You're welcome. Anything else I can help with — scheduling, insurance, or directions?",
      actions: [{ label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true }, { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }] }
  ];

  var FLOWS = {
    schedule: { patterns: [/schedul/, /book/, /appointment/, /\bappt\b/, /see (a|the|dr|doctor)/, /consult/, /visit/, /come in/] },
    second: { patterns: [/second opinion/, /another opinion/, /told (i|me|you) need surgery/, /review my (mri|x-?ray|scan|imaging)/, /already (saw|seen|have) a (doctor|surgeon)/] },
    insurance: { patterns: [/insurance/, /in[- ]?network/, /accept/, /coverage/, /cover(ed)? (my|me|this)/, /bcbs|blue ?cross|aetna|cigna|united ?health|humana/, /medicare/, /\bppo\b|\bhmo\b/, /verify/] },
    location: { patterns: [/where/, /located/, /location/, /address/, /directions?/, /parking/, /map/, /which (city|office)/] }
  };
  var SCRIPTED_FIRST = ["emergency", "diagnosis", "existing", "human", "greeting", "thanks"];

  var FALLBACK = {
    reply: "I want to make sure you get an exact answer. I can help right away with scheduling, second opinions, insurance verification, costs, and locations — or our team can help directly at " + PHONE_DISPLAY + ".",
    actions: [
      { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true },
      { label: "Second Opinion", intent: "second", ghost: true },
      { label: "Insurance", intent: "insurance", ghost: true },
      { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }
    ]
  };

  function emblem(stroke, bubble, dots) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22.5" fill="none" stroke="' + stroke + '" stroke-width="1.6"/>' +
      '<path d="M14 16.5c0-1.9 1.6-3.5 3.5-3.5h13c1.9 0 3.5 1.6 3.5 3.5v9c0 1.9-1.6 3.5-3.5 3.5H22l-5.4 4.6c-.5.4-1.3.1-1.3-.6V16.5z" fill="' + bubble + '"/>' +
      '<circle cx="19.5" cy="21" r="1.7" fill="' + dots + '"/><circle cx="24" cy="21" r="1.7" fill="' + dots + '"/><circle cx="28.5" cy="21" r="1.7" fill="' + dots + '"/></svg>';
  }
  var EMBLEM_ON_WHITE = emblem("#0B1B2B", "#0B1B2B", "#FFFFFF");
  var EMBLEM_ON_NAVY = emblem("#FFFFFF", "#FFFFFF", "#0B1B2B");
  var ARROW_UP_WHITE = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V6M6 11.5L12 5.5l6 6"/></svg>';
  function ico(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#0B1B2B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
  }
  var ICO_CHAT = ico('<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5z"/>');
  var ICO_PLUS = ico('<circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/>');
  var ICO_CAL = ico('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>');
  var ICO_SHIELD = ico('<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>');
  var ICO_CLOCK = ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>');
  var ICO_HOME = ico('<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9.5h12V10"/>');

  var root = document.createElement("div");
  root.id = "oo-concierge";
  root.innerHTML =
    '<div class="oo-teaser" id="ooTeaser">' +
      '<div class="oo-greet" id="ooGreet">' +
        '<button class="oo-greet-x" id="ooGreetX" aria-label="Dismiss greeting">&times;</button>' +
        '<div class="oo-greet-head"><div class="oo-tile">' + EMBLEM_ON_WHITE + "</div>" +
        "<div><h4>Hi there. Welcome to OneOrtho \u2014 how can we help you today?</h4>" +
        '<p><span class="oo-dot"></span>Patient Concierge \u00B7 Online now</p></div></div>' +
      "</div>" +
      '<button class="oo-pill" data-intent="schedule">Can I schedule an appointment?</button>' +
      '<button class="oo-pill" data-intent="second">Need a surgical second opinion?</button>' +
      '<button class="oo-pill" data-intent="insurance">Do you accept my insurance?</button>' +
      '<button class="oo-pill" data-intent="location">Where are you located &amp; what do you treat?</button>' +
    "</div>" +
    '<div class="oo-panel" id="ooPanel" role="dialog" aria-label="Patient Concierge">' +
      '<div class="oo-home" id="ooHome">' +
        '<div class="oo-home-scroll">' +
          '<div class="oo-home-top"><div class="oo-logo-tile">' + EMBLEM_ON_NAVY + '</div>' +
          '<button class="oo-x" id="ooHomeX" aria-label="Close concierge">&times;</button></div>' +
          "<h2>Let\u2019s Help You Find What You Need Today</h2>" +
          '<p class="oo-home-sub">Instant answers from OneOrtho \u2014 scheduling, second opinions, insurance, and care, with no time on hold.</p>' +
          '<form class="oo-ask" id="ooAskForm"><input type="text" id="ooAskInput" placeholder="Ask me anything\u2026" autocomplete="off" aria-label="Ask me anything">' +
          '<button class="oo-ask-send" type="submit" aria-label="Ask">' + ARROW_UP_WHITE + "</button></form>" +
          '<div class="oo-menu">' +
            '<button class="oo-menu-row" data-menu="ask"><span class="oo-menu-ico">' + ICO_CHAT + '</span><span class="oo-menu-tx"><strong>Ask a question</strong><span>Instant answers about care, costs, and visiting us</span></span><span class="oo-menu-arrow">\u203A</span></button>' +
            '<button class="oo-menu-row" data-menu="treatment"><span class="oo-menu-ico">' + ICO_PLUS + '</span><span class="oo-menu-tx"><strong>I have questions about a treatment</strong><span>Knee, hip, and shoulder care, explained plainly</span></span><span class="oo-menu-arrow">\u203A</span></button>' +
            '<button class="oo-menu-row" data-menu="schedule"><span class="oo-menu-ico">' + ICO_CAL + '</span><span class="oo-menu-tx"><strong>I want to schedule a consultation</strong><span>Same-day and next-day evaluations in North Texas</span></span><span class="oo-menu-arrow">\u203A</span></button>' +
            '<button class="oo-menu-row" data-menu="insurance"><span class="oo-menu-ico">' + ICO_SHIELD + '</span><span class="oo-menu-tx"><strong>Insurance &amp; costs</strong><span>Verify your coverage or see published self-pay rates</span></span><span class="oo-menu-arrow">\u203A</span></button>' +
            '<button class="oo-menu-row" data-menu="existing"><span class="oo-menu-ico">' + ICO_CLOCK + '</span><span class="oo-menu-tx"><strong>I have an existing appointment</strong><span>Reschedule, intake forms, portal, and directions</span></span><span class="oo-menu-arrow">\u203A</span></button>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="oo-chat" id="ooChat">' +
        '<div class="oo-chat-head"><button class="oo-back" id="ooBack" aria-label="Back to home">\u2039</button><div class="oo-tile">' + EMBLEM_ON_NAVY + "</div>" +
          '<div><div class="oo-chat-title">Patient Concierge</div>' +
          '<div class="oo-chat-sub"><span class="oo-dot"></span>OneOrtho \u00B7 Replies instantly</div></div>' +
          '<button class="oo-x" id="ooChatX" aria-label="Close concierge">&times;</button></div>' +
        '<div class="oo-msgs" id="ooMsgs"></div>' +
        '<div class="oo-inputrow"><form class="oo-inputwrap" id="ooInputForm">' +
          '<input type="text" id="ooInput" placeholder="Type your question\u2026" autocomplete="off" aria-label="Type your question">' +
          '<button class="oo-send" type="submit" aria-label="Send message">' + ARROW_UP_WHITE + "</button></form>" +
          '<p class="oo-note">For your privacy, please do not share sensitive medical records in chat.</p></div>' +
      "</div>" +
      '<div class="oo-tabs">' +
        '<button class="oo-tab active" id="ooTabHome">' + ico('<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9.5h12V10"/>') + "<span>Home</span></button>" +
        '<button class="oo-tab" id="ooTabMsgs">' + ICO_CHAT + "<span>Messages</span></button>" +
      "</div>" +
    "</div>" +
    '<button class="oo-launcher" id="ooLauncher" aria-label="Open Patient Concierge">' + EMBLEM_ON_WHITE +
      '<span class="oo-badge" id="ooBadge">1</span></button>';

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    document.body.appendChild(root);
    var teaser = document.getElementById("ooTeaser");
    var panel = document.getElementById("ooPanel");
    var home = document.getElementById("ooHome");
    var chat = document.getElementById("ooChat");
    var msgs = document.getElementById("ooMsgs");
    var badge = document.getElementById("ooBadge");
    var tabHome = document.getElementById("ooTabHome");
    var tabMsgs = document.getElementById("ooTabMsgs");
    var greeted = false;
    var history = [];

    function scrollDown() { msgs.scrollTop = msgs.scrollHeight; }
    function addMsg(text, who) {
      var d = document.createElement("div");
      d.className = "oo-msg " + who;
      d.textContent = text;
      msgs.appendChild(d); scrollDown();
      history.push({ role: who === "user" ? "user" : "assistant", content: text });
      if (history.length > 12) history = history.slice(-12);
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
        t.remove(); addMsg(text, "bot");
        if (actions) addActions(actions);
      }, 600);
    }
    function intakeLink(e) {
      var onHome = /^\/(index\.html)?$/.test(window.location.pathname);
      if (onHome) {
        e.preventDefault(); closePanel();
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
        } else if (it.sendText) {
          el = document.createElement("button");
          el.className = "oo-btn" + (it.ghost ? " ghost" : "");
          el.textContent = it.label;
          el.addEventListener("click", function () { sendAsUser(it.sendText); });
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
        '<button class="oo-btn" type="submit">Send request</button>';
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
            btn.disabled = false; btn.textContent = "Send request";
            addMsg("That didn\u2019t go through \u2014 please call us at " + PHONE_DISPLAY + " and we\u2019ll book you right away.", "bot");
          });
      });
      msgs.appendChild(form); scrollDown();
    }

    var FLOW_RUNNERS = {
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
          { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true },
          { label: "Self-Pay Rates", intent: "cost", ghost: true }
        ]);
      },
      location: function () {
        botSay("We specialize in advanced outpatient knee, hip, and shoulder care across North Texas (Dallas \u00B7 Plano \u00B7 Frisco corridor). Our flagship Dallas clinic is at " + ADDRESS + ". Parking is free, and the suite is on the ground floor.", [
          { label: "Get Directions", href: MAPS_URL, external: true },
          { label: "Knee Care", href: "/knee", ghost: true },
          { label: "Hip Care", href: "/hip", ghost: true },
          { label: "Shoulder Care", href: "/shoulder", ghost: true },
          { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true }
        ]);
      }
    };

    function matchKB(entry, t) {
      for (var j = 0; j < entry.patterns.length; j++) if (entry.patterns[j].test(t)) return true;
      return false;
    }
    function runIntent(id) {
      if (FLOW_RUNNERS[id]) { FLOW_RUNNERS[id](); return; }
      for (var i = 0; i < KB.length; i++) {
        if (KB[i].id === id) { botSay(KB[i].reply, KB[i].actions); return; }
      }
    }
    function askAI(done) {
      var ctrl = ("AbortController" in window) ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
      fetch("/.netlify/functions/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-8) }),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) { if (timer) clearTimeout(timer); if (!r.ok) throw new Error("ai"); return r.json(); })
        .then(function (data) { if (!data || !data.reply) throw new Error("ai"); done(data.reply); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    }
    function respondTo(text) {
      var t = " " + text.toLowerCase() + " ";
      var i, entry;
      for (i = 0; i < SCRIPTED_FIRST.length; i++) {
        entry = KB.filter(function (e) { return e.id === SCRIPTED_FIRST[i]; })[0];
        if (entry && matchKB(entry, t)) { botSay(entry.reply, entry.actions); return; }
      }
      var flowIds = ["schedule", "second", "insurance"];
      for (i = 0; i < flowIds.length; i++) {
        var fid = flowIds[i];
        var matched = FLOWS[fid].patterns.some(function (re) { return re.test(t); });
        if (matched) { FLOW_RUNNERS[fid](); return; }
      }
      var typing = showTyping();
      askAI(function (reply) {
        typing.remove();
        if (reply) {
          addMsg(reply, "bot");
          addActions([
            { label: "Book an appointment", href: "https://healow.com/apps/provider/anupam-pradhan-3340771", external: true, ghost: true },
            { label: "Call " + PHONE_DISPLAY, href: PHONE_TEL, ghost: true }
          ]);
          return;
        }
        for (var k = 0; k < KB.length; k++) {
          if (SCRIPTED_FIRST.indexOf(KB[k].id) === -1 && matchKB(KB[k], t)) {
            addMsg(KB[k].reply, "bot");
            if (KB[k].actions) addActions(KB[k].actions);
            return;
          }
        }
        if (FLOWS.location.patterns.some(function (re) { return re.test(t); })) { FLOW_RUNNERS.location(); return; }
        addMsg(FALLBACK.reply, "bot");
        addActions(FALLBACK.actions);
      });
    }
    function sendAsUser(text) {
      showChat();
      addMsg(text, "user");
      respondTo(text);
    }

    function showHome() {
      home.classList.remove("hide");
      chat.classList.remove("show");
      tabHome.classList.add("active"); tabMsgs.classList.remove("active");
    }
    function showChat() {
      home.classList.add("hide");
      chat.classList.add("show");
      tabMsgs.classList.add("active"); tabHome.classList.remove("active");
      if (!greeted) {
        greeted = true;
        addMsg("Hi there. Welcome to OneOrtho \u2014 how can we help you today?", "bot");
      }
      scrollDown();
    }
    function openPanel(intent) {
      teaser.classList.remove("show");
      panel.classList.add("open");
      badge.style.display = "none";
      try { localStorage.setItem("ooConciergeSeen", "1"); } catch (e) {}
      if (intent) { showChat(); runIntent(intent); }
      else if (greeted) { showChat(); }
      else { showHome(); }
    }
    function closePanel() { panel.classList.remove("open"); }

    document.getElementById("ooLauncher").addEventListener("click", function () {
      if (panel.classList.contains("open")) closePanel(); else openPanel(null);
    });
    document.getElementById("ooHomeX").addEventListener("click", closePanel);
    document.getElementById("ooChatX").addEventListener("click", closePanel);
    document.getElementById("ooBack").addEventListener("click", showHome);
    tabHome.addEventListener("click", showHome);
    tabMsgs.addEventListener("click", showChat);
    document.getElementById("ooGreetX").addEventListener("click", function (ev) {
      ev.stopPropagation();
      teaser.classList.remove("show");
      try { localStorage.setItem("ooConciergeSeen", "1"); } catch (e) {}
    });
    root.querySelectorAll(".oo-pill").forEach(function (p) {
      p.addEventListener("click", function () { openPanel(p.getAttribute("data-intent")); });
    });
    document.getElementById("ooGreet").addEventListener("click", function () { openPanel(null); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

    root.querySelectorAll(".oo-menu-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var key = row.getAttribute("data-menu");
        if (key === "ask") { showChat(); document.getElementById("ooInput").focus(); }
        else if (key === "treatment") {
          showChat();
          botSay("Happy to explain any of our treatments in plain language. Pick a topic, or type your own question below.", [
            { label: "Meniscus Tear", sendText: "What is a meniscus tear and how is it treated?", ghost: true },
            { label: "Rotator Cuff", sendText: "How is a torn rotator cuff treated?", ghost: true },
            { label: "Knee Replacement", sendText: "What does knee replacement involve?", ghost: true },
            { label: "Anterior Hip Replacement", sendText: "What is anterior hip replacement?", ghost: true },
            { label: "Second Opinion", intent: "second" }
          ]);
        }
        else if (key === "schedule") { showChat(); FLOW_RUNNERS.schedule(); }
        else if (key === "insurance") { showChat(); FLOW_RUNNERS.insurance(); }
        else if (key === "existing") {
          showChat();
          botSay("Everything for an existing visit, in one place.", [
            { label: "Reschedule or Cancel", intent: "existing" },
            { label: "Intake Forms", href: "/intake", ghost: true },
            { label: "Patient Portal", href: "https://health.healow.com/OneOrtho", external: true, ghost: true },
            { label: "Directions", href: MAPS_URL, external: true, ghost: true },
            { label: "What to Bring", intent: "prepare", ghost: true }
          ]);
        }
      });
    });

    document.getElementById("ooAskForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var input = document.getElementById("ooAskInput");
      var text = input.value.trim();
      if (!text) { showChat(); return; }
      input.value = "";
      sendAsUser(text);
    });
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
        if (!panel.classList.contains("open")) teaser.classList.add("show");
      }, 2500);
    } else {
      badge.style.display = "none";
    }
  });
})();
