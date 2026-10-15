---
title: "SegWit vs Taproot vs Legacy: Which Address Has Lower Fees?"
h1: "Do SegWit and Taproot addresses lower Bitcoin fees?"
description: "Native SegWit and Taproot inputs use far fewer virtual bytes than legacy inputs, so the same fee rate costs less. Sizes, worked examples and address prefixes."
kicker: "Addresses"
question: "Do SegWit and Taproot addresses lower Bitcoin fees?"
answer: "Yes. Spending from a native SegWit (bc1q) address takes about 68 vB per input and Taproot (bc1p) about 57.5 vB, versus 148 vB for a legacy (1…) address. At the same fee rate a one-input payment costs roughly 35–40% less than legacy."
data_asof: "2026-10-15"
published: "2026-10-15"
updated: "2026-10-15"
sources:
  - title: "BIP 141: Segregated Witness (consensus layer)"
    url: "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki"
  - title: "BIP 173: Base32 address format for native v0-16 witness outputs (bech32)"
    url: "https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki"
  - title: "BIP 341: Taproot: SegWit version 1 spending rules"
    url: "https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki"
  - title: "BIP 350: Bech32m format for v1+ witness addresses"
    url: "https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki"
faq:
  - q: "Can I send from a SegWit address to a legacy address?"
    a: "Yes. All standard address types can pay each other. The type of address you spend from affects your input size; the type you pay to affects only the output size."
  - q: "Is Taproot always cheaper than native SegWit?"
    a: "For spending, a Taproot key-path input is smaller (about 57.5 vB vs 68 vB), but a Taproot output is larger (43 vB vs 31 vB). For a simple one-input, two-output payment, native SegWit is slightly smaller overall."
---

## The short version

Bitcoin charges by space, and the biggest part of a typical transaction is the **signature data** that proves you can spend each input. SegWit (activated in August 2017) moved that data into a separate "witness" section that counts at one quarter of the weight of other data. Taproot (activated in November 2021) built on SegWit with shorter Schnorr signatures. Both make spending cheaper.

## How the discount works

BIP 141 defines a transaction’s **weight** as: non-witness bytes × 4 + witness bytes × 1. Its **virtual size** is weight ÷ 4. So a byte of signature costs a quarter of a byte of everything else. Legacy inputs carry their signatures in the non-witness part and get no discount.

That is why the per-input sizes differ so much:

| Address type | Looks like | Input size | Output size |
|---|---|---|---|
| Legacy (P2PKH) | starts with `1` | ~148 vB | 34 vB |
| Nested SegWit (P2SH-P2WPKH) | starts with `3` | ~91 vB | 32 vB |
| Native SegWit (P2WPKH) | starts with `bc1q` | ~68 vB | 31 vB |
| Taproot (P2TR) | starts with `bc1p` | ~57.5 vB | 43 vB |

Note that an address starting with `3` might also be a multisignature or other script; the 91 vB figure applies to the common wrapped-SegWit single-key case.

## Same payment, three wallets

A one-input, two-output payment (the payment plus change) comes out at roughly:

- **Legacy:** 10 + 148 + 2 × 34 = **226 vB**
- **Native SegWit:** 10.5 + 68 + 2 × 31 = **140.5 → 141 vB**
- **Taproot:** 10.5 + 57.5 + 2 × 43 = **154 vB**

At 10 sat/vB that is 2,260 sats, 1,410 sats and 1,540 sats. The difference grows with every extra input: a five-input legacy spend is about 818 vB, while the same spend from native SegWit is about 413 vB.

The [daily log](/) prices all three shapes at today’s fee tiers so you can see the gap in dollars.

## Why Taproot outputs are larger

A Taproot output commits to a 32-byte public key, while a native SegWit output commits to a 20-byte key hash. So paying *to* Taproot costs a few more vbytes, and spending *from* Taproot costs fewer. Over the life of a coin (received once, spent once) the two are close; Taproot’s other benefits are privacy (complex scripts can look like simple payments) and flexibility for multisig and scripts.

## Address prefixes and checksums

Native SegWit v0 addresses use **bech32** encoding (BIP 173), which is lower-case and has strong error detection. Taproot addresses use **bech32m** (BIP 350), a corrected checksum for witness version 1 and above. Older services that cannot send to `bc1p` addresses are becoming rare, but if a withdrawal form rejects your address, a native SegWit (`bc1q`) receive address is the widely supported fallback.

## Should you move coins to a new address type?

Moving coins is itself a transaction with a fee, so it is only worth it if you will spend from the new address later at higher fee rates, or if you are consolidating many small coins anyway. A sensible approach:

1. Make sure new receive addresses in your wallet are native SegWit or Taproot.
2. When you need to consolidate, do it during a quiet period (check the backlog on the [log](/)) and send to a modern address type.
3. Do not move coins solely to save a few cents.

For how fee rates themselves are set, see [how Bitcoin fees are calculated](/guides/bitcoin-fees-explained/). To size a specific transaction, use the [fee estimator](/tools/btc-fee-estimator/).
