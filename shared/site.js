/* One Ortho — shared site behavior
   - sticky header scroll state
   - intake modal open/close (data-open-intake / data-close-intake)
   - reveal-on-scroll for .reveal nodes
*/
(function() {
  'use strict';

  // Hero rotator — cycles through patient outcomes in the homepage headline.
  // No-ops cleanly on every other page (no [data-rotator] element to find).
  //
  // The first version of this used setInterval(2700ms) which produced
  // *uneven* pacing: the first item sat at full opacity for the entire
  // interval, while every subsequent item lost 180ms to a fade-in before
  // it became fully readable. That gap (~360ms) was perceptible — the
  // first item felt lingering, the rest felt fast.
  //
  // The fix is two changes:
  //   1. Fade the FIRST item in on page load, so it has the same envelope
  //      as every other item (no "free" extra hold time at full opacity).
  //   2. Drive the loop with chained setTimeout calls scheduled at the END
  //      of each swap, so each item gets *exactly* HOLD_MS of post-swap
  //      visibility. (setInterval is also prone to drift; chained timeouts
  //      stay in lockstep with what just happened.)
  var rotator = document.querySelector('[data-rotator]');
  if (rotator) {
    var OUTCOMES = [
      // Six items, six distinct verbs, ordered as a "return to life"
      // ladder: rest → function → relief → joy → athletic ambition →
      // competitive ambition. Lead position carries the anchor message
      // — the one visitors see filling in the blank if they scroll
      // before the rotation completes a cycle.
      'sleep through the night',     // sleep    — chronic pain → rest
      'walk without limping',        // walk     — basic function
      'live without pain',           // live     — universal relief
      'play with your grandkids',    // play     — joy / family
      'qualify for Boston',          // qualify  — endurance achievement
      'compete at State'             // compete  — competitive ambition
    ];
    var HOLD_MS = 2500;  // time each item is held after its fade-in completes
    var FADE_MS = 180;   // must match the CSS transition on .hero__rotator
    var rotIdx = 0;
    var rotPaused = false;
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hoverHost = rotator.closest('.hero__headline') || rotator;
    hoverHost.addEventListener('mouseenter', function() { rotPaused = true; });
    hoverHost.addEventListener('mouseleave', function() { rotPaused = false; });

    function performSwap() {
      // Pause/visibility check happens *here* (not at schedule time) so
      // hovering or tab-switching freezes the rotation mid-cycle and it
      // resumes from where it was.
      if (rotPaused || document.hidden) {
        setTimeout(performSwap, 250);
        return;
      }
      rotator.classList.add('is-out');
      setTimeout(function() {
        rotIdx = (rotIdx + 1) % OUTCOMES.length;
        rotator.textContent = OUTCOMES[rotIdx];
        rotator.classList.remove('is-out');
        // Schedule the NEXT swap from this point, not from a fixed
        // start time — keeps every cycle the same duration.
        setTimeout(performSwap, HOLD_MS);
      }, FADE_MS);
    }

    if (!prefersReducedMotion) {
      // Anticipation pause: the headline shows "Orthopedic care, so you
      // can:" with an empty slot for ~800ms before the first outcome
      // fades in. Without this, the first item ("walk your dog") would
      // sit at full opacity from the moment the page renders, and many
      // visitors miss that the headline is dynamic at all — they assume
      // "walk your dog" is the entire message. The colon + brief pause
      // telegraphs "something is about to fill this in."
      rotator.classList.add('is-out');
      setTimeout(function() {
        rotator.classList.remove('is-out');
        setTimeout(performSwap, HOLD_MS);
      }, 800);
    }
  }

  // Sticky header background switch
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function() {
      if (window.scrollY > 16) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile nav (hamburger) — toggles full-screen overlay below sticky header
  var navToggle = document.querySelector('[data-mobile-nav-toggle]');
  var mobileNav = document.querySelector('[data-mobile-nav]');

  function openMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.add('is-open');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.classList.add('is-active');
      navToggle.setAttribute('aria-label', 'Close menu');
    }
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.remove('is-open');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.classList.remove('is-active');
      navToggle.setAttribute('aria-label', 'Open menu');
    }
    document.body.style.overflow = '';
  }
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function() {
      if (mobileNav.classList.contains('is-open')) closeMobileNav();
      else openMobileNav();
    });
    // Tapping the backdrop area outside .mobile-nav__inner closes the menu.
    mobileNav.addEventListener('click', function(e) {
      if (e.target === mobileNav) closeMobileNav();
    });
    // Close on Escape so keyboard users have an exit.
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeMobileNav();
    });
    // Close when any link or non-modal-opening button inside the menu is
    // tapped — the user's intent is to navigate, so the menu should get
    // out of the way. Delay 50ms so the click can dispatch first (e.g. so
    // the modal-open handler runs before we unlock body scroll).
    Array.prototype.forEach.call(
      mobileNav.querySelectorAll('a, button'),
      function(el) {
        el.addEventListener('click', function() {
          setTimeout(closeMobileNav, 50);
        });
      }
    );
    // If the viewport widens past mobile, drop the open state and any
    // body-scroll lock so the desktop layout isn't left half-broken.
    var mq = window.matchMedia('(min-width: 981px)');
    var onMqChange = function() { if (mq.matches) closeMobileNav(); };
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);
    else if (mq.addListener) mq.addListener(onMqChange);
  }

  // Intake modal
  var modal = document.getElementById('intake-modal');
  var openBtns = document.querySelectorAll('[data-open-intake]');
  var closeBtns = document.querySelectorAll('[data-close-intake]');

  function openModal(e) {
    if (!modal) return;
    if (e) e.preventDefault();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var first = modal.querySelector('input, select, textarea, button');
    if (first) setTimeout(function(){ first.focus(); }, 50);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  openBtns.forEach(function(b){ b.addEventListener('click', openModal); });
  closeBtns.forEach(function(b){ b.addEventListener('click', closeModal); });
  if (modal) {
    modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  }

  // Reveal on scroll
  var nodes = document.querySelectorAll('.reveal');
  if (nodes.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    nodes.forEach(function(n){ io.observe(n); });
  } else {
    nodes.forEach(function(n){ n.classList.add('is-in'); });
  }

  // Current year in footer
  var yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();

  // Appointment-request form: AJAX-submit so the modal stays open
  // and shows a success state. Posts to "/" — Netlify Forms intercepts it
  // when the site is deployed. In local preview the fetch fails silently
  // and we still show the success state for demo purposes.
  var apptForm = document.querySelector('form[name="appointment-request"]');
  var leadTracked = false;
  if (apptForm) {
    apptForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = apptForm.querySelector('button[type="submit"]');
      var orig = btn.textContent;
      btn.textContent = 'Sending…';
      btn.disabled = true;

      var data = new FormData(apptForm);
      var body = new URLSearchParams();
      data.forEach(function(v, k){ body.append(k, v); });

      function showSuccess() {
        // Contact modal submits in place and never reaches /thank-you.
        // Fire once, with no form fields attached.
        if (!leadTracked && typeof window.gtag === 'function') {
          leadTracked = true;
          window.gtag('event', 'generate_lead');
          if (window.fbq) window.fbq('track', 'Lead');
        }
        // Hide the prompt heading + lede that sit above the form so the
        // success state stands cleanly — otherwise both states stack and
        // the user sees "A few questions before we meet" alongside
        // "Thanks — we'll be in touch."
        var panel = apptForm.closest('.intake-modal__panel');
        if (panel) {
          var promptTitle = panel.querySelector('#intake-title');
          if (promptTitle) {
            promptTitle.style.display = 'none';
            var promptP = promptTitle.nextElementSibling;
            if (promptP && promptP.tagName === 'P') {
              promptP.style.display = 'none';
            }
          }
          // The "Appointment Request" eyebrow above the title also reads
          // off in the success state — hide it.
          var eyebrow = panel.querySelector('.eyebrow');
          if (eyebrow) eyebrow.style.display = 'none';
        }
        var parent = apptForm.parentNode;
        var box = document.createElement('div');
        box.className = 'intake-success';
        box.innerHTML =
          '<div class="intake-success__title">Thanks — we\'ll be in touch.</div>' +
          '<p>We\'ll call you within one business day to schedule. ' +
          'For anything urgent, reach the office at ' +
          '<a href="tel:+19724571530">(972) 457-1530</a>.</p>';
        parent.replaceChild(box, apptForm);
      }

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
        .then(function(r) { showSuccess(); })
        .catch(function() {
          // Network failure (e.g. previewing on a non-Netlify host) — still
          // show success so the UX is testable. On production this branch
          // shouldn't run; Netlify always returns a response.
          showSuccess();
        })
        .finally(function() { btn.disabled = false; btn.textContent = orig; });
    });
  }

  // Smooth-scroll anchor links inside the page (TOC etc.) — native smooth already on html.
})();
