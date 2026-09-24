// Offline only: formats an internally reviewed fact card as a WordPress DRAFT payload.
// This module never connects to WordPress, calls a model, downloads media or publishes.
// Caller-supplied review/rights flags are NOT independent legal verification or publication approval.
function requiredText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function makeWordPressDraft(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) throw new Error('fact card is required');
  const title = requiredText(card.title, 'title');
  const eventKey = requiredText(card.eventKey, 'eventKey');
  if (!Array.isArray(card.paragraphs) || card.paragraphs.length === 0) throw new Error('paragraphs are required');
  if (!Array.isArray(card.internalEvidence) || card.internalEvidence.length === 0) throw new Error('internal evidence is required');
  if (card.media?.length) throw new Error('media rights must be handled separately');
  if (card.reviewedForDraft !== true) throw new Error('editorial draft review is required');

  for (const record of card.internalEvidence) {
    const source = new URL(requiredText(record?.url, 'evidence URL'));
    if (source.protocol !== 'https:') throw new Error('evidence must use HTTPS');
    if (record.factsUseAllowed !== true) throw new Error('fact-use rights have not been checked');
    if (record.publicAttributionRequired !== false) throw new Error('source requires separate attribution review');
    requiredText(record.checkedAt, 'evidence check date');
  }
  const paragraphs = card.paragraphs.map((paragraph) => requiredText(paragraph, 'paragraph'));
  if ([title, ...paragraphs].some((text) => /https?:\/\//i.test(text))) {
    throw new Error('public draft cannot expose source links from the fact card');
  }
  // Before any real connector, persist eventKey and internalEvidence in a private durable ledger; never send them in this public API payload.
  void eventKey;
  return {
    status: 'draft',
    title,
    content: paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('\n'),
    excerpt: paragraphs[0].slice(0, 240),
    comment_status: 'closed',
    ping_status: 'closed',
  };
}
