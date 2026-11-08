/* Module B: cart management, checkout form, and the confirmation screen. */
(function (KC) {
  'use strict';
  const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];
  const PAY = {
    upi: { label: 'UPI', note: 'Simulation only: no UPI request is sent and no payment details are collected.' },
    card: { label: 'Credit / debit card', note: 'Simulation only: this demo never asks for or stores card numbers.' },
    cod: { label: 'Cash on delivery', note: 'You would pay the courier on delivery. Simulated: nothing is charged.' }
  };
  const $ = (id) => document.getElementById(id);
  const btn = (action, id, text, label, extra) => KC.el('button', Object.assign({ type: 'button', class: extra || 'qty-btn', 'data-action': action, 'data-id': id, 'aria-label': label }, {}), text);

  function renderCart() {
    const list = $('cartLines'); if (!list) return;
    list.replaceChildren();
    const rows = KC.Cart.detailed();
    if (!rows.length) {
      list.append(KC.el('div', { class: 'empty' }, KC.el('p', { text: 'Your cart is empty.' }),
        KC.el('a', { class: 'btn btn-ghost', href: 'index.html' }, KC.el('span', { class: 'btn-label', text: 'Browse gear' }))));
    }
    rows.forEach((r) => {
      const p = r.product, q = r.qty;
      const dec = btn('dec', p.id, '−', 'Decrease quantity of ' + p.name); if (q <= 1) dec.disabled = true;
      const inc = btn('inc', p.id, '+', 'Increase quantity of ' + p.name); if (q >= KC.Cart.MAX_QTY) inc.disabled = true;
      list.append(KC.el('div', { class: 'line' },
        KC.el('img', { src: p.image, alt: '', width: 72, height: 54 }),
        KC.el('div', { class: 'line-info' }, KC.el('strong', { text: p.name }), KC.el('span', { class: 'muted small', text: KC.fmt(p.price) + ' each' })),
        KC.el('div', { class: 'qty', role: 'group', 'aria-label': 'Quantity for ' + p.name }, dec, KC.el('output', { text: String(q) }), inc),
        KC.el('strong', { class: 'line-total', text: KC.fmt(p.price * q) }),
        btn('remove', p.id, 'Remove', 'Remove ' + p.name + ' from cart', 'remove')));
    });
    const t = KC.Cart.totals();
    $('sumSub').textContent = KC.fmt(t.subtotal);
    $('sumTax').textContent = KC.fmt(t.tax);
    $('sumShip').textContent = rows.length && t.shipping === 0 ? 'Free' : KC.fmt(t.shipping);
    $('sumTotal').textContent = KC.fmt(t.total);
  }

  function mountCheckout(form) {
    renderCart();
    document.addEventListener('kc:cart', renderCart);
    $('cartLines').addEventListener('click', (e) => { // event delegation: one listener for all cart buttons
      const b = e.target.closest('button[data-action]'); if (!b) return;
      const id = b.getAttribute('data-id'), a = b.getAttribute('data-action');
      if (a === 'inc') KC.Cart.change(id, 1); else if (a === 'dec') KC.Cart.change(id, -1); else if (a === 'remove') KC.Cart.remove(id);
    });
    STATES.forEach((s) => form.elements.state.append(KC.el('option', { value: s, text: s })));
    form.querySelectorAll('input[name="payment"]').forEach((r) => r.addEventListener('change', () => { $('paymentNote').textContent = (PAY[r.value] || {}).note || ''; }));

    const V = KC.Validation, R = V.rules;
    V.bindForm(form, [
      { name: 'fullName', validate: R.name },
      { name: 'email', validate: R.email, normalize: (s) => V.clean(s).toLowerCase() },
      { name: 'phone', validate: R.phone, normalize: V.normalizePhone },
      { name: 'flat', validate: (v) => R.alnum(v, 'Flat / house no.', 20) },
      { name: 'street', validate: R.address },
      { name: 'city', validate: R.city },
      { name: 'state', validate: (v) => R.choice(v, STATES, 'Select your state or union territory.') },
      { name: 'pin', validate: R.pin },
      { name: 'payment', validate: (v) => R.choice(v, Object.keys(PAY), 'Choose a payment method.') }
    ], {
      busyLabel: 'Placing order…',
      onValid(values) {
        const rows = KC.Cart.detailed();
        if (!rows.length) throw new Error('Your cart is empty. Add at least one product before placing your order.');
        const order = {
          type: 'order', // Not security-sensitive: a display reference only.
          id: 'KC-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(),
          name: values.fullName, city: values.city, state: values.state, pin: values.pin, payment: values.payment,
          lines: rows.map((r) => ({ name: r.product.name, qty: r.qty, unit: r.product.price })), totals: KC.Cart.totals()
        };
        try { sessionStorage.setItem('kc_last', JSON.stringify(order)); }
        catch (e) { throw new Error('Your browser blocked session storage, so the confirmation page cannot be shown.'); }
        KC.Cart.clear();
        KC.ui.notify('success', 'Order placed (simulated). Taking you to your confirmation…');
        setTimeout(() => { location.href = 'success.html'; }, 700);
        return 'keep';
      }
    });
  }

  function mountSuccess(root) {
    let d = null;
    try { d = JSON.parse(sessionStorage.getItem('kc_last')); } catch (e) { d = null; }
    const link = (href, text, cls) => KC.el('a', { class: 'btn ' + cls, href: href }, KC.el('span', { class: 'btn-label', text: text }));
    if (!d || (d.type !== 'order' && d.type !== 'registration')) {
      root.append(KC.el('div', { class: 'card done' }, KC.el('h1', { text: 'Nothing to confirm yet' }),
        KC.el('p', { class: 'lead', text: 'Create an account or place an order to see a confirmation here.' }),
        KC.el('div', { class: 'hero-actions' }, link('index.html', 'Browse gear', 'btn-primary'), link('register.html', 'Create account', 'btn-ghost'))));
      return;
    }
    const card = KC.el('div', { class: 'card done' }, KC.el('div', { class: 'done-icon', 'aria-hidden': 'true', text: '✓' }));
    if (d.type === 'registration') {
      card.append(KC.el('h1', { text: 'Account created' }),
        KC.el('p', { class: 'lead', text: 'Welcome, ' + String(d.name) + '. A confirmation would be sent to ' + String(d.email) + ' in a real system.' }),
        KC.el('div', { class: 'hero-actions' }, link('index.html', 'Start shopping', 'btn-primary')));
    } else {
      const t = d.totals || {}, lines = Array.isArray(d.lines) ? d.lines : [];
      const body = KC.el('tbody');
      lines.forEach((l) => body.append(KC.el('tr', {}, KC.el('td', { text: String(l.name) + ' × ' + Number(l.qty) }), KC.el('td', { text: KC.fmt(Number(l.unit) * Number(l.qty)) }))));
      const sum = (k, v) => KC.el('tr', {}, KC.el('th', { scope: 'row', text: k }), KC.el('td', { text: v }));
      const foot = KC.el('tfoot', {}, sum('Subtotal', KC.fmt(t.subtotal)), sum('GST (18%)', KC.fmt(t.tax)), sum('Shipping', Number(t.shipping) ? KC.fmt(t.shipping) : 'Free'), sum('Total', KC.fmt(t.total)));
      const pay = PAY[d.payment] ? PAY[d.payment].label : 'Unknown';
      card.append(KC.el('h1', { text: 'Order placed' }),
        KC.el('p', { class: 'lead', text: 'Thank you, ' + String(d.name) + '. This was a simulated order: no payment was taken.' }),
        KC.el('div', { class: 'receipt' },
          KC.el('p', {}, 'Order reference: ', KC.el('span', { class: 'order-id', text: String(d.id) })),
          KC.el('table', {}, KC.el('tbody', {}), body, foot),
          KC.el('p', { class: 'muted', text: 'Delivering to ' + String(d.city) + ', ' + String(d.state) + ' ' + String(d.pin) + '. Payment method: ' + pay + ' (simulated).' })),
        KC.el('div', { class: 'hero-actions' }, link('index.html', 'Continue shopping', 'btn-primary')));
      card.querySelector('table').firstElementChild.remove(); // drop the empty placeholder tbody
    }
    root.append(card);
    document.title = (d.type === 'order' ? 'Order placed' : 'Account created') + ' | Kestrel';
  }

  function init() {
    const form = $('checkoutForm'), root = $('successRoot');
    if (form) mountCheckout(form);
    if (root) mountSuccess(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.KC = window.KC || {});
