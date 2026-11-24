#!/usr/bin/env node
// SEO parity check: every URL on the OLD site's sitemap should still work on the NEW site
// (served directly, or redirected to a page that works). Also compares <title> and meta description.
//
//   node scripts/check-urls.mjs <old-sitemap-url-or-file> <new-site-base-url> [--no-meta]
//   e.g. node scripts/check-urls.mjs https://olddomain.com/sitemap_index.xml https://mysite.pages.dev
//
// Exit code 1 if any old URL is missing on the new site. Needs Node 18+ (built-in fetch).
import { readFile } from 'node:fs/promises';

const [src, base, ...flags] = process.argv.slice(2);
if (!src || !base) { console.error('Usage: node scripts/check-urls.mjs <old-sitemap-url-or-file> <new-site-base-url> [--no-meta]'); process.exit(2); }
const withMeta = !flags.includes('--no-meta');
const newBase = base.replace(/\/+$/, '');
const UA = { 'user-agent': 'site-migration-check/1.0' };

const get = async (url, opts = {}) => {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try { return await fetch(url, { headers: UA, signal: ctl.signal, ...opts }); } finally { clearTimeout(t); }
};
const text = async (s) => (/^https?:/.test(s) ? (await get(s)).text() : readFile(s, 'utf8'));
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

async function collect(s, seen = new Set()) {
  if (seen.has(s)) return [];
  seen.add(s);
  const xml = await text(s);
  const found = locs(xml);
  if (/<sitemapindex/i.test(xml)) return (await Promise.all(found.map((u) => collect(u, seen)))).flat();
  return found;
}
const meta = (html) => ({
  title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim(),
  desc: (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] || '').trim(),
});

const urls = [...new Set(await collect(src))].filter((u) => !/\.(xml|jpe?g|png|gif|webp|svg|pdf)(\?|$)/i.test(u));
console.log(`Old sitemap URLs to check: ${urls.length}\n`);

async function resolveNew(path) {
  // follow redirects manually (max 5) so we can report the chain
  let url = newBase + path; const chain = [];
  for (let i = 0; i < 5; i++) {
    const r = await get(url, { redirect: 'manual' });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      chain.push(`${r.status}`); url = new URL(r.headers.get('location'), url).href; continue;
    }
    return { status: r.status, final: url, chain, html: r.status === 200 && withMeta ? await r.text() : '' };
  }
  return { status: 0, final: url, chain, html: '' };
}

const rows = []; let idx = 0;
async function worker() {
  while (idx < urls.length) {
    const u = urls[idx++]; const { pathname, search } = new URL(u); const path = pathname + search;
    try {
      const n = await resolveNew(path);
      let status = n.status === 200 ? (n.chain.length ? 'REDIRECT' : 'OK') : 'MISSING';
      if (n.final.startsWith('http') && !n.final.startsWith(newBase) && n.status === 200) status = 'EXTERNAL';
      let note = n.chain.length ? `${n.chain.join('>')} -> ${n.final.replace(newBase, '') || n.final}` : '';
      if (withMeta && n.status === 200 && status !== 'EXTERNAL') {
        const o = meta(await (await get(u)).text()); const m = meta(n.html);
        const diffs = []; if (o.title && o.title !== m.title) diffs.push('title'); if (o.desc && o.desc !== m.desc) diffs.push('description');
        if (diffs.length) note += (note ? ' | ' : '') + 'differs: ' + diffs.join(', ');
      }
      rows.push({ path, status, note });
    } catch (e) { rows.push({ path, status: 'ERROR', note: String(e.message || e) }); }
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
rows.sort((a, b) => a.path.localeCompare(b.path));
for (const r of rows) console.log(`${r.status.padEnd(9)} ${r.path}${r.note ? '   ' + r.note : ''}`);
const count = (s) => rows.filter((r) => r.status === s).length;
const bad = rows.filter((r) => r.status === 'MISSING' || r.status === 'ERROR').length;
console.log(`\nOK ${count('OK')} | REDIRECT ${count('REDIRECT')} | EXTERNAL ${count('EXTERNAL')} | MISSING ${count('MISSING')} | ERROR ${count('ERROR')}`);
if (bad) console.log('\nFix every MISSING/ERROR with a page or a line in public/_redirects, then run again.');
else console.log('\nEvery old URL works on the new site.');
process.exit(bad ? 1 : 0);
