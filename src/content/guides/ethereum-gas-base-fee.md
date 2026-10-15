---
title: "Ethereum Gas Fees Explained: Base Fee, Tip and Gas Limit"
h1: "How are Ethereum gas fees calculated?"
description: "Ethereum fees are gas used times the base fee plus a priority tip. How EIP-1559 moves the base fee by up to 12.5% a block, with worked examples in ETH and USD."
kicker: "Ethereum"
question: "How are Ethereum gas fees calculated?"
answer: "An Ethereum fee is the gas a transaction uses multiplied by the base fee plus your priority tip, both in gwei. A plain ETH transfer always uses 21,000 gas, so at a 0.8 gwei base fee and 0.2 gwei tip it costs 21,000 × 1 gwei = 0.000021 ETH."
data_asof: "2026-10-15"
published: "2026-10-15"
updated: "2026-10-15"
sources:
  - title: "EIP-1559: Fee market change for ETH 1.0 chain"
    url: "https://eips.ethereum.org/EIPS/eip-1559"
  - title: "ethereum.org: Gas and fees"
    url: "https://ethereum.org/en/developers/docs/gas/"
  - title: "ethereum.org: JSON-RPC API (eth_feeHistory)"
    url: "https://ethereum.org/en/developers/docs/apis/json-rpc/"
faq:
  - q: "What is a gwei?"
    a: "A gwei is one billionth of an ether (0.000000001 ETH). Gas prices are quoted in gwei because the numbers are easier to read."
  - q: "Why did I pay less than my max fee?"
    a: "Under EIP-1559 you set a maximum, but you pay only the block’s base fee plus your tip. The difference between your maximum and what was needed is not charged."
  - q: "Does a failed transaction still cost gas?"
    a: "Yes. If a transaction is included but reverts, the gas consumed up to the failure is still paid, because validators did the work."
---

## Three numbers

Since the London upgrade in August 2021 (EIP-1559), every Ethereum transaction fee has three parts:

1. **Gas used** — how much computation the transaction consumes. A plain ETH transfer is fixed at **21,000 gas**. Token transfers and contract interactions use more, depending on the contract.
2. **Base fee** — a per-gas price set by the protocol for each block. It is **burned**, not paid to anyone.
3. **Priority fee (tip)** — an extra per-gas amount you offer the block proposer.

> fee = gas used × (base fee + priority fee)

You also set a **max fee per gas**. If the base fee rises above your maximum before you are included, you wait; if it is lower, you pay only base fee plus tip.

## How the base fee moves

Each block has a gas **target** equal to half its gas limit. EIP-1559 adjusts the base fee after each block:

- If the block used more gas than the target, the next base fee rises.
- If it used less, it falls.
- The change is proportional and capped at **12.5% per block**.

So ten consecutive full blocks raise the base fee by at most 1.125¹⁰ ≈ 3.25 times. That predictability is why the [daily log](/) can show the *next* block’s base fee as well as the current one: it is computed from the last block’s fullness.

The log also reports how full recent blocks were on average. A figure below 50% means blocks are under target and the base fee is drifting down.

## Worked examples

At a base fee of 0.755 gwei and a tip of 0.2 gwei (0.955 gwei total), with ETH at $2,400:

| Action | Gas | ETH | USD |
|---|---|---|---|
| ETH transfer | 21,000 | 0.0000201 | ≈ $0.048 |
| Same at 20 gwei total | 21,000 | 0.00042 | ≈ $1.01 |
| Same at 100 gwei total | 21,000 | 0.0021 | ≈ $5.04 |

Contract calls vary too much to give a single number; your wallet simulates the call and shows an estimate before you sign.

## Where the log gets its numbers

We call `eth_feeHistory` on a public Ethereum mainnet JSON-RPC endpoint, asking for the last 20 blocks’ base fees and the 10th, 50th and 90th percentile tips. The log shows the latest base fee, the median of the 50th-percentile tips, and prices a 21,000-gas transfer. Details are on the [methodology page](/methodology/).

## Tips for lower fees

- **Watch the base fee, not just the tip.** The base fee is usually most of the cost; tips mainly matter when blocks are full.
- **Avoid congestion spikes.** Popular mints and market crashes push blocks to their limit and the base fee climbs 12.5% per block.
- **Check the network.** Layer-2 networks (rollups) and other chains have their own fee markets; this page covers Ethereum mainnet only.
- **Beware of fake "gas refund" offers.** Gas is never refunded by strangers; see [scam warning signs](/guides/crypto-scams-warning-signs/).

## Comparing with Bitcoin

Bitcoin prices **space** (sat/vB) through an open auction; Ethereum prices **computation** (gas) with a protocol-set base fee plus tip. Both charge by resources used rather than by value transferred. For the Bitcoin side, read [how Bitcoin fees are calculated](/guides/bitcoin-fees-explained/).
