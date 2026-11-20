/* OneOrtho — email the guide after a PRP landing page form submission.
   ------------------------------------------------------------------
   Netlify runs a function named "submission-created" automatically
   each time a verified (non-spam) form submission arrives.

   Requires ONE environment variable in Netlify (Project configuration >
   Environment variables):  RESEND_API_KEY
   Without it this does nothing and the forms keep working as before.

   Optional: GUIDE_FROM (default "OneOrtho <guide@oneortho.com>") and
   GUIDE_REPLY_TO (default "joey@oneortho.com").

   Sends three emails: the guide now, then follow-ups 2 and 5 days later
   (scheduled with Resend). Every email has an unsubscribe link that
   cancels whatever is still scheduled (see unsubscribe.js).

   Privacy: only the email address and first name are sent to Resend.
   Phone, joint and requested times are never sent, and nothing about
   the submission is logged.
------------------------------------------------------------------- */

const GUIDE_FORMS = ['prp-evaluation-request', 'prp-guide-request'];
const GUIDE_URL = 'https://oneortho.com/assets/regenerative/the-years-before-replacement.pdf';
const PAGE_URL = 'https://oneortho.com/regenerative';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function firstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  // Letters, apostrophes and hyphens only, so nothing odd lands in the greeting.
  return /^[\p{L}'’-]{1,40}$/u.test(first) ? first : '';
}

const crypto = require('crypto');
const UNSUB_URL = 'https://oneortho.com/.netlify/functions/unsubscribe';

// Signed unsubscribe link. `ids` are the Resend ids of the follow-up emails
// still scheduled for this person; the unsubscribe function cancels them.
function sign(ids, apiKey) {
  return crypto.createHmac('sha256', crypto.createHash('sha256').update(apiKey).digest())
    .update(ids).digest('hex').slice(0, 32);
}
function unsubLink(idList, apiKey) {
  const ids = idList.join(',');
  return UNSUB_URL + '?ids=' + encodeURIComponent(ids) + '&sig=' + sign(ids, apiKey);
}

const SIGN_OFF_TEXT = ['Anup Pradhan, MD', 'OneOrtho', '12222 N Central Expy, Suite 130, Dallas, TX 75243'];
const FOOT = 'You are receiving this because you requested our guide at oneortho.com. This is general education, not medical advice. Please do not reply with medical details; call the office instead.';

function wrap(hello, paragraphs, button, unsub) {
  // paragraphs: array of plain strings. button: { label, url }.
  const text = [hello, ''].concat(
    paragraphs.reduce(function (a, p) { return a.concat([p, '']); }, []),
    [button.label + ': ' + button.url, ''], SIGN_OFF_TEXT, ['', FOOT, 'Unsubscribe: ' + unsub]
  ).join('\n');
  const html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1D1D1F;max-width:560px;margin:0 auto;padding:24px 8px">' +
    '<p style="font-size:18px;margin:0 0 20px"><strong>One</strong>Ortho</p>' +
    '<p>' + escapeHtml(hello) + '</p>' +
    paragraphs.map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('') +
    '<p style="margin:28px 0"><a href="' + button.url + '" style="background:#FFD60A;color:#1D1D1F;text-decoration:none;font-weight:800;padding:15px 26px;border-radius:8px;display:inline-block">' + escapeHtml(button.label) + '</a></p>' +
    '<p style="margin-top:28px">Anup Pradhan, MD<br>OneOrtho<br><span style="color:#5E5E63">12222 N Central Expy, Suite 130, Dallas, TX 75243 &middot; (972) 457-1530</span></p>' +
    '<p style="font-size:12px;color:#5E5E63;border-top:1px solid #D2D2D7;padding-top:14px;margin-top:28px">' + escapeHtml(FOOT) + ' <a href="' + unsub + '" style="color:#5E5E63">Unsubscribe</a></p>' +
    '</div>';
  return { text: text, html: html };
}

// The three emails. 0 = the guide (sent now), 1 = two days later, 2 = five days later.
function buildEmail(step, name, unsub) {
  const hello = name ? 'Hi ' + name + ',' : 'Hello,';
  if (step === 0) {
    return Object.assign({ subject: 'Your guide: The Years Before Replacement' }, wrap(hello, [
      'Here is your copy of The Years Before Replacement, our plain-language guide to what helps an arthritic joint, what doesn\'t, and what the evidence says about injections, PRP, bracing and exercise.',
      'If you would like to find out where your joint stands, an evaluation is one visit with Dr. Pradhan. Call (972) 457-1530 or request a time at ' + PAGE_URL + '.',
      'Over the next few days we will send two short follow-ups with the questions patients ask most.'
    ], { label: 'Read the guide', url: GUIDE_URL }, unsub));
  }
  if (step === 1) {
    return Object.assign({ subject: 'The one question to ask before any knee injection' }, wrap(hello, [
      'If you only ask one question before a knee injection, make it this: what should I realistically expect?',
      'A straight answer sounds like this. PRP may reduce pain and improve function in some people with mild to moderate knee arthritis. It does not regrow cartilage, and it does not work for everyone. Results also differ between clinics, because "PRP" is not one product: the preparation system, the platelet concentration and the number of injections all vary.',
      'Be wary of anyone who promises results or says you can avoid surgery for certain. The other four questions are on page 8 of the guide.',
      'If you would like that conversation about your own knee, PRP evaluations with Dr. Pradhan are on Tuesday and Wednesday afternoons. If you have already requested a time, we will see you soon.'
    ], { label: 'Request a time', url: PAGE_URL }, unsub));
  }
  return Object.assign({ subject: 'Not sure PRP is right for your knee?' }, wrap(hello, [
    'That is a reasonable place to be. PRP is not right for every knee, and part of our job is to tell you when it isn\'t.',
    'An evaluation is one visit. Dr. Pradhan examines the joint, goes through your X-rays or MRI with you, and tells you which options fit: exercise and bracing, a steroid or gel injection, PRP, or surgery if that is where the joint stands.',
    'Prices are posted on our page, starting at $999 for a single joint, and you will know your exact cost before anything is scheduled. Evaluations are on Tuesday and Wednesday afternoons.',
    'This is the last email in this series. To talk it through, call (972) 457-1530.'
  ], { label: 'Request a time', url: PAGE_URL }, unsub));
}

// 10:00 AM Central on the day `days` from now (16:00 UTC).
function sendAt(days) {
  const d = new Date(Date.now() + days * 86400000);
  d.setUTCHours(16, 0, 0, 0);
  return d.toISOString();
}

async function send(apiKey, to, message, scheduledAt) {
  const body = {
    from: process.env.GUIDE_FROM || 'OneOrtho <guide@oneortho.com>',
    to: [to],
    reply_to: process.env.GUIDE_REPLY_TO || 'joey@oneortho.com',
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: { 'List-Unsubscribe': '<' + message.unsub + '>' }
  };
  if (scheduledAt) body.scheduled_at = scheduledAt;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let id = '';
  try { id = (await res.json()).id || ''; } catch (e) {}
  return { ok: res.ok, status: res.status, id: id };
}

exports._sign = sign;
exports.handler = async function (event) {
  const ok = { statusCode: 200, body: 'ok' };
  let payload;
  try {
    payload = JSON.parse(event.body || '{}').payload || {};
  } catch (e) {
    return ok;
  }

  if (GUIDE_FORMS.indexOf(payload.form_name) === -1) return ok;

  const data = payload.data || {};
  const to = String(data.email || '').trim();
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(to) || to.length > 254) return ok;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('guide email skipped: RESEND_API_KEY is not set');
    return ok;
  }

  const name = firstName(data.name);
  try {
    // Schedule the last email first, so each earlier email's unsubscribe link
    // can cancel the ones that come after it.
    const ids = [];
    const plan = [{ step: 2, days: 5 }, { step: 1, days: 2 }];
    for (const p of plan) {
      const unsub = unsubLink(ids.slice(), apiKey);
      const m = Object.assign(buildEmail(p.step, name, unsub), { unsub: unsub });
      const r = await send(apiKey, to, m, sendAt(p.days));
      console.log('follow-up ' + p.step + ' ' + (r.ok ? 'scheduled' : 'failed') + ': ' + r.status);
      if (r.ok && r.id) ids.push(r.id);
    }
    const unsub = unsubLink(ids, apiKey);
    const r = await send(apiKey, to, Object.assign(buildEmail(0, name, unsub), { unsub: unsub }), null);
    // Status only. Never log the address or the response body.
    console.log('guide email ' + (r.ok ? 'sent' : 'failed') + ': ' + r.status);
  } catch (e) {
    console.log('guide email failed: network error');
  }
  return ok;
};
