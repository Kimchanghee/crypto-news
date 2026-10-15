# Measurement plan — dailycryptonews.online

Baseline date: deployment day (parent records it). Before deploy the domain returned HTTP 402
(Vercel DEPLOYMENT_DISABLED), so every metric starts from zero.

## Day 0 (after deploy, parent-owned accounts)
- Search Console: add domain property, submit `https://dailycryptonews.online/sitemap-index.xml`;
  URL-inspect `/`, `/tools/btc-fee-estimator/`, `/guides/bitcoin-fees-explained/`.
- Ping IndexNow with key `b7d3f2a94c1e4e58a6d0c2f19e3b7a51` (key file at `/b7d3f2a94c1e4e58a6d0c2f19e3b7a51.txt`).
- GA4: set `PUBLIC_GA4_ID`, rebuild; verify `tool_used` events in DebugView.
- Record crawler-eye evidence again against production (same commands as seo/scorecard.md).

## +14 days
| Metric | Where | Target / question |
|---|---|---|
| Indexed pages vs 23 sitemap URLs | GSC → Pages | ≥80% indexed; list "Crawled – not indexed" |
| Impressions, clicks, CTR per page | GSC → Performance | which guides get impressions first |
| Queries with impressions but no dedicated page | GSC queries | feed content/backlog.md |
| Rich results: Article/FAQ/Breadcrumb/Dataset | GSC → Enhancements | 0 errors |
| `tool_used` events / sessions | GA4 | is the estimator used? |
| AI citations | manual: ask ChatGPT/Perplexity/Google AI Mode "bitcoin fee in dollars today", "how to unstick bitcoin transaction" | does dailycryptonews.online appear? log date + answer |
| Daily log continuity | `src/data/log/` | one file per day, no gaps from failures |

## +28 days
- Refresh guides whose impressions fell ≥30% or whose facts changed (Bitcoin Core release notes, IRS
  1099-DA rules); bump `updated`.
- Decide whether weekly summary pages have enough recorded data (≥4 full weeks) to be non-thin.
- Check AdSense review status (parent) — do not assume approval.

## Not claimed
No indexing, ranking, traffic, AdSense approval or revenue is claimed by this rebuild.
