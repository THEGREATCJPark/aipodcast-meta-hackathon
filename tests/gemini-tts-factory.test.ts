import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEngine } from '../server/engines/factory.js';
import { MetaSession } from '../server/meta/session.js';
import { defaultSettings } from '../shared/settings.js';
import { env } from '../server/config.js';

test('selected Gemini speech uses the pinned model and needs no OpenAI key', () => {
  const old = env.TTS_PROVIDER; env.TTS_PROVIDER = 'gemini';
  try {
    const s = createEngine({ ...defaultSettings(), engine: 'meta' }, { meta: 'fixture', gemini: 'fixture' });
    assert.ok(s instanceof MetaSession); assert.equal(s.models.tts, 'gemini-3.8-flash-tts'); assert.equal(s.models.ttsProvider, 'gemini');
  } finally { env.TTS_PROVIDER = old; }
});
test('missing Gemini key never silently selects OpenAI speech', () => {
  const old = env.TTS_PROVIDER; env.TTS_PROVIDER = 'gemini';
  try { assert.throws(() => createEngine({ ...defaultSettings(), engine: 'meta' }, { meta: 'fixture', openai: 'fixture' }), /GEMINI_API_KEY/); }
  finally { env.TTS_PROVIDER = old; }
});
