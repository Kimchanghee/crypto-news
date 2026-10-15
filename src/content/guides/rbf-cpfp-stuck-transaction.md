---
title: "Stuck Bitcoin Transaction? How RBF and CPFP Speed It Up"
h1: "How do you speed up a stuck Bitcoin transaction?"
description: "Two ways to speed up an unconfirmed Bitcoin transaction: Replace-By-Fee if you sent it, Child-Pays-For-Parent if you received it. Math, steps and limits."
kicker: "Stuck tx"
question: "How do you speed up a stuck Bitcoin transaction?"
answer: "If you sent it, use Replace-By-Fee (RBF): broadcast a new version paying a higher fee. If you are the recipient, or RBF is unavailable, use Child-Pays-For-Parent (CPFP): spend the unconfirmed output with a high-fee child so miners include both together."
data_asof: "2026-10-15"
published: "2026-10-15"
updated: "2026-10-15"
sources:
  - title: "BIP 125: Opt-in Full Replace-by-Fee Signaling"
    url: "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki"
  - title: "Bitcoin Core 28.0 release notes (full-RBF default)"
    url: "https://bitcoincore.org/en/releases/28.0/"
  - title: "Bitcoin Core documentation: mempool replacements policy"
    url: "https://github.com/bitcoin/bitcoin/blob/master/doc/policy/mempool-replacements.md"
faq:
  - q: "Will a stuck Bitcoin transaction eventually disappear?"
    a: "Possibly. Nodes drop transactions that sit unconfirmed for a long time or fall below their minimum fee when the mempool is full. The coins then remain in your wallet, but your wallet may need to rebroadcast or abandon the transaction."
  - q: "Can I cancel a Bitcoin transaction?"
    a: "Only before it confirms, and only by replacing it: an RBF replacement that pays the coins back to yourself with a higher fee effectively cancels the original payment."
---

## First: is it really stuck?

A transaction is "stuck" when its fee rate is below what miners are currently choosing. Before doing anything, compare your transaction’s fee rate (sat/vB, shown by any block explorer) with today’s tiers on the [network log](/). If you paid 4 sat/vB and the one-hour tier is 3 sat/vB, you probably just need to wait for the next few blocks.

## Option 1: Replace-By-Fee (sender)

RBF lets the sender broadcast a **replacement** transaction that spends at least one of the same inputs and pays a higher fee. Miners and nodes keep the version that pays more.

BIP 125 originally made replacement opt-in: the original had to signal that it was replaceable. Since **Bitcoin Core 28.0** (released October 2024) nodes accept replacements by default whether or not the original signaled ("full RBF"). Your wallet still needs to offer a "bump fee" or "speed up" button.

The replacement must follow node policy, including:

- It must pay a **higher absolute fee** than the transaction(s) it replaces.
- The extra fee must at least cover the replacement’s own size at the node’s **incremental relay fee** (so you cannot bump by a fraction of a satoshi).
- It must have a higher fee rate than the original.

**Worked example.** Your 141 vB payment paid 2 sat/vB (282 sats). The next-block tier is now 15 sat/vB. A replacement at 15 sat/vB costs 141 × 15 = 2,115 sats. You pay the new total, not 2,115 on top of 282; the original never confirms.

## Option 2: Child-Pays-For-Parent (recipient or sender)

Miners evaluate a chain of unconfirmed transactions as a package. If an unconfirmed transaction (the parent) pays you, you can spend that output in a new transaction (the child) with a high fee. To collect the child’s fee, a miner must include the parent too.

What matters is the **combined fee rate** of the package:

> package rate = (parent fee + child fee) ÷ (parent size + child size)

**Worked example.** The parent is 141 vB at 2 sat/vB (282 sats). You want the package at 15 sat/vB. Your child spending one input to one output is about 110 vB. The package is 251 vB, so it needs 251 × 15 = 3,765 sats in total. The child must pay 3,765 − 282 = **3,483 sats**, which is about 31.7 sat/vB on its own.

CPFP costs more than RBF because you pay for two transactions, but it works when you do not control the sender’s wallet.

## Which should you use?

| Situation | Use |
|---|---|
| You sent it and your wallet has "bump fee" | RBF |
| You received it and it is stuck | CPFP from your output |
| You sent it and it has a change output to you | RBF, or CPFP on the change |
| An exchange withdrawal is stuck | Contact the exchange; you cannot RBF their transaction |

## Mistakes to avoid

- **Do not "resend" the payment from a different wallet.** If the first one later confirms, you have paid twice.
- **Do not rely on transaction accelerator websites you do not know.** Some are legitimate mining-pool services; many are scams asking for payment.
- **Check the new fee before signing.** Bumping during a fee spike can cost much more than the original payment warranted.
- **Merchants may treat a replaced transaction as unpaid.** If you bump a payment to a merchant, the transaction ID changes; tell them.

## Prevent it next time

Pick a fee rate based on your real deadline, and use a wallet that supports RBF and CPFP. The [fee guide](/guides/bitcoin-fees-explained/) and the [mempool guide](/guides/mempool-explained/) explain how to read the tiers before you send.
