import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateVsize, feeSats, satsToUsd, ethCost, halvingInfo, congestionLabel, backlogBlocks } from '../src/lib/calc.mjs';

// Hand-computed: overhead 10 vB, +0.5 vB segwit marker/flag when any witness input.
test('native segwit 1-in 2-out = 10 + 68 + 2*31 + 0.5 = 140.5 -> 141 vB', () => {
  assert.equal(estimateVsize({ p2wpkh: 1 }, { p2wpkh: 2 }), 141);
});
test('taproot 1-in 2-out = 10 + 57.5 + 2*43 + 0.5 = 154 vB', () => {
  assert.equal(estimateVsize({ p2tr: 1 }, { p2tr: 2 }), 154);
});
test('legacy 1-in 2-out = 10 + 148 + 2*34 = 226 vB (no witness discount)', () => {
  assert.equal(estimateVsize({ p2pkh: 1 }, { p2pkh: 2 }), 226);
});
test('segwit 3-in 2-out = 10 + 3*68 + 62 + 0.5 = 276.5 -> 277 vB', () => {
  assert.equal(estimateVsize({ p2wpkh: 3 }, { p2wpkh: 2 }), 277);
});
test('zero/negative/non-numeric counts are ignored', () => {
  assert.equal(estimateVsize({ p2wpkh: 1, p2tr: -2, p2pkh: 'x' }, { p2wpkh: 1 }), Math.ceil(10 + 68 + 31 + 0.5));
});
test('unknown types throw', () => {
  assert.throws(() => estimateVsize({ foo: 1 }, {}));
});
test('fee at 5 sat/vB for 141 vB = 705 sats; at 81,800 USD = $0.5767', () => {
  const sats = feeSats(141, 5);
  assert.equal(sats, 705);
  assert.ok(Math.abs(satsToUsd(sats, 81800) - 0.576690) < 1e-6);
});
test('ETH transfer: 21,000 gas at 0.8 gwei = 0.0000168 ETH', () => {
  assert.ok(Math.abs(ethCost(21000, 0.8) - 0.0000168) < 1e-12);
});
test('halving info at height 971,587', () => {
  const h = halvingInfo(971587);
  assert.equal(h.nextHeight, 1050000);
  assert.equal(h.remainingBlocks, 78413);
  assert.equal(h.subsidyNow, 3.125);
  assert.equal(h.subsidyNext, 1.5625);
});
test('halving info exactly on a halving block', () => {
  const h = halvingInfo(840000);
  assert.equal(h.nextHeight, 1050000);
  assert.equal(h.subsidyNow, 3.125);
});
test('congestion bands', () => {
  assert.equal(congestionLabel(backlogBlocks(400_000)).label, 'Calm');
  assert.equal(congestionLabel(backlogBlocks(2_000_000)).label, 'Light swell');
  assert.equal(congestionLabel(backlogBlocks(41_457_377)).label, 'Storm');
});
