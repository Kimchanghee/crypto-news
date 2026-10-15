---
title: "How Bitcoin Transaction Fees Work: sat/vB Explained"
h1: "How are Bitcoin transaction fees calculated?"
description: "Bitcoin fees depend on transaction size in virtual bytes times a fee rate in sat/vB, not on the amount sent. Worked examples, fee tiers and how to avoid overpaying."
kicker: "Fees"
question: "How are Bitcoin transaction fees calculated?"
answer: "A Bitcoin fee is the transaction’s size in virtual bytes (vB) multiplied by a fee rate in satoshis per vB. Sending 0.001 BTC or 10 BTC costs the same if the transactions are the same size; what changes the fee is the number of inputs, the address types and how busy the mempool is."
data_asof: "2026-10-15"
published: "2026-10-15"
updated: "2026-10-15"
sources:
  - title: "BIP 141: Segregated Witness (weight and virtual size definitions)"
    url: "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki"
  - title: "Bitcoin developer guide: Transactions"
    url: "https://developer.bitcoin.org/devguide/transactions.html"
  - title: "mempool.space REST API: recommended fees"
    url: "https://mempool.space/docs/api/rest"
faq:
  - q: "Does sending more bitcoin cost a higher fee?"
    a: "No. The fee depends on the transaction’s size in virtual bytes and the fee rate you choose. The amount being sent does not enter the calculation."
  - q: "What is a satoshi?"
    a: "A satoshi is the smallest unit of bitcoin: 0.00000001 BTC. One bitcoin is 100,000,000 satoshis."
  - q: "Who receives the fee?"
    a: "The miner whose block includes your transaction collects the fee, together with the block subsidy."
---

## The formula in one line

Every Bitcoin transaction has a size measured in **virtual bytes (vB)**. You attach a fee, and the network compares transactions by their **fee rate**: the fee divided by the size, written as satoshis per virtual byte (sat/vB).

> fee (sats) = virtual size (vB) × fee rate (sat/vB)

A satoshi is 0.00000001 BTC. If a transaction is 141 vB and you pay 5 sat/vB, the fee is 705 sats. At a bitcoin price of $80,000 that is 705 ÷ 100,000,000 × 80,000 ≈ $0.56.

The [daily network log](/) runs exactly this calculation for every tier mempool.space currently recommends, so you can see what a typical payment costs in dollars right now.

## Why size, not amount?

Blocks have a limited capacity. Since the SegWit upgrade, that limit is expressed as **4 million weight units** per block, which is the same as 1 million virtual bytes (BIP 141 defines virtual size as weight divided by four). Miners therefore care about how much block space a transaction occupies, not about how much value it moves. A transaction that moves 50 BTC with one input and two outputs can be smaller, and cheaper, than one that moves 0.01 BTC assembled from twenty small coins.

## What makes a transaction bigger?

A transaction spends **inputs** (coins you received earlier, called UTXOs) and creates **outputs** (the payment plus, usually, your change). Approximate sizes for common types:

| Part | Legacy (P2PKH) | Native SegWit (P2WPKH) | Taproot (P2TR) |
|---|---|---|---|
| Each input | 148 vB | 68 vB | 57.5 vB |
| Each output | 34 vB | 31 vB | 43 vB |
| Fixed overhead | 10 vB | 10.5 vB | 10.5 vB |

From these, a one-input, two-output payment is about **226 vB** for legacy, **141 vB** for native SegWit and **154 vB** for Taproot. These are standard estimates; real sizes vary by a byte or two with signature length.

The biggest driver is the **number of inputs**. If your wallet holds many small coins, a single payment may need to combine several of them, and each extra SegWit input adds about 68 vB. Five inputs instead of one roughly triples the fee at the same rate. Our [fee estimator](/tools/btc-fee-estimator/) lets you try different combinations.

## Where the fee rate comes from

There is no fixed price. Unconfirmed transactions wait in the **mempool**, and miners generally fill blocks with the highest fee-rate transactions first. When the backlog is small, 1–2 sat/vB confirms quickly; when many people transact at once, the rate needed for the next block can climb sharply.

Fee estimators, such as the one published by mempool.space, look at the current backlog and recent blocks and suggest rates for different waiting times. The log reports five tiers:

- **Next block** — the rate likely to be included in the next block, about 10 minutes away on average.
- **Within ~30 minutes** and **within ~1 hour** — roughly three and six blocks.
- **Economy** — a low rate without a time target.
- **Minimum** — the lowest rate that nodes will relay; it can wait a long time.

These are predictions, not guarantees. Blocks arrive randomly (sometimes two in a minute, sometimes none for 40 minutes), and new high-fee transactions can arrive after you broadcast.

## How to avoid overpaying

1. **Ask what the deadline really is.** If nobody is waiting on the payment, an economy rate is often fine. The [mempool guide](/guides/mempool-explained/) explains how long low-fee transactions tend to wait.
2. **Use native SegWit or Taproot addresses.** They make inputs much smaller than legacy addresses. See [SegWit and Taproot fees](/guides/segwit-taproot-fees/).
3. **Consolidate small coins when fees are low.** Combining many small UTXOs during a quiet period means future payments need fewer inputs.
4. **Turn on Replace-By-Fee.** If you pick a low rate and need to speed up later, RBF lets you raise it. See [how to unstick a transaction](/guides/rbf-cpfp-stuck-transaction/).
5. **Check what the wallet or exchange actually charges.** Custodial platforms often set their own withdrawal fee, which may be higher or lower than the on-chain cost shown here.

## A worked example

Suppose the next-block rate is 12 sat/vB and the economy rate is 3 sat/vB, with BTC at $80,000:

| Transaction | Size | Next block | Economy |
|---|---|---|---|
| SegWit, 1 in / 2 out | 141 vB | 1,692 sats ≈ $1.35 | 423 sats ≈ $0.34 |
| SegWit, 4 in / 2 out | 345 vB | 4,140 sats ≈ $3.31 | 1,035 sats ≈ $0.83 |
| Legacy, 1 in / 2 out | 226 vB | 2,712 sats ≈ $2.17 | 678 sats ≈ $0.54 |

The figures are illustrative arithmetic, not a forecast. The current version of this table, with live rates, is on the [front page of the log](/).

## What this guide does not cover

Lightning Network payments, exchange withdrawal fees and fees on other blockchains work differently. For Ethereum, read the [gas and base fee guide](/guides/ethereum-gas-base-fee/).
