/* Shared helpers: safe DOM builder, currency format, notifications, header/footer. */
(function (KC) {
  'use strict';
  if (typeof document === 'undefined') return;

  // Builds elements with textContent only. User-controlled strings are never parsed as HTML.
  KC.el = function (tag, props) {
    const node = document.createElement(tag);
    Object.keys(props || {}).forEach((k) => {
      const v = props[k];
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (v !== false && v != null) node.setAttribute(k, String(v));
    });
    Array.prototype.slice.call(arguments, 2).forEach((c) => { if (c != null) node.append(c); }); // strings become text nodes
    return node;
  };
  KC.fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

  KC.ui = {
    notify(type, message, ms) {
      let box = document.getElementById('notify');
      if (!box) { box = KC.el('div', { id: 'notify', 'aria-live': 'polite' }); document.body.append(box); }
      const close = KC.el('button', { class: 'banner-close', type: 'button', 'aria-label': 'Dismiss notification', text: '×' });
      const banner = KC.el('div', { class: 'banner banner-' + type, role: type === 'error' ? 'alert' : 'status' },
        KC.el('span', { class: 'banner-icon', 'aria-hidden': 'true', text: type === 'error' ? '!' : '✓' }),
        KC.el('p', { text: message }), close);
      const remove = () => banner.remove();
      close.addEventListener('click', remove);
      box.append(banner);
      while (box.children.length > 3) box.firstElementChild.remove();
      setTimeout(remove, ms || 6000);
    }
  };

  function updateBadge() {
    const b = document.getElementById('cartCount');
    if (!b || !KC.Cart) return;
    const n = KC.Cart.count(); b.textContent = String(n); b.hidden = n === 0;
  }

  function init() {
    const header = document.getElementById('site-header');
    if (header) {
      const file = location.pathname.split('/').pop() || 'index.html';
      const links = [['index.html', 'Shop'], ['register.html', 'Register'], ['checkout.html', 'Checkout']];
      const nav = KC.el('nav', { class: 'nav', 'aria-label': 'Main' });
      links.forEach((l) => {
        const a = KC.el('a', { href: l[0] }, l[1], l[0] === 'checkout.html' ? KC.el('span', { class: 'badge', id: 'cartCount', text: '0', hidden: 'hidden' }) : null);
        if (l[0] === file) a.setAttribute('aria-current', 'page');
        nav.append(a);
      });
      header.append(KC.el('div', { class: 'container bar' },
        KC.el('a', { class: 'brand', href: 'index.html' }, KC.el('span', { class: 'brand-mark', 'aria-hidden': 'true' }), 'Kestrel'), nav));
    }
    const footer = document.getElementById('site-footer');
    if (footer) footer.append(KC.el('p', { text: 'Kestrel is a frontend security demonstration, not a real store. No payments are processed and nothing leaves your browser. Client-side validation is not a substitute for server-side security.' }));
    updateBadge();
    document.addEventListener('kc:cart', updateBadge);
    const grid = document.getElementById('productGrid');
    if (grid && KC.Cart) KC.Cart.mountProducts(grid);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.KC = window.KC || {});
