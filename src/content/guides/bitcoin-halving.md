---
title: "Bitcoin Halving Explained: Schedule, Subsidy and the Next One"
h1: "When is the next Bitcoin halving and what changes?"
description: "Every 210,000 blocks the Bitcoin block subsidy halves. Past halving dates, the next one at block 1,050,000, how its date is estimated and what it does to fees."
kicker: "Halving"
question: "When is the next Bitcoin halving and what changes?"
answer: "The next halving happens at block 1,050,000, when the new-coin subsidy per block drops from 3.125 BTC to 1.5625 BTC. It is set by block height, not by date; at about ten minutes per block it is expected in 2028, and our countdown recomputes the estimate daily."
data_asof: "2026-10-15"
published: "2026-10-15"
updated: "2026-10-15"
sources:
  - title: "Bitcoin Core source: GetBlockSubsidy in validation.cpp"
    url: "https://github.com/bitcoin/bitcoin/blob/master/src/validation.cpp"
  - title: "Bitcoin developer guide: Block chain (coinbase transaction)"
    url: "https://developer.bitcoin.org/devguide/block_chain.html"
  - title: "Bitcoin whitepaper (Nakamoto, 2008)"
    url: "https://bitcoin.org/bitcoin.pdf"
faq:
  - q: "Do transaction fees halve too?"
    a: "No. Only the block subsidy halves. Fees are set by users competing for block space and are unaffected by the halving rule itself."
  - q: "What happens when the subsidy reaches zero?"
    a: "The subsidy shrinks below one satoshi after 33 halvings, around the year 2140. After that miners are paid by transaction fees alone."
---

## The rule in code

Bitcoin Core’s `GetBlockSubsidy` starts at 50 BTC and shifts it right by one bit every **210,000 blocks**. That integer halving is the whole mechanism. Because it counts blocks, the date of each halving is only known approximately until shortly before it happens.

## The schedule so far

| Halving | Block height | Date (UTC) | Subsidy after |
|---|---|---|---|
| Launch | 0 | 3 Jan 2009 | 50 BTC |
| 1st | 210,000 | 28 Nov 2012 | 25 BTC |
| 2nd | 420,000 | 9 Jul 2016 | 12.5 BTC |
| 3rd | 630,000 | 11 May 2020 | 6.25 BTC |
| 4th | 840,000 | 20 Apr 2024 | 3.125 BTC |
| 5th | 1,050,000 | estimated 2028 | 1.5625 BTC |

Because blocks have on average arrived a little faster than every ten minutes, halvings have tended to come a bit earlier than a strict four-year calendar.

## How the countdown is estimated

The [countdown](/tools/halving-countdown/) takes the latest block height from the daily log, subtracts it from 1,050,000, and multiplies the remaining blocks by ten minutes. On 15 October 2026 the chain was at block 971,587, leaving 78,413 blocks, about 545 days at ten minutes each.

We deliberately use the protocol target of ten minutes rather than a recent average. Recent averages swing with [difficulty adjustments](/guides/difficulty-adjustment/) and would make the date jump around. Expect the real date to differ by weeks.

## What changes for users

- **Nothing about how you send or receive.** Addresses, transactions and wallets work the same.
- **Miners earn less new BTC per block.** At 3.125 BTC per block and about 144 blocks per day, roughly 450 BTC are issued daily; after the next halving that becomes about 225 BTC.
- **Fees become a larger share of miner income.** Over decades, the security budget increasingly depends on fees, which is one reason fee markets matter.

## Claims to treat carefully

Many articles link halvings to price rallies. There have only been four halvings, prices are driven by many factors, and markets know the schedule in advance. This site records network facts; it does not forecast prices and nothing here is investment advice.

## Supply arithmetic

Summing the subsidies over all halving eras gives just under 21 million BTC (the integer rounding means the true maximum is slightly below 21,000,000). Some coins are provably unspendable or lost, so the usable supply is lower still, but no one can measure lost coins precisely.

Related: [difficulty adjustment](/guides/difficulty-adjustment/) and [today’s network log](/).
