/* Validation engine: reusable RegEx rules + a form lifecycle binder.
   FRONTEND SECURITY DEMO ONLY. Client-side checks improve UX but never replace server-side validation. */
(function (KC) {
  'use strict';

  // Rejects anything that looks like markup or a script URL. Defence in depth: output is also escaped via textContent.
  const MARKUP = /<[^>]*>|[<>]|javascript:|data:text\/html|\bon\w+\s*=/i;
  const RE = {
    email: /^[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/,
    name: /^[\p{L}\p{M}]+(?:[ '.-][\p{L}\p{M}]+)*$/u, // any-language letters + combining marks (e.g. Hindi matras)
    phone: /^[6-9]\d{9}$/,                              // Indian mobile: 10 digits starting 6-9
    pin: /^[1-9]\d{5}$/,                                // Indian PIN: 6 digits, no leading zero
    alnum: /^[A-Za-z0-9]+$/,
    address: /^[A-Za-z0-9][A-Za-z0-9\s,./#()-]*$/,
    upper: /[A-Z]/, lower: /[a-z]/, digit: /\d/, special: /[^A-Za-z0-9\s]/
  };

  // Strip control/zero-width characters, collapse whitespace, trim. Non-strings become ''.
  function clean(v) {
    if (typeof v !== 'string') return '';
    return v.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\ufeff]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  // Shared first-pass checks: type, length cap BEFORE any regex (avoids slow matching), empty, markup.
  function base(value, label, max) {
    if (typeof value !== 'string') return 'Invalid input type for ' + label.toLowerCase() + '.';
    if (value.length > 1000) return label + ' is too long.';
    const s = clean(value);
    if (!s) return label + ' is required.';
    if (s.length > max) return label + ' must be ' + max + ' characters or fewer.';
    if (MARKUP.test(s)) return label + ' cannot contain HTML or script code.';
    return '';
  }

  function normalizePhone(v) {
    return clean(v).replace(/[\s-]/g, '').replace(/^(?:\+91|91|0)(?=\d{10}$)/, '');
  }

  const rules = {
    name(v) {
      const e = base(v, 'Full name', 60); if (e) return e;
      const s = clean(v);
      if (s.length < 2) return 'Full name must be at least 2 characters.';
      if (/\d/.test(s)) return 'Full name cannot contain numbers.';
      if (!RE.name.test(s)) return 'Use letters, spaces, apostrophes, dots or hyphens only.';
      return '';
    },
    email(v) {
      const e = base(v, 'Email address', 254); if (e) return e;
      const s = clean(v);
      if (/\s/.test(s)) return 'Email cannot contain spaces.';
      if (!s.includes('@')) return 'Email must include an @ symbol.';
      if ((s.match(/@/g) || []).length > 1) return 'Email can contain only one @ symbol.';
      if (s.split('@')[0].length > 64) return 'The part before @ must be 64 characters or fewer.';
      if (/\.\./.test(s) || /^\.|\.@/.test(s)) return 'Email cannot have consecutive dots or a dot at the start or end of the name.';
      if (!RE.email.test(s)) return 'Enter a valid email such as name@example.com.';
      return '';
    },
    phone(v) {
      const e = base(v, 'Phone number', 20); if (e) return e;
      const s = normalizePhone(v);
      if (/\D/.test(s)) return 'Phone number can contain digits only (an optional +91 prefix is allowed).';
      if (s.length !== 10) return 'Phone number must be exactly 10 digits (' + s.length + ' entered).';
      if (!RE.phone.test(s)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
      return '';
    },
    password(v) { // never trimmed or altered: spaces are rejected instead
      if (typeof v !== 'string') return 'Invalid input type for password.';
      if (!v) return 'Password is required.';
      if (v.length > 64) return 'Password must be 64 characters or fewer.';
      if (/\s/.test(v)) return 'Password cannot contain spaces.';
      const need = [];
      if (v.length < 8) need.push('at least 8 characters');
      if (!RE.upper.test(v)) need.push('an uppercase letter');
      if (!RE.lower.test(v)) need.push('a lowercase letter');
      if (!RE.digit.test(v)) need.push('a number');
      if (!RE.special.test(v)) need.push('a special character');
      return need.length ? 'Password needs ' + need.join(', ') + '.' : '';
    },
    confirm(v, password) {
      if (typeof v !== 'string') return 'Invalid input type for password confirmation.';
      if (!v) return 'Please confirm your password.';
      return v === password ? '' : 'Passwords do not match.';
    },
    alnum(v, label, max) {
      const e = base(v, label, max); if (e) return e;
      return RE.alnum.test(clean(v)) ? '' : label + ' can contain letters and numbers only (no spaces or symbols).';
    },
    pin(v) {
      const e = base(v, 'PIN code', 10); if (e) return e;
      const s = clean(v);
      if (/\D/.test(s)) return 'PIN code can contain digits only.';
      if (s.length !== 6) return 'PIN code must be exactly 6 digits.';
      return RE.pin.test(s) ? '' : 'PIN code cannot start with 0.';
    },
    address(v) {
      const e = base(v, 'Street address', 120); if (e) return e;
      const s = clean(v);
      if (s.length < 5) return 'Street address must be at least 5 characters.';
      return RE.address.test(s) ? '' : 'Street address can use letters, numbers and , . / # ( ) - only.';
    },
    city(v) {
      const e = base(v, 'City', 40); if (e) return e;
      return RE.name.test(clean(v)) ? '' : 'City can contain letters, spaces, dots, apostrophes and hyphens only.';
    },
    choice(v, allowed, message) { // guards against tampered <select>/radio values
      return typeof v === 'string' && allowed.indexOf(v) !== -1 ? '' : message;
    }
  };

  const notify = (t, m) => { if (KC.ui && KC.ui.notify) KC.ui.notify(t, m); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* bindForm(form, specs, opts)
     spec: { name, validate(raw, allRaw) -> message|'', normalize?(raw), raw?:true (never trim), also?:[names to revalidate] }
     opts: { onValid(values, ctrl) -> 'keep' | false | undefined, busyLabel, delay } */
  function bindForm(form, specs, opts) {
    opts = opts || {};
    form.setAttribute('novalidate', ''); // we show our own messages
    const state = { submitting: false };
    const touched = {};
    const statusEl = form.querySelector('.form-status');
    const btn = form.querySelector('[type="submit"]');
    const label = btn && btn.querySelector('.btn-label');
    const idleLabel = label ? label.textContent : '';
    const nodesOf = (n) => Array.prototype.slice.call(form.querySelectorAll('[name="' + n + '"]'));

    function read(spec) {
      const nodes = nodesOf(spec.name), first = nodes[0];
      if (!first) return '';
      if (first.type === 'checkbox') return first.checked;
      if (first.type === 'radio') { const c = nodes.filter((n) => n.checked)[0]; return c ? c.value : ''; }
      return first.value;
    }
    function readAll() { const all = {}; specs.forEach((s) => { all[s.name] = read(s); }); return all; }

    function show(spec, msg) {
      const nodes = nodesOf(spec.name);
      const box = nodes[0].closest('.field') || nodes[0].parentElement;
      let err = box.querySelector('.field-error');
      if (!err) {
        err = document.createElement('p');
        err.className = 'field-error'; err.id = 'err-' + spec.name; err.setAttribute('role', 'alert');
        box.appendChild(err);
      }
      err.textContent = msg; // textContent: message is never parsed as HTML
      box.classList.add('has-error');
      nodes.forEach((n) => { n.classList.add('is-invalid'); n.classList.remove('is-valid'); n.setAttribute('aria-invalid', 'true'); n.setAttribute('aria-describedby', err.id); });
    }
    function clear(spec) {
      const nodes = nodesOf(spec.name);
      const box = nodes[0].closest('.field') || nodes[0].parentElement;
      const err = box.querySelector('.field-error');
      if (err) err.remove();
      box.classList.remove('has-error');
      nodes.forEach((n) => { n.classList.remove('is-invalid'); n.classList.add('is-valid'); n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
    }
    function validateField(spec) {
      const msg = spec.validate(read(spec), readAll());
      if (msg) show(spec, msg); else clear(spec);
      return !msg;
    }
    function check(spec) {
      touched[spec.name] = true;
      validateField(spec);
      (spec.also || []).forEach((n) => { const o = specs.filter((s) => s.name === n)[0]; if (o && touched[n]) validateField(o); });
    }

    specs.forEach((spec) => {
      nodesOf(spec.name).forEach((n) => {
        n.addEventListener('input', () => { if (touched[spec.name]) check(spec); }); // live feedback once the field has been visited
        n.addEventListener('change', () => check(spec));
        n.addEventListener('blur', () => {
          if (!spec.raw && n.matches('input[type="text"],input[type="email"],input[type="tel"]')) n.value = clean(n.value); // show trimmed value
          check(spec);
        });
      });
    });

    function setBusy(on, text) {
      state.submitting = on;
      if (btn) { btn.disabled = on; btn.classList.toggle('is-loading', on); btn.setAttribute('aria-busy', String(on)); }
      if (label) label.textContent = on ? (opts.busyLabel || 'Processing…') : idleLabel;
      if (statusEl) statusEl.textContent = text || '';
    }

    const ctrl = {
      setError(name, msg) {
        const s = specs.filter((x) => x.name === name)[0];
        if (!s) return; touched[name] = true; show(s, msg);
        const f = nodesOf(name)[0]; if (f && f.focus) f.focus();
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault(); // stop the native reload/navigation
      if (state.submitting) return; // duplicate-submission guard (covers double-click and repeated Enter)
      let firstBad = null, bad = 0;
      specs.forEach((s) => { touched[s.name] = true; if (!validateField(s)) { bad++; if (!firstBad) firstBad = s; } });
      if (bad) {
        if (statusEl) statusEl.textContent = '';
        notify('error', 'Please fix ' + bad + ' highlighted field' + (bad > 1 ? 's' : '') + ' before continuing.');
        const f = nodesOf(firstBad.name)[0]; if (f && f.focus) f.focus();
        return;
      }
      const values = {};
      specs.forEach((s) => { // normalised copy: this is what the app uses, never the raw DOM value
        const raw = read(s);
        values[s.name] = s.normalize ? s.normalize(raw) : (typeof raw === 'string' && !s.raw ? clean(raw) : raw);
      });
      setBusy(true, 'Validating and submitting securely (simulated)…');
      let keep = false;
      try {
        await sleep(opts.delay == null ? 900 : opts.delay);
        const result = await opts.onValid(values, ctrl);
        keep = result === 'keep';
        if (result === false) notify('error', 'Please fix the highlighted field and try again.');
      } catch (err) {
        notify('error', err && err.message ? err.message : 'Something went wrong. Please try again.');
      } finally {
        if (!keep) setBusy(false, '');
      }
    });
    return ctrl;
  }

  KC.Validation = { clean: clean, RE: RE, rules: rules, normalizePhone: normalizePhone, bindForm: bindForm };
})(window.KC = window.KC || {});
