/* Functional tests. Browser: open tests.html. Node: see README. */
(function (KC) {
  'use strict';
  const V = KC.Validation, R = V.rules, C = KC.Cart, tests = [];
  const test = (name, fn) => tests.push({ name: name, fn: fn });
  const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
  const valid = (msg) => ok(msg === '', 'expected valid, got: ' + msg);
  const invalid = (msg, part) => { ok(msg !== '', 'expected an error'); if (part) ok(msg.toLowerCase().indexOf(part) !== -1, 'message "' + msg + '" should mention "' + part + '"'); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hasDom = () => typeof document !== 'undefined';

  test('Valid email accepted (trimmed, plus-address)', () => valid(R.email('  Ismail.K+shop@example.co.in ')));
  test('Invalid email rejected (missing @)', () => invalid(R.email('ismail.example.com'), '@'));
  test('Malformed emails rejected (double dot, no TLD, spaces)', () => { invalid(R.email('a..b@example.com')); invalid(R.email('a@example')); invalid(R.email('a b@example.com'), 'spaces'); });
  test('Weak password rejected with specific message', () => invalid(R.password('abc123'), 'uppercase'));
  test('Strong password accepted', () => valid(R.password('Str0ng#Pass')));
  test('Incorrect phone numbers rejected', () => { invalid(R.phone('12345'), '10 digits'); invalid(R.phone('5876543210'), '6, 7, 8 or 9'); invalid(R.phone('98765abcde'), 'digits'); });
  test('Valid phone accepted (also with +91 and hyphen)', () => { valid(R.phone('9876543210')); valid(R.phone('+91 98765-43210')); });
  test('Empty values rejected', () => { invalid(R.name(''), 'required'); invalid(R.email(''), 'required'); invalid(R.password(''), 'required'); invalid(R.pin(''), 'required'); });
  test('Whitespace-only values rejected', () => { invalid(R.name('     '), 'required'); invalid(R.address('\t  \n'), 'required'); invalid(R.city('   '), 'required'); });
  test('Leading/trailing spaces are trimmed', () => { ok(V.clean('   Ismail   Khan  ') === 'Ismail Khan'); valid(R.name('  Ismail Khan  ')); });
  test('Password mismatch detected', () => { invalid(R.confirm('Str0ng#Pass!', 'Str0ng#Pass'), 'match'); valid(R.confirm('Str0ng#Pass', 'Str0ng#Pass')); });
  test('Script / HTML injection rejected in every text rule', () => {
    ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'javascript:alert(1)'].forEach((p) => { invalid(R.name(p)); invalid(R.address(p)); invalid(R.city(p)); invalid(R.alnum(p, 'Flat', 20)); });
  });
  test('Invalid PIN codes rejected, valid accepted', () => { invalid(R.pin('12345'), '6 digits'); invalid(R.pin('012345'), 'start with 0'); invalid(R.pin('12a456'), 'digits'); valid(R.pin('226001')); });
  test('Extremely long input rejected quickly', () => { invalid(R.name('a'.repeat(100000)), 'too long'); invalid(R.email('a'.repeat(300) + '@x.com')); invalid(R.password('Aa1!'.repeat(30))); });
  test('Invalid data types rejected', () => { invalid(R.name(null)); invalid(R.email(12345)); invalid(R.password({})); invalid(R.pin(undefined)); });
  test('Unexpected special characters rejected', () => invalid(R.name('Ismail$#'), 'letters'));
  test('Alphanumeric restriction enforced', () => { valid(R.alnum('12B', 'Flat', 20)); invalid(R.alnum('12 B!', 'Flat', 20)); });
  test('Names with apostrophes, hyphens and Hindi accepted', () => { valid(R.name("Mary-Anne O'Neil")); valid(R.name('इस्माइल खान')); });
  test('Tampered select/radio values rejected', () => invalid(R.choice('hacked', ['upi', 'card', 'cod'], 'Choose a payment method.')));

  test('Cart: add, quantity update and remove', () => {
    C.clear(); C.add('kb-aero'); C.add('ms-orbit'); C.add('ms-orbit');
    ok(C.count() === 3, 'count after adds'); C.change('ms-orbit', -1); ok(C.count() === 2, 'after decrement');
    C.change('ms-orbit', -1); ok(C.count() === 2, 'quantity never drops below 1'); C.setQty('ms-orbit', 99); ok(C.detailed()[1].qty === C.MAX_QTY, 'quantity capped');
    C.remove('kb-aero'); ok(C.detailed().length === 1, 'removed'); C.clear(); ok(C.count() === 0);
  });
  test('Cart: unknown products refused', () => { C.clear(); ok(C.add('<img src=x>').ok === false); ok(C.count() === 0); });
  test('Cart: totals correct (free shipping)', () => { const t = C.totals([{ id: 'kb-aero', qty: 1 }, { id: 'ms-orbit', qty: 2 }]); ok(t.subtotal === 8597 && t.tax === 1547 && t.shipping === 0 && t.total === 10144, JSON.stringify(t)); });
  test('Cart: totals correct (paid shipping)', () => { const t = C.totals([{ id: 'ms-orbit', qty: 1 }]); ok(t.subtotal === 1799 && t.tax === 324 && t.shipping === 99 && t.total === 2222, JSON.stringify(t)); });

  function build() {
    const f = document.createElement('form');
    f.innerHTML = '<div class="field"><input name="email" type="text"></div><div class="field"><input name="pw" type="password"></div><button type="submit"><span class="btn-label">Go</span></button><p class="form-status"></p>';
    document.body.append(f);
    return f;
  }
  const specs = () => [{ name: 'email', validate: R.email }, { name: 'pw', validate: R.password, raw: true }];
  const submit = (f) => f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

  test('Empty form submission blocked and errors rendered (DOM)', async () => {
    if (!hasDom()) return 'skip';
    const f = build(); let calls = 0; V.bindForm(f, specs(), { delay: 5, onValid() { calls++; } });
    submit(f); await sleep(30);
    ok(calls === 0, 'onValid must not run'); ok(f.querySelectorAll('.field-error').length === 2, 'two inline errors'); ok(!f.querySelector('.field-error *'), 'errors are plain text'); f.remove();
  });
  test('Errors clear automatically once input becomes valid (DOM)', async () => {
    if (!hasDom()) return 'skip';
    const f = build(); V.bindForm(f, specs(), { delay: 5, onValid() {} });
    submit(f); const e = f.querySelector('[name="email"]'); e.value = 'user@example.com'; e.dispatchEvent(new Event('input', { bubbles: true }));
    ok(!e.classList.contains('is-invalid') && e.classList.contains('is-valid'), 'classes updated'); ok(f.querySelectorAll('.field-error').length === 1, 'only password error left'); f.remove();
  });
  test('Valid submit succeeds once; duplicate submission prevented (DOM)', async () => {
    if (!hasDom()) return 'skip';
    const f = build(); let calls = 0; V.bindForm(f, specs(), { delay: 30, onValid() { calls++; } });
    f.querySelector('[name="email"]').value = '  user@example.com '; f.querySelector('[name="pw"]').value = 'Str0ng#Pass';
    submit(f); submit(f); submit(f); await sleep(80);
    ok(calls === 1, 'onValid ran ' + calls + ' times'); ok(!f.querySelector('button').disabled, 'button re-enabled after finish'); f.remove();
  });

  KC.runTests = async function () {
    const out = [];
    for (const t of tests) {
      try { const r = await t.fn(); out.push({ name: t.name, status: r === 'skip' ? 'skip' : 'pass' }); }
      catch (e) { out.push({ name: t.name, status: 'fail', error: e.message }); }
    }
    return out;
  };

  if (hasDom() && document.getElementById('testResults')) {
    const go = () => KC.runTests().then((res) => {
      const list = document.getElementById('testResults');
      res.forEach((r) => { const li = document.createElement('li'); li.className = r.status === 'skip' ? 'skip-t' : r.status; li.textContent = (r.status === 'pass' ? 'PASS: ' : r.status === 'fail' ? 'FAIL: ' : 'SKIP: ') + r.name + (r.error ? ' (' + r.error + ')' : ''); list.append(li); });
      const bad = res.filter((r) => r.status === 'fail').length;
      document.getElementById('testSummary').textContent = bad ? bad + ' of ' + res.length + ' tests failed.' : 'All ' + res.length + ' tests passed.';
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }
})(window.KC = window.KC || {});
