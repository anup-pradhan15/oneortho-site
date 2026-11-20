/* OneOrtho — unsubscribe from the PRP guide follow-up emails.
   The link in each email carries the Resend ids of the follow-ups still
   scheduled for that person, signed so it cannot be altered. This cancels
   them. Nothing is stored and no email address is involved. */

const { _sign } = require('./submission-created.js');

const PAGE = function (title, body) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
    body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title + ' | OneOrtho</title></head>' +
      '<body style="margin:0;background:#1D1D1F;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif">' +
      '<div style="max-width:520px;margin:0 auto;padding:96px 24px;line-height:1.5">' +
      '<p style="font-size:20px;margin:0 0 28px"><strong>One</strong>Ortho</p>' +
      '<h1 style="font-size:34px;line-height:1.15;margin:0 0 16px">' + title + '</h1>' +
      '<p style="font-size:17px;color:#D6D6DB">' + body + '</p>' +
      '<p style="font-size:15px;color:#A1A1A6;margin-top:28px">Questions? Call (972) 457-1530.</p>' +
      '</div></body></html>'
  };
};

exports.handler = async function (event) {
  const q = event.queryStringParameters || {};
  const ids = String(q.ids || '');
  const apiKey = process.env.RESEND_API_KEY;
  const done = PAGE('You\'re unsubscribed.', 'You won\'t get any more emails in this series from OneOrtho.');

  if (!ids) return done; // last email in the series: nothing left to cancel
  if (!apiKey || !/^[0-9a-f,-]{1,200}$/i.test(ids) || String(q.sig || '') !== _sign(ids, apiKey)) {
    return PAGE('We couldn\'t process that link.', 'Please reply to the email or call the office and we will take you off the list.');
  }
  let failed = false;
  for (const id of ids.split(',').filter(Boolean)) {
    try {
      const res = await fetch('https://api.resend.com/emails/' + id + '/cancel', {
        method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }
      });
      console.log('unsubscribe cancel: ' + res.status);
      // 4xx other than auth usually means the email was already sent or cancelled.
      if (res.status === 401 || res.status === 403 || res.status >= 500) failed = true;
    } catch (e) { failed = true; }
  }
  return failed
    ? PAGE('We\'ve received your request.', 'We couldn\'t cancel automatically, so reply to the email or call the office and we will take you off the list today.')
    : done;
};
