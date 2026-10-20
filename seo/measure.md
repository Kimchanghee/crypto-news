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

## Re-measure 2026-11-03 (five-lane pass of 2026-10-20)
- Numeric baseline: pending console data (GSC/Bing exports not pulled; no numbers recorded until they are).
- Shipped 2026-10-20: robots names Claude-SearchBot and Perplexity-User; llms.txt "Last updated" stamp and Data downloads section; /data/network-log.json and /data/network-log.csv (recorded readings only, observation time UTC, source per day), linked from /log/; gate check that a question H1 is followed by the #answer paragraph.
- On 2026-11-03 record per changed URL: indexed (Y/N), impressions, clicks, average position (GSC); Bing indexed (Y/N); whether the JSON/CSV URLs were fetched (Cloudflare analytics, if available).
- Citation probes (O/X, with date and exact prompt): How congested is the Bitcoin mempool today? / What is Ethereum gas costing today? / What are Bitcoin difficulty and hashrate right now? / What is Daily Crypto News?
