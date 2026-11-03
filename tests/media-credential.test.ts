import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectMediaCredential } from '../server/credential.js';

test('editorial generation uses the explicitly configured local key over an inherited key', () => {
  const credential = selectMediaCredential('GEMINI_API_KEY', 'GEMINI_API_KEY="fixture-local"\n', 'fixture-inherited');
  assert.equal(credential.key, 'fixture-local');
  assert.equal(credential.source, 'local_env');
});

test('an explicitly blank local key cannot silently bill an inherited project', () => {
  const credential = selectMediaCredential('GEMINI_API_KEY', 'GEMINI_API_KEY=\n', 'fixture-inherited');
  assert.equal(credential.key, undefined);
  assert.equal(credential.source, 'local_env');
});

test('process credentials remain usable when the local variable is absent', () => {
  for (const local of [undefined, 'PORT=4400\n']) {
    assert.deepEqual(selectMediaCredential('GEMINI_API_KEY', local, 'fixture-process'), { key: 'fixture-process', source: 'process_env' });
  }
});
