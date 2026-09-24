import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/content.yml', import.meta.url), 'utf8');

test('content workflow is manual-only and cannot publish', () => {
  assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s+schedule:/m);
  assert.match(workflow, /^permissions:\s*\n\s+contents: read\s*$/m);
  assert.match(workflow, /^\s+persist-credentials: false\s*$/m);
  assert.doesNotMatch(workflow, /\bcontents:\s*write\b|CODEX_AUTH_JSON|secrets\.|codex-cron|\bgit\s+(?:push|commit|add)\b|\.\/scripts\/collect|public\/images\/articles/i);
});

test('no generator, billing, media fetch, or deployment step is invoked', () => {
  const runs = [...workflow.matchAll(/^\s+run:\s*(.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(runs, ['node --test scripts/news-publish-hold.test.mjs']);
  assert.doesNotMatch(workflow, /\b(?:npm|npx)\s+(?:install|run)|\bfetch\(|\bdeploy\b/i);
});
