# SEO / AEO / GEO / LLMO scorecard — dailycryptonews.online

Playbook: fire-your-seo-agency v1.2.1 (commit 5f7249f), Phase 0 diagnosis before/after.
English site, so the NEO (Naver) lane is not applicable.

## BEFORE — live domain, 2026-10-16 00:2x KST (crawler eye, no JS)

```
$ curl -sL https://dailycryptonews.online/ -w '\n%{http_code}'
Payment required

DEPLOYMENT_DISABLED

icn1::l2rvm-1792077442453-d652a55b48d4
402
$ curl -sI https://dailycryptonews.online/ | grep -iE 'HTTP|server|x-vercel'
HTTP/1.1 402 Payment Required
Server: Vercel
X-Vercel-Error: DEPLOYMENT_DISABLED
$ curl -s -o /dev/null -w '%{http_code}' https://dailycryptonews.online/robots.txt   -> 402
$ curl -s -o /dev/null -w '%{http_code}' https://dailycryptonews.online/llms.txt     -> 402
```

| Lane | State | Evidence |
|---|---|---|
| SEO | ❌ | every URL returns HTTP 402 text/plain (78 bytes); no HTML, no sitemap, no robots |
| AEO | ❌ | no content, no structured data |
| GEO | ❌ | no llms.txt, no citable data |
| LLMO | ❌ | no entity description reachable |
| Content ops | ❌ | old branch held ~1,400 AI-rewritten news articles (removed, not republished) |

## AFTER — local build served from `dist/` (scripts/qa.mjs static server mimicking Cloudflare assets)

Raw evidence: `qa/crawler-check.json` (not committed). Status/H1/JSON-LD per URL, fetched without JS:

| Path | Status | H1 | JSON-LD types |
|---|---|---|---|
| / | 200 | 1 | Organization, WebSite, Dataset |
| /tools/btc-fee-estimator/ | 200 | 1 | Organization, WebSite, BreadcrumbList, WebApplication |
| /guides/rbf-cpfp-stuck-transaction/ | 200 | 1 | Organization, WebSite, BreadcrumbList, Article, FAQPage |
| /log/ | 200 | 1 | Organization, WebSite, BreadcrumbList |
| /sitemap-index.xml, /sitemap-0.xml | 200 | – | 23 URLs, lastmod = data/content dates |
| /robots.txt | 200 | – | `Allow: /`, sitemap line, no AI-crawler blocks |
| /llms.txt | 200 | – | entity, latest reading, all pages |
| /ads.txt | 200 | – | `google.com, pub-4490818204529253, DIRECT, f08c47fec0942fa0` |
| /rss.xml | 200 | – | 10 guide items |
| /this-page-does-not-exist/ | **404** | 1 | real 404 page |

`pnpm gate` → `gate: PASS (24 pages, 23 sitemap URLs)`: title 50–60, description 150–160, absolute
canonical = path, all LD parses and its headline/FAQ/breadcrumb text is visible, ≥2 internal links,
direct answer paragraph present (15–90 words), every page in sitemap, guide sources present, no
noindex, no placeholder text, OG PNG exists.

| Lane | State | Evidence |
|---|---|---|
| SEO | ✅ | SSR HTML, unique titles/descriptions, canonicals, OG 1200×630 PNG per key page, sitemap index, robots, real 404 |
| AEO | ✅ | question-shaped H1/H2, `#answer` direct answer first, FAQPage only where FAQ is visible, Article with dateModified, Dataset on log pages |
| GEO | ✅ | llms.txt with numbers + timestamp + sources, methodology page, citable dated readings, stable URLs |
| LLMO | ✅ | identical entity sentence in About, Organization LD, footer, llms.txt |
| Content ops | ⚠️ | 10 guides + backlog + gate in place; publishing rhythm and performance unmeasured until deployed |

Not measured / not claimed: indexing, rankings, impressions, AI citations (see seo/measure.md).
