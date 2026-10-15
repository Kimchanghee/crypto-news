---
title: "What Is the Bitcoin Mempool? Backlog, Wait Times and Purging"
h1: "What is the Bitcoin mempool and why does it fill up?"
description: "The mempool is each node’s waiting room for unconfirmed Bitcoin transactions. How backlog is measured in blocks, why it spikes and when low-fee payments drop."
kicker: "Mempool"
question: "What is the Bitcoin mempool and why does it fill up?"
answer: "The mempool is the set of valid but unconfirmed transactions a node is holding while they wait for a block. It fills up when people broadcast more transactions than the roughly 1 million vB per block that miners can confirm, so low fee-rate transactions queue behind higher ones."
data_asof: "2026-10-15"
published: "2026-10-15"
updated: "2026-10-15"
sources:
  - title: "Bitcoin developer guide: Transaction broadcasting and the memory pool"
    url: "https://developer.bitcoin.org/devguide/p2p_network.html"
  - title: "Bitcoin Core documentation: mempool replacements and policy"
    url: "https://github.com/bitcoin/bitcoin/tree/master/doc/policy"
  - title: "mempool.space REST API: mempool statistics"
    url: "https://mempool.space/docs/api/rest"
faq:
  - q: "Is there one global mempool?"
    a: "No. Every node keeps its own, with its own size limit and minimum fee. Explorers such as mempool.space show the view from their own nodes, which is usually close to what miners see but not identical."
  - q: "How long do transactions stay in the mempool?"
    a: "Until they confirm, are replaced, or a node evicts them. Bitcoin Core by default expires unconfirmed transactions after two weeks and evicts the lowest fee-rate ones first when its mempool reaches its size limit."
---

## A waiting room, not a queue

When you broadcast a transaction, nodes check it and keep it in memory until a miner includes it in a block. That memory pool is the **mempool**. It is not first-come, first-served: miners build blocks mainly from the highest fee-rate transactions, so the mempool behaves more like an auction for limited space.

Each block can hold up to 4 million weight units, about **1,000,000 vB**. A block arrives roughly every ten minutes on average. Anything beyond that capacity waits.

## Measuring the backlog in blocks

The [daily log](/) expresses the pending backlog as **blocks of transactions**: the total virtual size waiting, divided by 1,000,000 vB. Forty million vB pending means about forty blocks, or close to seven hours of block space if nothing new arrived.

That number alone can mislead. What matters for *your* transaction is how much is waiting **above your fee rate**. A mempool can hold forty blocks of data while the top two blocks’ worth pays 5 sat/vB and everything else sits at 1–2 sat/vB. In that case a 5 sat/vB payment still confirms quickly.

The log translates the backlog into a "sea state" so the scale is readable at a glance:

| Sea state | Backlog |
|---|---|
| Calm | under 1 block |
| Light swell | 1 to 3 blocks |
| Choppy | 3 to 10 blocks |
| Rough | 10 to 30 blocks |
| Storm | 30 blocks or more |

The bands are our own reading aid, defined in the [methodology](/methodology/#sea-state); they are not an industry standard.

## Why it fills up

- **Bursts of demand.** Market volatility, exchange batch withdrawals and popular token or inscription mints all add large amounts of data at once.
- **Lucky and unlucky blocks.** Block times follow a random process. A 40-minute gap lets four blocks’ worth of transactions pile up.
- **Weekly rhythm.** Activity often eases at weekends, which is why consolidating small coins then can be cheaper. This is a tendency, not a rule.

## When transactions get dropped

Mempools are not unlimited. In Bitcoin Core, the default limit is **300 MB of memory** (`-maxmempool`). When it fills, the node evicts the lowest fee-rate transactions and raises its own minimum fee until there is room. Transactions also **expire after 336 hours** (two weeks) by default.

If your transaction is evicted, the coins never left your wallet. Your wallet may show it as pending until you rebroadcast it at a higher fee or tell the wallet to abandon it. With most modern wallets the cleaner path is to [replace it with a higher fee](/guides/rbf-cpfp-stuck-transaction/).

## Reading the log’s mempool line

For example, an entry might read: 86,896 unconfirmed transactions totalling 41,676,010 vB, about 41.7 blocks ("Storm"), while the next-block tier is only 5 sat/vB. That combination means a lot of low-rate data is waiting, but a moderate rate still clears quickly. Check the fee tiers, not just the backlog.

## Practical takeaways

1. Look at the **fee tiers** before you look at the backlog size.
2. If you are not in a hurry, use an economy rate with RBF enabled.
3. Plan consolidations and non-urgent transfers for calm periods.
4. Expect a sudden spike to clear over hours, not minutes, because only about six blocks arrive per hour.

Related: [how fees are calculated](/guides/bitcoin-fees-explained/) and [how difficulty adjustment affects block timing](/guides/difficulty-adjustment/).
