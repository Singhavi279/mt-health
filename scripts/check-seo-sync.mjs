// Pre-commit check (rule 8): title/meta/OG/JSON-LD must match what is on the page. Run: node scripts/check-seo-sync.mjs
import { readFileSync } from 'node:fs';
let bad = 0;
const fail = m => { console.log('FAIL', m); bad++; };
const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
for (const f of ['index.html', 'awards.html', 'awards/tnc/index.html']) {
  const s = readFileSync(f, 'utf8');
  const doc = f.includes('/tnc/');   // a legal document: no Event or FAQ markup expected
  const title = (s.match(/<title>(.*?)<\/title>/) || [])[1];
  const og = n => (s.match(new RegExp(`<meta property="og:${n}" content="(.*?)"`)) || [])[1];
  const desc = (s.match(/<meta name="description" content="(.*?)"/) || [])[1];
  if (!title) fail(`${f}: no <title>`); else if (title.length > 70) fail(`${f}: title ${title.length} chars`);
  if (!desc || desc.length > 160) fail(`${f}: description missing or >160 chars`);
  if (og('title') !== title) fail(`${f}: og:title differs from <title>`);
  if (!og('description') || !og('image') || !og('type')) fail(`${f}: og tags incomplete`);
  if (!/<html lang="en"/.test(s)) fail(`${f}: html lang is not en`);
  const canon = (s.match(/<link rel="canonical" href="(.*?)"/) || [])[1];
  if (!canon) fail(`${f}: no canonical link`); else if (canon !== og('url')) fail(`${f}: canonical differs from og:url`);
  if (!/^https:\/\//.test(og('image') || '')) fail(`${f}: og:image is not an absolute URL`);
  const blocks = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const ev = blocks.find(b => b['@type'] === 'Event'), faq = blocks.find(b => b['@type'] === 'FAQPage');
  if (doc) { /* no Event expected */ }
  else if (!ev) fail(`${f}: no Event JSON-LD`);
  else {
    if (ev.startDate !== '2027-01-30' || ev.endDate !== '2027-01-30') fail(`${f}: Event date is not 2027-01-30`);
    if (!/2027/.test(ev.name)) fail(`${f}: Event name lacks 2027`);
    if (f === 'index.html') {   // the Event offers must be the passes on the page
      const radios = [...s.matchAll(/name="pass" value="(\w+)"[^>]*data-price="(\d+)"/g)].map(m => [m[1], m[2]]);
      const offers = (ev.offers || []).map(o => [o.name.split(' ')[0].toLowerCase(), o.price]);
      if (JSON.stringify(radios) !== JSON.stringify(offers)) fail(`${f}: JSON-LD offers ${JSON.stringify(offers)} differ from pass prices on the page ${JSON.stringify(radios)}`);
    }
  }
  // FAQ: every JSON-LD Q&A must appear verbatim in the visible FAQ, and vice versa
  const vis = [...s.matchAll(/<details class="faq__item"(?: open)?><summary>(.*?)<\/summary><div class="faq__a"><p>(.*?)<\/p><\/div><\/details>/g)].map(m => [txt(m[1]), txt(m[2])]);
  if (doc) { /* no FAQ expected */ }
  else if (!faq) fail(`${f}: no FAQPage JSON-LD`);
  else {
    const ld = faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]);
    if (ld.length !== vis.length) fail(`${f}: FAQ count JSON-LD ${ld.length} vs page ${vis.length}`);
    ld.forEach(([q, a], i) => { if (!vis[i] || vis[i][0] !== q || vis[i][1] !== a) fail(`${f}: FAQ ${i + 1} differs between JSON-LD and page ("${q}")`); });
  }
  // single source of truth for the date: no other year/date anywhere on the page
  // the eligibility section holds real rule dates (31 March 2026 etc.), which are not event dates
  const body = s.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace(/<section[^>]*id="eligibility"[\s\S]*?<\/section>/, '');
  (body.match(/\b20\d\d\b/g) || []).filter(y => y !== '2027').forEach(y => { if (!/MAHARASHTRA_TIMES_SWASTHYA_SANGAM_2026/.test(y)) fail(`${f}: stray year ${y}`); });
  (body.match(/\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* 20\d\d/g) || []).filter(d => d !== '30 Jan 2027').forEach(d => fail(`${f}: other date "${d}"`));
  // no secrets
  if (/api[_-]?key|secret|token/i.test(s.replace(/data-track/g, ''))) fail(`${f}: looks like a key/token`);
}
const js = readFileSync('js/site.js', 'utf8');
if (/Bearer |x-api-key|secret/i.test(js)) fail('js/site.js: looks like a key');
console.log(bad ? `\n${bad} problem(s)` : 'SEO/AEO sync OK: title, description, OG, Event + FAQPage JSON-LD match the pages; date 30 Jan 2027 only.');
process.exit(bad ? 1 : 0);
