/* Swasthya Sangam: page behaviour. Plain JS module, no dependencies, no build.

   BACKEND HANDOFF: everything the backend team changes is in SS_CONFIG below, marked TODO(backend). */

window.__ssReady = true;                                     // the head script hides nothing once this is set

const SS_CONFIG = {
  // TODO(backend): the form-service URL (JSON POST). Empty = MVP preview: a valid submit opens the
  // confirmation pop-up and sends nothing. Set it and the same pop-up opens only after the server answers 2xx.
  formEndpoint: '',


  // Read-only Eventhub endpoints copied from the earlier mh-health site (award categories, plan prices).
  // The event key still ends in _2026: it is the server's identifier, not the event year (the API names the
  // event "Maharashtra Times Swasthya Sangam 2027"). TODO(backend): confirm key and merchant code are final.
  categoriesApi: 'https://api.indiatimes.com/eventhub/api/portal/events/MAHARASHTRA_TIMES_SWASTHYA_SANGAM_2026/categories',
  productApi: 'https://api.indiatimes.com/eventhub/api/payment/get-product-details',
  merchantCode: 'Pu22y3mrty'
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const byOrder = (a, b) => (a.display_order || 0) - (b.display_order || 0);
const getJSON = url => fetch(url, { headers: { Accept: 'application/json' } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

/* ------------------------------------------------------------------ header, menu, progress, scroll-spy */
const header = $('[data-header]');
const nav = $('#nav');
const burger = $('.burger');
const setMenu = open => {
  if (!nav || !burger) return;
  nav.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  root.classList.toggle('is-modal', open);
};
burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
matchMedia('(min-width: 1000px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY, h = root.scrollHeight - innerHeight;
    header?.classList.toggle('is-stuck', y > 8);
    header?.style.setProperty('--p', h > 0 ? Math.min(1, y / h).toFixed(4) : 0);
    ticking = false;
  });
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// highlight the nav link of the section on screen
const spyLinks = $$('.nav a[href^="#"], .toc a[href^="#"]');
if (spyLinks.length && 'IntersectionObserver' in window) {
  const map = new Map();                                               // section id -> every link that points at it
  spyLinks.forEach(a => { const id = a.getAttribute('href').slice(1); if (!map.has(id)) map.set(id, []); map.get(id).push(a); });
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { spyLinks.forEach(a => a.classList.remove('is-active')); map.get(en.target.id)?.forEach(a => a.classList.add('is-active')); } });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
}

// document pages: the contents list is always open on desktop, folded on phones and closes after a tap
const toc = $('.toc');
if (toc) {
  const wide = matchMedia('(min-width: 1000px)');
  const sync = () => { toc.open = wide.matches; };
  sync(); wide.addEventListener('change', sync);
  toc.addEventListener('click', e => { if (e.target.closest('a') && !wide.matches) toc.open = false; });
}

/* ------------------------------------------------------------------ reveal on scroll, staggered */
$$('[data-stagger]').forEach(group => [...group.children].forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--i', i); }));
const revealEls = $$('.reveal');
if (calm || !('IntersectionObserver' in window)) {
  revealEls.forEach(n => n.classList.add('in'));
} else {
  const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealEls.forEach(n => io.observe(n));
}

/* ------------------------------------------------------------------ counters */
const countUp = node => {
  const to = Number(node.dataset.count);
  if (!Number.isFinite(to)) return;
  if (calm) { node.textContent = to; return; }
  const t0 = performance.now(), dur = 1400;
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(to * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const counterIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { countUp(en.target); counterIO.unobserve(en.target); } }), { threshold: 0.6 }) : null;
const watchCounter = n => counterIO ? counterIO.observe(n) : (n.textContent = n.dataset.count);
$$('[data-count]:not([data-count-api])').forEach(watchCounter);

/* ------------------------------------------------------------------ ticker pause button (WCAG 2.2.2) */
$$('.ticker').forEach(t => {
  const b = $('.ticker__pause', t);
  b?.addEventListener('click', () => { const p = t.classList.toggle('is-paused'); b.setAttribute('aria-pressed', String(p)); b.setAttribute('aria-label', p ? 'Resume scrolling text' : 'Pause scrolling text'); });
});

/* ------------------------------------------------------------------ mobile action bar: shown after the hero, hidden while a form or the closing call is on screen */
const bar = $('.actionbar');
if (bar && 'IntersectionObserver' in window) {
  const hero = $('.hero');
  const hide = new Set();
  const update = () => bar.classList.toggle('is-shown', !hide.size);
  const watch = (target, key) => target && new IntersectionObserver(es => { es.forEach(en => en.isIntersecting ? hide.add(key) : hide.delete(key)); update(); }, { threshold: 0.1 }).observe(target);
  watch(hero, 'hero'); $$('[data-form-section]').forEach((s, i) => watch(s, 'form' + i)); watch($('.site-footer .cta-band'), 'close');
  hide.add('hero'); update();
}

/* ------------------------------------------------------------------ forms: validation on submit, errors under fields */
const MESSAGES = { email: 'Write an email address with an @, like name@example.com.', mobile: 'Write a 10-digit mobile number that starts with 6, 7, 8 or 9.' };
const forms = $$('form[data-ss-form]');
forms.forEach(form => {
  form.noValidate = true;
  const status = $('[data-form-status]', form);
  const fields = [...form.elements].filter(f => f.matches('input, select, textarea') && f.type !== 'hidden');
  const errEl = f => { const id = (f.getAttribute('aria-describedby') || '').split(' ').find(i => document.getElementById(i)?.classList.contains('err')); return id && document.getElementById(id); };
  const check = f => {
    const ok = f.checkValidity();
    const err = errEl(f);
    if (ok) { f.removeAttribute('aria-invalid'); if (err) err.hidden = true; return true; }
    f.setAttribute('aria-invalid', 'true');
    if (err) { err.textContent = err.dataset.msg || (f.type === 'email' ? MESSAGES.email : f.name === 'mobile' ? MESSAGES.mobile : f.validationMessage); err.hidden = false; err.style.animation = 'none'; err.offsetWidth; err.style.animation = ''; }
    return false;
  };
  fields.forEach(f => {
    const err = errEl(f); if (err) err.dataset.msg = err.dataset.msg || err.textContent.trim();
    f.addEventListener(f.matches('select, [type=checkbox], [type=radio]') ? 'change' : 'input', () => {
      if (f.type === 'radio') { form.querySelectorAll(`input[name="${f.name}"]`).forEach(check); return; }   // a pass was chosen: clear the whole group
      if (f.getAttribute('aria-invalid') === 'true') check(f);
    });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();                                          // never navigate to the placeholder action
    const bad = fields.filter(f => !check(f));
    if (bad.length) {
      const n = new Set(bad.map(f => f.type === 'radio' ? f.name : f)).size;   // a radio group counts once
      if (status) status.textContent = n === 1 ? '1 field to fix.' : `${n} fields to fix.`;
      bad[0].focus();
      return;
    }
    if (status) status.textContent = '';
    const data = Object.fromEntries(new FormData(form).entries());
    if (!SS_CONFIG.formEndpoint) { thanks(form, data); form.reset(); return; }   // MVP preview: nothing is sent
    const btn = $('[type="submit"]', form);
    btn.disabled = true; if (status) status.textContent = 'Sending';
    try {
      // TODO(backend): payload is the form fields as JSON (fields: name, organisation, designation, email, mobile, city, terms; plus plan, segment, description on the nomination form).
      const res = await fetch(SS_CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(res.status);
      if (status) status.textContent = '';
      thanks(form, data); form.reset();
    } catch { if (status) status.textContent = 'Not sent: the connection failed. Your details are still here; try again.'; }
    finally { btn.disabled = false; }
  });
});

/* ------------------------------------------------------------------ confirmation pop-up */
function thanks(form, data) {
  const dlg = $('#ss-thanks'); if (!dlg) return;
  $('[data-fill="name"]', dlg).textContent = (data.name || '').trim().split(/\s+/)[0] || 'there';
  $('[data-fill="what"]', dlg).textContent = form.dataset.sentWhat || 'Your request has been received.';
  const dl = $('[data-fill="summary"]', dlg); dl.textContent = '';
  (form.dataset.summary || '').split(',').filter(Boolean).forEach(key => {
    const f = form.elements[key];
    let v, label;
    if (f && f.length && f[0].type === 'radio') { const c = [...f].find(r => r.checked); v = c && c.dataset.label; label = c && c.dataset.summaryLabel; }
    else { v = f && (f.options ? (f.selectedIndex > 0 ? f.options[f.selectedIndex].text : '') : f.value); label = f && f.dataset.summaryLabel; }
    if (v) dl.append(el('dt', '', label || key), el('dd', '', v));
  });
  dl.hidden = !dl.children.length;
  const opener = document.activeElement;
  dlg.showModal(); root.classList.add('is-modal');
  dlg.addEventListener('close', () => { root.classList.remove('is-modal'); opener?.focus?.(); }, { once: true });
}
$$('#ss-thanks [data-close]').forEach(b => b.addEventListener('click', () => $('#ss-thanks').close()));
$('#ss-thanks')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

/* ------------------------------------------------------------------ award categories (Eventhub API) */
let segmentsPromise = null;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const loadSegments = () => segmentsPromise || (segmentsPromise = withTimeout(getJSON(SS_CONFIG.categoriesApi), 8000).then(j => {
  const segs = j && j.data && j.data.segments;
  if (!segs || !segs.length) throw new Error('no data');
  return segs.slice().sort(byOrder);
}));

const apiStats = $$('[data-count-api]');
const segBox = $('#award-segments');
const segSelect = $('#n-segment');
if (apiStats.length || segBox || segSelect) {
  loadSegments().then(segs => {
    const total = segs.reduce((n, s) => n + (s.children || []).length, 0);
    apiStats.forEach(n => {
      n.dataset.count = n.dataset.countApi === 'segments' ? segs.length : total;
      n.closest('li')?.removeAttribute('hidden');
      watchCounter(n);
    });
    $$('[data-award-count]').forEach(n => { n.textContent = `${total} award categories across ${segs.length} segments`; n.hidden = false; });
    const atList = $('#at-segments');                                   // Summit page: the five segments with their category counts
    if (atList) segs.forEach(s => { const n = (s.children || []).length; const li = el('li'); li.append(el('span', '', s.name), el('small', '', `${n} ${n === 1 ? 'category' : 'categories'}`)); atList.append(li); });
    if (segSelect) segs.forEach(s => segSelect.append(Object.assign(el('option', '', s.name), { value: s.name })));
    if (segBox) renderSegments(segs, total);
  }).catch(() => {
    if (segBox) {
      segBox.textContent = ''; const p = el('p', 'api-note', 'Award categories coming soon. Want to know more? Contact Simran Singh: ');
      const t = el('a', 'link', '+91 7838788554'); t.href = 'tel:+917838788554'; p.append(t); segBox.append(p);
      $$('[data-award-count]').forEach(n => { n.hidden = true; }); const cs = $('#cat-search'); if (cs) cs.closest('.finder').hidden = true;
    }
  });
}

const SEG_COLOURS = ['#0a6f7a', '#0b4ea2', '#2e7d32', '#8a6a12', '#17365f'];
function renderSegments(segs, total) {
  segBox.textContent = '';
  const groups = segs.map((seg, i) => {
    const kids = (seg.children || []).slice().sort(byOrder);
    const d = el('details', 'seg'); d.style.setProperty('--c', SEG_COLOURS[i % SEG_COLOURS.length]);
    if (i === 0) d.open = true;
    const sum = el('summary'); sum.append(el('h3', '', seg.name), el('span', 'seg__n', `${kids.length} ${kids.length === 1 ? 'category' : 'categories'}`));
    const grid = el('div', 'seg__grid');
    const cats = kids.map(c => {
      const a = el('article', 'cat'); a.append(el('h4', '', c.name));
      if (c.description) a.append(el('p', '', c.description));
      const who = c.custom_fields && c.custom_fields.who_can_apply;
      if (who) { const p = el('p', 'who'); p.append(el('b', '', 'Who can apply: '), document.createTextNode(who)); a.append(p); }
      if (c.description || who) {                                  // cards stay compact; the button reveals the full text
        const more = el('button', 'cat__more', 'Show details'); more.type = 'button'; more.setAttribute('aria-expanded', 'false');
        more.addEventListener('click', () => { const open = a.classList.toggle('is-open'); more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Hide details' : 'Show details'; });
        a.append(more);
      }
      a.dataset.search = `${c.name} ${c.description || ''} ${who || ''} ${seg.name}`.toLowerCase();
      grid.append(a); return a;
    });
    d.append(sum, grid); segBox.append(d);
    return { d, cats, wasOpen: i === 0 };
  });
  // live filter
  const input = $('#cat-search'), count = $('#cat-count');
  if (!input) return;
  const run = () => {
    const q = input.value.trim().toLowerCase(); let shown = 0;
    groups.forEach(g => {
      let n = 0; g.cats.forEach(c => { const hit = !q || q.split(/\s+/).every(w => c.dataset.search.includes(w)); c.hidden = !hit; if (hit) n++; });
      g.d.hidden = !n; if (q) g.d.open = n > 0; else g.d.open = g.wasOpen; shown += n;
    });
    count.textContent = q ? (shown ? `${shown} of ${total} categories match` : 'No category matches. Try a shorter word, like "hospital" or "nutrition".') : '';
  };
  input.addEventListener('input', run);
}

/* ------------------------------------------------------------------ nomination plans: prices from the product API */
const planSel = $('#n-plan');
$$('[data-pcode]').forEach(card => {
  const box = $('[data-price]', card);
  const opt = planSel && $(`option[value="${card.dataset.plan}"]`, planSel);
  getJSON(`${SS_CONFIG.productApi}?pcode=${encodeURIComponent(card.dataset.pcode)}&mcode=${SS_CONFIG.merchantCode}&upcache=2`).then(d => {
    if (!d || (d.stts && d.stts !== 200) || !d.product_name) throw new Error('bad product');
    const list = d.couponList || [], c = list.find(x => x.default_coupon) || list[0];
    const listPrice = d.product_amount_without_gst, price = c ? c.final_billing_amount_without_gst : listPrice;
    box.textContent = '';
    const badge = $('.plan__badge', card); if (badge) badge.hidden = !(listPrice > price);   // Early Bird Offer only while discounted
    if (listPrice > price) { const del = el('del', '', inr(listPrice)); del.setAttribute('aria-label', 'Original price ' + inr(listPrice)); box.append(del); }
    box.append(el('strong', '', inr(price)), el('small', '', '+ GST'));
    if (opt) opt.textContent = `${opt.dataset.name} (${inr(price)} + GST)`;
  }).catch(() => { box.textContent = ''; box.append(el('small', '', 'Price unavailable right now. Refresh the page.')); });
});
$$('[data-choose-plan]').forEach(a => a.addEventListener('click', () => { if (planSel) planSel.value = a.dataset.choosePlan; }));
