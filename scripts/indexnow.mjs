// Submit every sitemap URL to IndexNow after a verified deployment. The key file is served from /<key>.txt.
// Usage: node scripts/indexnow.mjs   (reads dist/sitemap-*.xml; never runs during build)
import { readFileSync, readdirSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const files = readdirSync(dist).filter((f) => /^sitemap[\w-]*\.xml$/.test(f));
const urls = [...new Set(files.flatMap((f) => [...readFileSync(new URL(f, dist), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])))].filter((u) => !u.endsWith('.xml'));
const keyFile = readdirSync(new URL('../public/', import.meta.url)).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile || !urls.length) {
  console.error('indexnow: missing key file or sitemap URLs');
  process.exit(1);
}
const host = new URL(urls[0]).host;
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: keyFile.slice(0, -4), keyLocation: `https://${host}/${keyFile}`, urlList: urls.slice(0, 10000) }),
});
console.log(JSON.stringify({ host, submitted: Math.min(urls.length, 10000), status: res.status }));
if (res.status >= 400 && res.status !== 429) process.exit(1);
