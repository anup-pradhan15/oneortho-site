/* One Ortho — GA4 event wiring.
   Event names and non-identifying parameters only.
   Do not send form fields, names, emails, patient phone numbers,
   symptoms, or any free text. No user-id. */
(function () {
  'use strict';

  function track(name, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, params);
  }

  // Any tel: link, including ones injected after load (contact success state).
  document.addEventListener('click', function (e) {
    var node = e.target;
    if (!node || !node.closest) return;
    var link = node.closest('a[href^="tel:"]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('tel:') !== 0) return;
    track('click_to_call', {
      link_url: href,
      location: window.location.pathname || '/'
    });
    // No parameters: do not send the phone number or the page path.
    if (window.fbq) window.fbq('trackCustom', 'ClickToCall');
  });

  // Marketing-page consult forms POST to /thank-you, and the PRP landing
  // page forms to /regenerative-thanks (Netlify). One page view
  // is one submission. Skip reloads and back/forward so the same visit
  // does not count twice. The contact modal never reaches this page.
  var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/thank-you' || path === '/thank-you.html' ||
      path === '/regenerative-thanks' || path === '/regenerative-thanks.html') {
    var nav = window.performance &&
      performance.getEntriesByType &&
      performance.getEntriesByType('navigation')[0];
    if (!nav || nav.type === 'navigate') {
      track('generate_lead');
      // /regenerative-thanks fires its own Meta Lead in <head>, once per
      // session, so it is not sent again from here.
      var ownLead = path === '/regenerative-thanks' || path === '/regenerative-thanks.html';
      if (window.fbq && !ownLead) window.fbq('track', 'Lead');
    }
  }
})();
