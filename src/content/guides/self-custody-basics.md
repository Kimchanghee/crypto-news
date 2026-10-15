---
title: "Self-Custody Basics: Seed Phrases, Backups and Wallet Types"
h1: "How do you hold your own bitcoin safely?"
description: "Self-custody means you hold the keys. How seed phrases work, how to back them up, hardware vs software wallets, test transactions and mistakes that lose coins."
kicker: "Custody"
question: "How do you hold your own bitcoin safely?"
answer: "Use a reputable wallet that gives you a seed phrase, write the phrase on paper or metal, store it offline where only you can reach it, never type it into a website, and send a small test amount before moving larger sums. Whoever has the seed phrase controls the coins."
data_asof: "2026-10-15"
published: "2026-10-15"
updated: "2026-10-15"
sources:
  - title: "bitcoin.org: Secure your wallet"
    url: "https://bitcoin.org/en/secure-your-wallet"
  - title: "BIP 39: Mnemonic code for generating deterministic keys"
    url: "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki"
  - title: "U.S. FTC: What to know about cryptocurrency and scams"
    url: "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams"
faq:
  - q: "Is it safer to leave coins on an exchange?"
    a: "It is a different risk, not no risk. On an exchange you rely on the company’s security and solvency; in self-custody you rely on your own backups and care. Many people keep spending money on an exchange and savings in self-custody."
  - q: "Can a lost seed phrase be recovered?"
    a: "No. There is no password reset on a blockchain. If the phrase and every device holding the keys are lost, the coins cannot be moved by anyone."
---

## What self-custody means

A Bitcoin "wallet" does not store coins. Coins live on the blockchain, locked to keys. A wallet stores the **private keys** that can unlock them. In self-custody, those keys are yours alone; nobody can freeze, reverse or recover them for you. That is both the point and the risk.

## The seed phrase

Most wallets generate keys from a **seed phrase** (also called a recovery phrase or mnemonic) of 12 or 24 words from the standard BIP 39 word list. From that phrase, the wallet can recreate every key and address it will ever use. Practically:

- **Anyone with the words can take the coins**, from anywhere, without your device.
- **If you lose the device but have the words**, you can restore everything on a new wallet.
- **If you lose both**, the coins are gone.

Some wallets also support an optional **passphrase** (a "25th word"). It adds protection if the words are found, but if you forget it, the words alone will not restore your funds.

## Writing and storing the backup

1. Write the words by hand, in order, on paper or stamp them on metal. Check each word against the screen.
2. **Never** photograph it, store it in cloud notes, email it to yourself or type it into any website or chat.
3. Store it somewhere protected from fire, water and casual discovery. Some people keep a second copy in a separate location.
4. Consider how someone you trust would find it if something happened to you, without making it easy for anyone else.

## Choosing a wallet type

| Type | Keys live on | Good for | Watch out for |
|---|---|---|---|
| Mobile/desktop software | Your phone or computer | Small, frequent amounts | Malware, phone loss |
| Hardware wallet | A dedicated signing device | Savings | Buying from unofficial sellers; fake update prompts |
| Multisignature | Several devices or people | Larger holdings, shared control | More complexity to back up correctly |

Buy hardware wallets directly from the manufacturer or an authorised seller, and never use a device that arrives with a pre-filled seed phrase.

## Your first transfer

1. Generate a **receive address** in your wallet and compare the first and last characters on the device screen.
2. Send a **small test amount** and wait for it to confirm. Check the [network log](/) for current fees first; small test transfers make sense when fees are low.
3. Then send the rest. Modern address types make each later spend cheaper; see [SegWit and Taproot](/guides/segwit-taproot-fees/).

## Mistakes that lose coins

- Entering the seed phrase into a "wallet validation" or "support" page. Real support never asks for it. See [scam warning signs](/guides/crypto-scams-warning-signs/).
- Pasting an address without checking it; clipboard malware can swap addresses.
- Restoring a wallet on an untrusted computer.
- Only having one backup, in the same place as the device.
- Forgetting a passphrase or PIN-protected backup format.

## Records for taxes

Self-custody does not remove tax obligations. Keep dates, amounts and transaction IDs of purchases and transfers; see [crypto tax basics](/guides/crypto-tax-basics/).
