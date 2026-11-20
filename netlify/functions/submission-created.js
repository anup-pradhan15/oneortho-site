/* OneOrtho — email the guide after a PRP landing page form submission.
   ------------------------------------------------------------------
   Netlify runs a function named "submission-created" automatically
   each time a verified (non-spam) form submission arrives.

   Requires ONE environment variable in Netlify (Project configuration >
   Environment variables):  RESEND_API_KEY
   Without it this does nothing and the forms keep working as before.

   Optional: GUIDE_FROM (default "OneOrtho <guide@oneortho.com>") and
   GUIDE_REPLY_TO (default "joey@oneortho.com").

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

function buildEmail(name) {
  const hello = name ? 'Hi ' + name + ',' : 'Hello,';
  const text = [
    hello,
    '',
    'Here is your copy of The Years Before Replacement, our plain-language guide to what helps an arthritic joint, what doesn\'t, and what the evidence says about injections, PRP, bracing and exercise.',
    '',
    'Read the guide: ' + GUIDE_URL,
    '',
    'If you would like to find out where your joint stands, an evaluation is one visit with Dr. Pradhan. Call (972) 457-1530 or request a time at ' + PAGE_URL + '.',
    '',
    'Anup Pradhan, MD',
    'OneOrtho',
    '12222 N Central Expy, Suite 130, Dallas, TX 75243',
    '',
    'You are receiving this one email because you requested the guide at oneortho.com. This guide is for general education and is not medical advice. Please do not reply with medical details; call the office instead.'
  ].join('\n');

  const html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1D1D1F;max-width:560px;margin:0 auto;padding:24px 8px">' +
    '<p style="font-size:18px;margin:0 0 20px"><strong>One</strong>Ortho</p>' +
    '<p>' + escapeHtml(hello) + '</p>' +
    '<p>Here is your copy of <strong>The Years Before Replacement</strong>, our plain-language guide to what helps an arthritic joint, what doesn\'t, and what the evidence says about injections, PRP, bracing and exercise.</p>' +
    '<p style="margin:28px 0"><a href="' + GUIDE_URL + '" style="background:#0B6BD8;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px;display:inline-block">Read the guide</a></p>' +
    '<p>If you would like to find out where your joint stands, an evaluation is one visit with Dr. Pradhan. Call <a href="tel:+19724571530" style="color:#0B62C4">(972) 457-1530</a> or <a href="' + PAGE_URL + '" style="color:#0B62C4">request a time online</a>.</p>' +
    '<p style="margin-top:28px">Anup Pradhan, MD<br>OneOrtho<br><span style="color:#5E5E63">12222 N Central Expy, Suite 130, Dallas, TX 75243</span></p>' +
    '<p style="font-size:12px;color:#5E5E63;border-top:1px solid #D2D2D7;padding-top:14px;margin-top:28px">You are receiving this one email because you requested the guide at oneortho.com. This guide is for general education and is not medical advice. Please do not reply with medical details; call the office instead.</p>' +
    '</div>';

  return { text: text, html: html };
}

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

  const message = buildEmail(firstName(data.name));
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.GUIDE_FROM || 'OneOrtho <guide@oneortho.com>',
        to: [to],
        reply_to: process.env.GUIDE_REPLY_TO || 'joey@oneortho.com',
        subject: 'Your guide: The Years Before Replacement',
        text: message.text,
        html: message.html
      })
    });
    // Status only. Never log the address or the response body.
    console.log('guide email ' + (res.ok ? 'sent' : 'failed') + ': ' + res.status);
  } catch (e) {
    console.log('guide email failed: network error');
  }
  return ok;
};
