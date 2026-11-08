/* Cart state + totals. Prices always come from the catalog below, never from storage or the DOM. */
(function (KC) {
  'use strict';
  const KEY = 'kc_cart', MAX_QTY = 10, TAX_RATE = 0.18, FREE_SHIPPING_AT = 5000, SHIPPING = 99;
  const products = [
    { id: 'kb-aero', name: 'Aero 75 Mechanical Keyboard', price: 4999, image: 'keyboard.svg', blurb: 'Hot-swap switches in a milled aluminium case.' },
    { id: 'hp-pulse', name: 'Pulse ANC Headphones', price: 7499,image: 'headphones.svg', blurb: '40-hour battery and adaptive noise cancelling.' },
    { id: 'ms-orbit', name: 'Orbit Wireless Mouse', price: 1799,image: 'mouse.svg', blurb: 'Silent clicks, three-device pairing.' },
    { id: 'lamp-lumen', name: 'Lumen Desk Lamp', price: 2299,image: 'lamp.svg', blurb: 'Warm-to-cool dimming with a USB port.' },
    { id: 'bag-atlas', name: 'Atlas 20L Backpack', price: 3299,image: 'backpack.svg', blurb: 'Water-resistant, padded 16-inch laptop sleeve.' },
    { id: 'chg-volt', name: 'Volt 65W GaN Charger', price: 1999,image: 'charger.svg', blurb: 'Charges a laptop and phone from one plug.' }
  ];
  const byId = {}; products.forEach((p) => { byId[p.id] = p; });

  // Rebuilds a safe cart from untrusted storage: known ids only, integer quantities, capped.
  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    const merged = {}, order = [];
    raw.forEach((l) => {
      if (!l || typeof l.id !== 'string' || !Object.prototype.hasOwnProperty.call(byId, l.id)) return;
      const q = Number(l.qty);
      if (!Number.isInteger(q) || q < 1) return;
      if (!(l.id in merged)) order.push(l.id);
      merged[l.id] = Math.min(MAX_QTY, (merged[l.id] || 0) + q);
    });
    return order.map((id) => ({ id: id, qty: merged[id] }));
  }
  let lines = null;
  function get() {
    if (!lines) { try { lines = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { lines = []; } }
    return lines;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* storage blocked: cart still works in memory */ }
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('kc:cart'));
  }
  function find(id) { return get().filter((l) => l.id === id)[0]; }

  function add(id) {
    const p = byId[id];
    if (!p) return { ok: false, message: 'That product is not available.' };
    const l = find(id);
    if (l && l.qty >= MAX_QTY) return { ok: false, message: 'You can order at most ' + MAX_QTY + ' of ' + p.name + '.' };
    if (l) l.qty += 1; else get().push({ id: id, qty: 1 });
    save();
    return { ok: true, message: 'Added ' + p.name + ' to your cart.' };
  }
  function setQty(id, qty) {
    const l = find(id), q = Math.floor(Number(qty));
    if (!l || !Number.isFinite(q)) return;
    l.qty = Math.max(1, Math.min(MAX_QTY, q)); save();
  }
  function change(id, delta) { const l = find(id); if (l) setQty(id, l.qty + delta); }
  function remove(id) { lines = get().filter((l) => l.id !== id); save(); }
  function clear() { lines = []; save(); }
  function count() { return get().reduce((n, l) => n + l.qty, 0); }
  function detailed() { return get().map((l) => ({ product: byId[l.id], qty: l.qty })); }

  // Whole rupees: GST rounded to the nearest rupee; free shipping from ₹5,000.
  function totals(ls) {
    const subtotal = (ls || get()).reduce((s, l) => s + byId[l.id].price * l.qty, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING;
    return { subtotal: subtotal, tax: tax, shipping: shipping, total: subtotal + tax + shipping };
  }

  function mountProducts(grid) {
    products.forEach((p) => {
      const btn = KC.el('button', { class: 'btn btn-primary btn-block', type: 'button', 'aria-label': 'Add ' + p.name + ' to cart' }, KC.el('span', { class: 'btn-label', text: 'Add to cart' }));
      btn.addEventListener('click', () => { const r = add(p.id); KC.ui.notify(r.ok ? 'success' : 'error', r.message, 3000); });
      grid.append(KC.el('article', { class: 'product' },
        KC.el('img', { src: p.image, alt: p.name + ' illustration', width: 400, height: 300, loading: 'lazy' }),
        KC.el('div', { class: 'product-body' },
          KC.el('h3', { text: p.name }), KC.el('p', { class: 'muted', text: p.blurb }),
          KC.el('div', { class: 'product-foot' }, KC.el('span', { class: 'price', text: KC.fmt(p.price) }), btn))));
    });
  }

  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('storage', (e) => { if (e.key === KEY) { lines = null; document.dispatchEvent(new CustomEvent('kc:cart')); } });
  KC.Cart = { products: products, MAX_QTY: MAX_QTY, add: add, setQty: setQty, change: change, remove: remove, clear: clear, count: count, detailed: detailed, totals: totals, mountProducts: mountProducts };
})(window.KC = window.KC || {});
