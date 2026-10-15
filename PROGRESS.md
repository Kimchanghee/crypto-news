# PROGRESS — dailycryptonews.online v2 (resume from here)

Branch: v2-cloudflare-static (based on origin/main dc9a29f). Owner contract: ../CONTRACT.md, brief: ../BRIEFS.md.

## Milestones
- [x] M0 Old AI-news app + AI-rewritten archive removed (commit 002b143). Old articles must NOT be republished.
- [x] M1 Astro 5 skeleton, site.config.ts, wrangler.jsonc, .gitignore, PROGRESS pushed
- [x] M2 refresh.mjs (mempool.space, Binance, ETH eth_feeHistory) + committed snapshot + daily archive from start date
- [x] M3 Home network report, fee estimator, halving/difficulty countdown
- [x] M4 >=10 guides (content collection) + legal pages
- [x] M5 SEO: OG PNGs, sitemap, robots, llms.txt, JSON-LD, IndexNow, RSS, gate.mjs
- [x] M6 (first pass) QA (build, check, gate, curl, screenshots 390/1440), scorecard, measure.md

## Notes
- Concept: ship's log / network weather report.

- 2026-10-16 00:11 KST: build passes (home, log index+day, 2 tools + tools index, 10 guides, legal pages, sitemap/robots/rss/llms, OG PNGs). Next: gate.mjs, astro check, QA screenshots, seo/scorecard.md, measure.md, DESIGN_REFERENCES.md.
- 2026-10-16 00:25 KST: gate PASS 24 pages; astro check 0 errors; tests 11/11; browser QA 1440/390 overflow 0, CLS 0, focus visible (msedge channel; _pw-browsers folder absent). seo/scorecard.md, seo/measure.md, DESIGN_REFERENCES.md, content/backlog.md written. Next: switch to kimchipremium; later polish.
- 2026-10-16 KST: removed stray root copy of IndexNow key (public/<key>.txt is the served file). DCN complete; final report in PROGRESS + parent report.
