# Question backlog — dailycryptonews.online

One question = one page. Promote an item only when it can be answered from primary sources and,
where relevant, from the site's own recorded readings. Source new items from GSC queries without a
dedicated page (re-check at +14 / +28 days, see seo/measure.md).

Schema: Question | Basis | Type | Status | URL. Status: published / next / later.

| Question | Basis | Type | Status | URL |
|---|---|---|---|---|
| How are Bitcoin transaction fees calculated? | BIP141, mempool.space; fee tiers | guide | published | /guides/bitcoin-fees-explained/ |
| Do SegWit and Taproot lower fees? | BIP141/173/341/350; typical tx sizes | guide | published | /guides/segwit-taproot-fees/ |
| How do you speed up a stuck transaction? | BIP125, Core 28.0 notes; fee tiers | guide | published | /guides/rbf-cpfp-stuck-transaction/ |
| What is the mempool and why does it fill up? | Core policy docs; backlog | guide | published | /guides/mempool-explained/ |
| How does the difficulty adjustment work? | pow.cpp; epoch progress | guide | published | /guides/difficulty-adjustment/ |
| When is the next halving? | validation.cpp; countdown | guide + tool | published | /guides/bitcoin-halving/ |
| How are Ethereum gas fees calculated? | EIP-1559; base fee | guide | published | /guides/ethereum-gas-base-fee/ |
| How do you hold your own bitcoin safely? | bitcoin.org, BIP39 | guide | published | /guides/self-custody-basics/ |
| How can you spot a crypto scam? | FTC, IC3, SEC, FCA | guide | published | /guides/crypto-scams-warning-signs/ |
| When do you owe tax on crypto? | IRS, HMRC | guide | published | /guides/crypto-tax-basics/ |
| Where can I download the recorded network log? | own log (src/data/log/*.json) | data download | published | /data/network-log.json, /data/network-log.csv |
| How congested is the Bitcoin mempool today? | own log (mempoolVsize, mempoolCount) | data question page | next | /bitcoin/mempool-size-today/ |
| What is Ethereum gas costing today? | own log (ethBaseGwei) | data question page | next | /ethereum/gas-fee-today/ |
| What are Bitcoin difficulty and hashrate right now? | own log (diffChange, hashrateEHs) | data question page | next | /bitcoin/difficulty-hashrate-today/ |
| When is the cheapest time of week to send bitcoin? | own log (needs ≥8 weeks of readings) | data question page | next | - |
| What is UTXO consolidation and when is it worth it? | developer.bitcoin.org; economy tier | guide | next | - |
| Why does my exchange charge more than the network fee? | exchange fee pages (cite, no promotion); fee tiers | guide | next | - |
| What is a Lightning channel open/close cost? | BOLT specs; fee tiers | guide | next | - |
| What are blob fees (EIP-4844)? | EIP-4844; add baseFeePerBlobGas to refresh | guide | later | - |
| What did Bitcoin fees look like this week? | own log (only after ≥7 full days; weekly/monthly pages after ≥30 days) | summary page | later | /log/week/ |

- Decide whether weekly summary pages have enough recorded data (≥4 full weeks) to be non-thin.
- Check AdSense review status (parent) — do not assume approval.

## Refresh / merge policy
- Refresh a page when its source data changes or impressions drop 30% or more between measurements.
- dateModified / sitemap lastmod change only on a real content or data change.
- Same-question duplicates: 301 to the stronger page plus canonical; 410 only as a last resort.

## Not claimed
No indexing, ranking, traffic, AdSense approval or revenue is claimed by this rebuild.
