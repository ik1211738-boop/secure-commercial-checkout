/* Module A: secure registration. */
(function (KC) {
  'use strict';
  const form = document.getElementById('registerForm');
  if (!form) return;
  const V = KC.Validation, R = V.rules;

  function readUsers() {
    try { const u = JSON.parse(localStorage.getItem('kc_users')); return Array.isArray(u) ? u.filter((x) => typeof x === 'string') : []; } catch (e) { return []; }
  }

  V.bindForm(form, [
    { name: 'fullName', validate: R.name },
    { name: 'email', validate: R.email, normalize: (s) => V.clean(s).toLowerCase() },
    { name: 'phone', validate: R.phone, normalize: V.normalizePhone },
    { name: 'password', validate: R.password, raw: true, also: ['confirm'] },
    { name: 'confirm', validate: (v, all) => R.confirm(v, all.password), raw: true },
    { name: 'terms', validate: (v) => (v === true ? '' : 'You must accept the Terms & Conditions to register.') }
  ], {
    busyLabel: 'Creating account…',
    onValid(values, ctrl) {
      const users = readUsers();
      if (users.indexOf(values.email) !== -1) {
        ctrl.setError('email', 'An account with this email already exists in this browser. Use a different email, or clear site data to reset the demo.');
        return false;
      }
      users.push(values.email);
      // Demo only: we store the email to detect duplicates. The password is never stored or logged.
      try { localStorage.setItem('kc_users', JSON.stringify(users)); } catch (e) { /* ignore */ }
      try { sessionStorage.setItem('kc_last', JSON.stringify({ type: 'registration', name: values.fullName, email: values.email })); }
      catch (e) { throw new Error('Your browser blocked session storage, so the confirmation page cannot be shown.'); }
      KC.ui.notify('success', 'Account created. Taking you to your confirmation…');
      setTimeout(() => { location.href = 'success.html'; }, 700);
      return 'keep'; // keep the button locked while redirecting
    }
  });
})(window.KC = window.KC || {});
