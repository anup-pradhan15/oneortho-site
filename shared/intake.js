/* One Ortho — full patient intake wizard
   Steps, validation, localStorage autosave, review, Netlify submit.
*/
(function () {
  'use strict';

  var STORAGE_KEY = 'oneortho-patient-intake-v2';
  var MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB (Netlify file limit headroom)
  var ACCEPT_TYPES = {
    'image/png': true,
    'image/jpeg': true,
    'image/webp': true,
    'image/heic': true,
    'image/heif': true
  };

  var form = document.querySelector('.intake-form-full');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.intake-step'));
  var progressItems = Array.prototype.slice.call(
    document.querySelectorAll('.intake-progress__list > li')
  );
  var prevBtn = form.querySelector('[data-intake-prev]');
  var nextBtn = form.querySelector('[data-intake-next]');
  var submitBtn = form.querySelector('[data-intake-submit]');
  var saveEl = form.querySelector('.intake-save-state');
  var reviewEl = form.querySelector('.intake-review');
  var successEl = document.querySelector('.intake-success-full');
  var pageHero = document.querySelector('.page-hero');
  var intakePage = document.querySelector('.intake-page');
  var clearBtn = document.querySelector('[data-intake-clear]');

  var current = 0;
  var saveTimer = null;
  var submitting = false;

  var REVIEW_SECTIONS = [
    {
      title: 'You',
      step: 0,
      fields: [
        { name: 'name', label: 'Name' },
        { name: 'dob', label: 'Date of birth' },
        { name: 'sex', label: 'Sex' },
        { name: 'phone', label: 'Phone' },
        { name: 'email', label: 'Email' },
        { name: 'contact_method', label: 'Preferred contact' },
        { name: 'best_time', label: 'Best time' },
        { name: 'street', label: 'Street' },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State' },
        { name: 'zip', label: 'ZIP' },
        { name: 'has_insurance', label: 'Insurance' },
        { name: 'insurance_carrier', label: 'Carrier' },
        { name: 'member_id', label: 'Member ID' },
        { name: 'group_id', label: 'Group #' },
        { name: 'subscriber', label: 'Subscriber' },
        { name: 'was_referred', label: 'Referred' },
        { name: 'referring_doctor', label: 'Referring doctor' },
        { name: 'referring_practice', label: 'Referring practice' },
        { name: 'pcp', label: 'Primary care' },
        { name: 'ec_name', label: 'Emergency contact' },
        { name: 'ec_phone', label: 'EC phone' },
        { name: 'ec_relationship', label: 'EC relationship' },
        { name: 'occupation', label: 'Occupation' },
        { name: 'activity_level', label: 'Activity level' },
        { name: 'activities', label: 'Activities' },
        { name: 'goals', label: 'Goals' },
        { name: 'how_heard', label: 'How you heard' }
      ]
    },
    {
      title: 'Your visit',
      step: 1,
      fields: [
        { name: 'body_part', label: 'Body part(s)' },
        { name: 'side', label: 'Side' },
        { name: 'duration', label: 'Duration' },
        { name: 'onset', label: 'Onset' },
        { name: 'injury_date', label: 'Injury date' },
        { name: 'pain_now', label: 'Pain now' },
        { name: 'pain_worst', label: 'Pain at worst' },
        { name: 'worse', label: 'Makes it worse' },
        { name: 'tried', label: 'Tried so far' },
        { name: 'imaging', label: 'Imaging' },
        { name: 'imaging_have', label: 'Have images/report' },
        { name: 'description', label: 'Notes' }
      ]
    }
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function flashSaved() {
    if (!saveEl) return;
    saveEl.textContent = 'Saved';
    saveEl.classList.add('is-flashed');
    clearTimeout(flashSaved._t);
    flashSaved._t = setTimeout(function () {
      saveEl.classList.remove('is-flashed');
    }, 1600);
  }

  function collectValues() {
    var data = {};
    var elements = form.querySelectorAll('input, select, textarea');
    Array.prototype.forEach.call(elements, function (el) {
      var name = el.name;
      if (!name || name === 'bot-field' || name === 'form-name') return;
      if (el.type === 'file') return;
      if (el.type === 'checkbox') {
        if (!el.checked) return;
        if (!data[name]) data[name] = [];
        data[name].push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) data[name] = el.value;
      } else {
        data[name] = el.value;
      }
    });
    return data;
  }

  function applyValues(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (name) {
      var val = data[name];
      var els = form.querySelectorAll('[name="' + name + '"]');
      if (!els.length) return;
      Array.prototype.forEach.call(els, function (el) {
        if (el.type === 'file') return;
        if (el.type === 'checkbox') {
          var list = Array.isArray(val) ? val : [val];
          el.checked = list.indexOf(el.value) !== -1;
        } else if (el.type === 'radio') {
          el.checked = el.value === val;
        } else {
          el.value = val == null ? '' : String(val);
        }
      });
    });
  }

  function saveDraft() {
    try {
      var payload = {
        step: current,
        values: collectValues(),
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      flashSaved();
    } catch (e) {
      /* quota / private mode */
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var payload = JSON.parse(raw);
      applyValues(payload.values || {});
      if (typeof payload.step === 'number' && payload.step >= 0 && payload.step < steps.length) {
        current = payload.step;
      }
    } catch (e) {
      /* ignore */
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function updateReveals() {
    var nodes = form.querySelectorAll('[data-reveal-when]');
    Array.prototype.forEach.call(nodes, function (node) {
      var rule = node.getAttribute('data-reveal-when') || '';
      var parts = rule.split('=');
      var name = parts[0];
      var want = parts.slice(1).join('=');
      var checked = form.querySelector(
        'input[name="' + name + '"]:checked'
      );
      var show = checked && checked.value === want;
      if (show) node.removeAttribute('hidden');
      else node.setAttribute('hidden', '');
    });
  }

  function clearErrors(stepEl) {
    Array.prototype.forEach.call(stepEl.querySelectorAll('.is-error'), function (el) {
      el.classList.remove('is-error');
    });
  }

  function markFieldError(el) {
    var field = el.closest('.intake-field');
    if (field) field.classList.add('is-error');
  }

  function markGroupError(group) {
    group.classList.add('is-error');
    var field = group.closest('.intake-field');
    if (field) field.classList.add('is-error');
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.closest('[hidden]')) return false;
    var reveal = el.closest('[data-reveal-when]');
    if (reveal && reveal.hasAttribute('hidden')) return false;
    return true;
  }

  function validateStep(index) {
    var stepEl = steps[index];
    if (!stepEl) return true;
    clearErrors(stepEl);
    var ok = true;
    var firstBad = null;

    // Required native controls
    Array.prototype.forEach.call(
      stepEl.querySelectorAll('input[required], select[required], textarea[required]'),
      function (el) {
        if (!isVisible(el)) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          var group = form.querySelectorAll('[name="' + el.name + '"]');
          var any = Array.prototype.some.call(group, function (g) {
            return g.checked;
          });
          if (!any) {
            ok = false;
            markFieldError(el);
            if (!firstBad) firstBad = el;
          }
        } else if (!String(el.value || '').trim()) {
          ok = false;
          markFieldError(el);
          if (!firstBad) firstBad = el;
        } else if (el.type === 'email' && el.value) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) {
            ok = false;
            markFieldError(el);
            if (!firstBad) firstBad = el;
          }
        } else if (el.type === 'tel' && el.value) {
          var digits = el.value.replace(/\D/g, '');
          if (digits.length < 10) {
            ok = false;
            markFieldError(el);
            if (!firstBad) firstBad = el;
          }
        }
      }
    );

    // Optional email / tel format when filled
    Array.prototype.forEach.call(
      stepEl.querySelectorAll('input[type="email"]:not([required])'),
      function (el) {
        if (!isVisible(el) || !el.value) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) {
          ok = false;
          markFieldError(el);
          if (!firstBad) firstBad = el;
        }
      }
    );

    // Required option groups
    Array.prototype.forEach.call(
      stepEl.querySelectorAll('[data-required-group]'),
      function (group) {
        if (!isVisible(group)) return;
        var name = group.getAttribute('data-required-group');
        var inputs = group.querySelectorAll('input[name="' + name + '"]');
        if (!inputs.length) {
          // pain-scale uses name on inputs inside
          inputs = group.querySelectorAll('input');
        }
        var any = Array.prototype.some.call(inputs, function (inp) {
          return inp.checked;
        });
        if (!any) {
          ok = false;
          markGroupError(group);
          if (!firstBad) firstBad = inputs[0] || group;
        }
      }
    );

    if (!ok && firstBad && firstBad.focus) {
      try {
        firstBad.focus({ preventScroll: false });
      } catch (e) {
        firstBad.focus();
      }
      var field = firstBad.closest('.intake-field') || firstBad;
      if (field.scrollIntoView) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    return ok;
  }

  function showStep(index) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach(function (step, i) {
      step.classList.toggle('is-current', i === current);
    });
    progressItems.forEach(function (li, i) {
      li.classList.toggle('is-current', i === current);
      li.classList.toggle('is-done', i < current);
    });
    if (prevBtn) prevBtn.disabled = current === 0;
    var last = current === steps.length - 1;
    if (nextBtn) nextBtn.hidden = last;
    if (submitBtn) submitBtn.hidden = !last;
    if (last) buildReview();
    updateReveals();
    // Scroll wizard into view (not full page jump on restore)
    var sticky = document.querySelector('.intake-progress');
    if (sticky) {
      var top = sticky.getBoundingClientRect().top;
      if (top < 0 || top > 120) {
        sticky.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    scheduleSave();
  }

  function getFieldValues(name) {
    var els = form.querySelectorAll('[name="' + name + '"]');
    if (!els.length) return '';
    var first = els[0];
    if (first.type === 'checkbox') {
      var vals = [];
      Array.prototype.forEach.call(els, function (el) {
        if (el.checked) vals.push(el.value);
      });
      return vals.join(', ');
    }
    if (first.type === 'radio') {
      var checked = form.querySelector('[name="' + name + '"]:checked');
      return checked ? checked.value : '';
    }
    return first.value || '';
  }

  function buildReview() {
    if (!reviewEl) return;
    var html = '';
    REVIEW_SECTIONS.forEach(function (section) {
      html += '<div class="intake-review__section">';
      html +=
        '<h3>' +
        section.title +
        ' <button type="button" class="intake-review__edit" data-edit-step="' +
        section.step +
        '">Edit</button></h3>';
      html += '<dl>';
      section.fields.forEach(function (f) {
        var val = getFieldValues(f.name);
        var display = val && String(val).trim() ? escapeHtml(String(val).trim()) : '<span class="intake-review__empty">—</span>';
        html +=
          '<div><dt>' +
          escapeHtml(f.label) +
          '</dt><dd>' +
          display +
          '</dd></div>';
      });
      // File names if present
      if (section.step === 0) {
        var front = form.querySelector('#i-card-front');
        var back = form.querySelector('#i-card-back');
        if (front && front.files && front.files[0]) {
          html +=
            '<div><dt>Card front</dt><dd>' +
            escapeHtml(front.files[0].name) +
            '</dd></div>';
        }
        if (back && back.files && back.files[0]) {
          html +=
            '<div><dt>Card back</dt><dd>' +
            escapeHtml(back.files[0].name) +
            '</dd></div>';
        }
      }
      html += '</dl></div>';
    });
    reviewEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showSuccess() {
    if (pageHero) pageHero.style.display = 'none';
    if (intakePage) intakePage.style.display = 'none';
    if (successEl) {
      successEl.setAttribute('data-shown', '');
      successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function resetToNew() {
    clearDraft();
    form.reset();
    // Clear upload UI
    Array.prototype.forEach.call(form.querySelectorAll('[data-upload-slot]'), function (slot) {
      clearUploadSlot(slot);
    });
    if (successEl) successEl.removeAttribute('data-shown');
    if (pageHero) pageHero.style.display = '';
    if (intakePage) intakePage.style.display = '';
    current = 0;
    updateReveals();
    showStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function clearUploadSlot(slot) {
    var input = slot.querySelector('input[type="file"]');
    var zone = slot.querySelector('[data-upload-zone]');
    var err = slot.querySelector('.upload-slot__error');
    if (input) {
      input.value = '';
    }
    if (zone) {
      zone.classList.remove('has-file', 'is-over', 'is-processing');
      var img = zone.querySelector('.upload-slot__preview img');
      if (img) {
        if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
        img.removeAttribute('src');
      }
      var fn = zone.querySelector('.upload-slot__filename');
      var sz = zone.querySelector('.upload-slot__size');
      if (fn) fn.textContent = '';
      if (sz) sz.textContent = '';
    }
    if (err) {
      err.textContent = '';
      err.classList.remove('is-shown');
    }
  }

  function setUploadError(slot, msg) {
    var err = slot.querySelector('.upload-slot__error');
    if (!err) return;
    err.textContent = msg || '';
    err.classList.toggle('is-shown', !!msg);
  }

  function handleFile(slot, file) {
    setUploadError(slot, '');
    if (!file) return;
    if (file.type && !ACCEPT_TYPES[file.type] && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      setUploadError(slot, 'Please use a JPG, PNG, WEBP, or HEIC image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(slot, 'That file is too large (max 8 MB). Try a smaller photo.');
      return;
    }
    var input = slot.querySelector('input[type="file"]');
    var zone = slot.querySelector('[data-upload-zone]');
    if (!input || !zone) return;

    // Assign via DataTransfer so the input carries the file for FormData
    try {
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (e) {
      /* some browsers only allow user picker assignment — zone click path still works */
    }

    zone.classList.add('is-processing');
    var img = zone.querySelector('.upload-slot__preview img');
    var fn = zone.querySelector('.upload-slot__filename');
    var sz = zone.querySelector('.upload-slot__size');
    if (fn) fn.textContent = file.name;
    if (sz) sz.textContent = formatBytes(file.size);

    var url = URL.createObjectURL(file);
    if (img) {
      if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
      img.onload = function () {
        zone.classList.remove('is-processing');
        zone.classList.add('has-file');
      };
      img.onerror = function () {
        // HEIC may not preview in all browsers — still keep file
        zone.classList.remove('is-processing');
        zone.classList.add('has-file');
      };
      img.src = url;
    } else {
      zone.classList.remove('is-processing');
      zone.classList.add('has-file');
    }
  }

  function initUploads() {
    Array.prototype.forEach.call(form.querySelectorAll('[data-upload-slot]'), function (slot) {
      var input = slot.querySelector('input[type="file"]');
      var zone = slot.querySelector('[data-upload-zone]');
      if (!input || !zone) return;

      zone.addEventListener('click', function (e) {
        if (e.target.closest('[data-upload-replace]') || e.target.closest('[data-upload-clear]')) return;
        if (zone.classList.contains('has-file')) return;
        input.click();
      });

      var replaceBtn = slot.querySelector('[data-upload-replace]');
      var clearBtnLocal = slot.querySelector('[data-upload-clear]');
      if (replaceBtn) {
        replaceBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          input.click();
        });
      }
      if (clearBtnLocal) {
        clearBtnLocal.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          clearUploadSlot(slot);
        });
      }

      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (file) handleFile(slot, file);
      });

      ;['dragenter', 'dragover'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('is-over');
        });
      });
      ;['dragleave', 'drop'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('is-over');
        });
      });
      zone.addEventListener('drop', function (e) {
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(slot, file);
      });
    });
  }

  function setSubmitting(on) {
    submitting = on;
    if (submitBtn) {
      submitBtn.disabled = on;
      submitBtn.textContent = on ? 'Submitting…' : 'Submit intake';
    }
    if (nextBtn) nextBtn.disabled = on;
    if (prevBtn) prevBtn.disabled = on || current === 0;
  }

  function submitForm(e) {
    if (e) e.preventDefault();
    if (submitting) return;
    if (!validateStep(current)) return;

    setSubmitting(true);
    var fd = new FormData(form);
    // Ensure form-name for Netlify
    if (!fd.get('form-name')) fd.set('form-name', 'patient-intake');

    fetch('/', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fd
    })
      .then(function (res) {
        if (!res.ok && res.status !== 200 && res.status !== 303) {
          throw new Error('Submit failed (' + res.status + ')');
        }
        clearDraft();
        showSuccess();
      })
      .catch(function () {
        // Fallback: native multipart submit (still posts to Netlify)
        try {
          form.submit();
        } catch (err) {
          alert('We could not submit your intake. Please call (972) 457-1530 or try again.');
          setSubmitting(false);
        }
      })
      .then(function () {
        // If SPA success shown, re-enable for "new intake"
        if (successEl && successEl.hasAttribute('data-shown')) {
          setSubmitting(false);
          if (submitBtn) submitBtn.textContent = 'Submit intake';
        }
      });
  }

  // Events
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (!validateStep(current)) return;
      showStep(current + 1);
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      showStep(current - 1);
    });
  }

  form.addEventListener('submit', submitForm);

  form.addEventListener('click', function (e) {
    var edit = e.target.closest('[data-edit-step]');
    if (!edit) return;
    var idx = parseInt(edit.getAttribute('data-edit-step'), 10);
    if (!isNaN(idx)) showStep(idx);
  });

  form.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || t.type === 'file') return;
    var field = t.closest('.intake-field');
    if (field) field.classList.remove('is-error');
    var group = t.closest('[data-required-group], .opt-group, .pain-scale');
    if (group) group.classList.remove('is-error');
    scheduleSave();
  });

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (!t) return;
    if (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT') {
      updateReveals();
      scheduleSave();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      resetToNew();
    });
  }

  // Init
  initUploads();
  loadDraft();
  updateReveals();
  showStep(current);
})();
