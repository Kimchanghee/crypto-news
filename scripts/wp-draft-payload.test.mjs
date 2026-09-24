import assert from 'node:assert/strict';
import test from 'node:test';
import { makeWordPressDraft } from './wp-draft-payload.mjs';

const sample = () => ({
  title: 'Test & review <brief>',
  eventKey: 'synthetic-event-1',
  paragraphs: ['A < B & C.', 'This is a synthetic fixture, not a published story.'],
  reviewedForDraft: true,
  internalEvidence: [{
    url: 'https://example.com/primary-record',
    checkedAt: '2026-09-25T00:00:00Z',
    factsUseAllowed: true,
    publicAttributionRequired: false,
  }],
  media: [],
});

test('creates only a sanitized WordPress draft without internal provenance or media', () => {
  const payload = makeWordPressDraft(sample());
  assert.equal(payload.status, 'draft');
  assert.equal(payload.title, 'Test & review <brief>');
  assert.equal(payload.excerpt, 'A < B & C.');
  assert.match(payload.content, /<p>A &lt; B &amp; C\.<\/p>/);
  assert.equal(payload.comment_status, 'closed');
  assert.doesNotMatch(JSON.stringify(payload), /example\.com|internalEvidence|synthetic-event-1|featured_media/);
});

test('fails closed for missing editorial review, evidence or permitted fact use', () => {
  for (const change of [
    { reviewedForDraft: false },
    { internalEvidence: [] },
    { internalEvidence: [{ ...sample().internalEvidence[0], factsUseAllowed: false }] },
    { internalEvidence: [{ ...sample().internalEvidence[0], publicAttributionRequired: true }] },
    { internalEvidence: [{ ...sample().internalEvidence[0], url: 'http://example.com/record' }] },
  ]) assert.throws(() => makeWordPressDraft({ ...sample(), ...change }));
});

test('rejects unreviewed media and public source links', () => {
  assert.throws(() => makeWordPressDraft({ ...sample(), media: ['https://example.com/photo.jpg'] }));
  assert.throws(() => makeWordPressDraft({ ...sample(), paragraphs: ['See https://example.com/primary-record'] }));
});
