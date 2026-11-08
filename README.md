# Kestrel: Secure Commercial Checkout & Registration Core

A premium dark-themed store with a secure registration form and a full cart-to-confirmation checkout, built with **HTML5, CSS3 and vanilla JavaScript (ES6+)** only. No frameworks, no build step.

> **Security notice:** this is a *frontend security demonstration*, not a real payment system. No payment is processed, no card data is collected, and nothing leaves the browser. Client-side validation improves usability but is **not a substitute for server-side validation and security**.

## Project objectives
- Intercept and manage the full form event lifecycle with native listeners.
- Build a reusable RegEx validation engine with specific, human-readable messages.
- Generate error and success UI dynamically and safely (no `innerHTML` with user data).
- Defend against empty, oversized, mistyped, malformed and injected input.

## Features
- **Registration:** full name, email, Indian mobile number, password, confirm password, terms checkbox.
- **Shop:** six product cards with images, add to cart, live cart badge.
- **Cart:** quantity +/-, remove, subtotal, 18% GST, shipping (free from ₹5,000), order total. Persists across pages via `localStorage` (sanitised on load).
- **Checkout:** customer and shipping form, PIN validation, simulated payment choice (UPI / card / COD), confirmation screen with receipt.
- **UX:** inline errors, toast banners, `is-valid`/`is-invalid` states, loading button states, responsive layout, keyboard focus, reduced-motion support.

## Technologies
HTML5 · CSS3 (custom properties, grid, flexbox, glassmorphism) · JavaScript ES6+ · Content-Security-Policy meta tag.

## Folder structure
```
secure-checkout/
├── index.html  register.html  checkout.html  success.html  tests.html
├── css/   style.css (shared)  register.css  checkout.css
├── js/    app.js  validation.js  registration.js  cart.js  checkout.js  tests.js
├── assets/images/   product SVGs + favicon
└── README.md
```
`tests.html` and `js/tests.js` are additions to the requested structure: an in-browser test runner.

## Architecture
Plain scripts sharing one namespace (`window.KC`), so the site also works when opened from disk.

| File | Responsibility |
|---|---|
| `validation.js` | RegEx rules (`KC.Validation.rules`) and `bindForm()`, the generic form lifecycle engine |
| `cart.js` | Product catalog, cart state, totals, product grid |
| `app.js` | Safe DOM builder `KC.el`, currency formatter, notification banners, header/footer |
| `registration.js` / `checkout.js` | Declare field specs and `onValid` handlers; checkout.js also renders the cart and confirmation |

## Event lifecycle
1. **`input`**: once a field has been visited, re-validates on every keystroke so errors disappear as soon as the value is valid.
2. **`blur`**: marks the field visited, trims the displayed value, validates.
3. **`change`**: validates (selects, radios, checkbox, autofill).
4. **`submit`**: `event.preventDefault()`, then (a) return if a submission is already running, (b) validate every field, focus the first invalid one and show a banner, (c) lock the button and show status, (d) run `onValid` with **normalised** values, (e) unlock, or keep locked while redirecting.

## Regular expressions
| Field | Pattern | Notes |
|---|---|---|
| Email | `^[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$` | Local part ≤ 64, valid domain labels, TLD of letters. Extra checks for spaces, double dots, multiple `@` |
| Name | `^[\p{L}\p{M}]+(?:[ '.-][\p{L}\p{M}]+)*$` (u) | Any-language letters and combining marks (Hindi works); no digits |
| Phone | `^[6-9]\d{9}$` | Indian mobile; optional `+91`/`91`/`0` prefix and spaces/hyphens are stripped first |
| PIN | `^[1-9]\d{5}$` | 6 digits, no leading zero |
| Alphanumeric | `^[A-Za-z0-9]+$` | Used for Flat / house no. |
| Address | `^[A-Za-z0-9][A-Za-z0-9\s,./#()-]*$` | Common address characters only |
| Password | `/[A-Z]/`, `/[a-z]/`, `/\d/`, `/[^A-Za-z0-9\s]/` + length 8-64 | Checked separately so the message lists exactly what is missing |
| Markup guard | `<[^>]*>\|[<>]\|javascript:\|data:text/html\|\bon\w+\s*=` | Rejects HTML/script-looking text in every text field |

## Test cases
Open `tests.html` (26 automated tests) or run them in Node (see below).

| Case | Expected |
|---|---|
| Valid / invalid / malformed email | Accepted / "must include @" / specific message |
| Weak vs strong password | Lists missing requirements / accepted |
| Wrong phone (short, starts with 5, letters) | Specific message per case |
| Empty form, whitespace-only | Blocked, inline errors on every field |
| Password mismatch | "Passwords do not match." |
| `<script>`, `<img onerror>`, `javascript:` | Rejected; nothing injected into the DOM |
| Invalid PIN (5 digits, leading 0, letters) | Specific message |
| Add / remove / quantity (min 1, max 10) | Cart and badge update |
| Totals | ₹8,597 → GST ₹1,547 → free shipping → **₹10,144**; ₹1,799 → GST ₹324 → shipping ₹99 → **₹2,222** |
| Duplicate submission | Three rapid submits run the handler once |
| Successful registration and checkout | Confirmation page with receipt |

Run the logic tests without a browser:
```bash
node -e "global.window=global;['validation','cart','tests'].forEach(f=>require('./js/'+f+'.js'));KC.runTests().then(r=>r.forEach(x=>console.log(x.status,x.name,x.error||'')))"
```
(The three DOM tests are skipped in Node; `tests.html` runs all 26.)

## Defensive programming
- `trim()` plus whitespace collapsing and control/zero-width character stripping (`clean()`).
- Type checks first (`typeof value === 'string'`), then a **length cap before any regex** so huge strings cannot cause slow matching; `maxlength` on every input.
- All dynamic text is set with `textContent` or `createTextNode`; `innerHTML` is never used with user data (`KC.el` has no HTML path).
- Cart rebuilt from untrusted storage: known product ids only, integer quantities, capped. **Prices always come from the catalog.**
- `<select>` and radio values are checked against allow-lists to catch tampering.
- Passwords are never trimmed, stored or logged.
- Content-Security-Policy meta tag allows same-origin scripts, styles and images only; no inline scripts or styles.
- No hard-coded success: confirmation appears only after every validator passes.
- No card or UPI details are requested at all.

## Installation
```bash
git clone <your-repo-url>
cd secure-checkout
# open index.html directly, or serve it:
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Screenshots
Add images to `assets/screenshots/` and reference them here:
`![Home](assets/screenshots/home.png)` · `![Register](assets/screenshots/register.png)` · `![Checkout](assets/screenshots/checkout.png)` · `![Confirmation](assets/screenshots/success.png)`

## Links
- **Live demo:** `https://<your-username>.github.io/secure-checkout/` *(placeholder)*
- **Repository:** `https://github.com/<your-username>/secure-checkout` *(placeholder)*

## Deployment
All paths are relative and there is no build step.

**GitHub**
```bash
git init
git add assets css/style.css && git commit -m "feat: add base styles and product assets"
git add js/validation.js js/app.js && git commit -m "feat: add RegEx validation engine and shared helpers"
git add register.html css/register.css js/registration.js && git commit -m "feat: add secure registration module"
git add js/cart.js index.html && git commit -m "feat: add product listing and cart logic"
git add checkout.html success.html css/checkout.css js/checkout.js && git commit -m "feat: add checkout and confirmation flow"
git add tests.html js/tests.js README.md .nojekyll && git commit -m "test: add functional tests; docs: add README"
git branch -M main
git remote add origin https://github.com/<your-username>/secure-checkout.git
git push -u origin main
```
**GitHub Pages:** repo → Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)` → Save.
**Netlify:** *Add new site → Import from Git* (or drag the folder onto app.netlify.com/drop). Build command: none. Publish directory: `.`
**Vercel:** *Add New → Project → import the repo*. Framework preset: *Other*. No build command; output directory `.`

After deploying, open `/tests.html` on the live URL to confirm all tests pass.

## Future improvements
Server-side validation and a real payment provider (hosted fields); accessible password-strength meter and show/hide toggle; coupon codes; order history; end-to-end tests with Playwright; i18n with Hindi labels.
