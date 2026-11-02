import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MetaSession } from '../server/meta/session.js';
import type { ResearchResult } from '../server/meta/research.js';

test('failed relevance review records its stage and safe reason while remaining silent', async () => {
  const events: Record<string, unknown>[] = []; let audio = 0;
  const result: ResearchResult = { responseId: 'fixture', text: 'Source reports ten.', sources: [{ kind: 'provider-annotation', url: 'https://example.org', title: 'Source', startIndex: 0, endIndex: 19 }], results: [], searchCallIds: ['search-fixture'], requestedAt: 1, completedAt: 2 };
  const session = new MetaSession({ key: 'fixture', ttsKey: 'fixture', asr: 'fixture', director: 'fixture', tts: 'fixture', voice: 'fixture', researchEnabled: true }, {
    decide: async (_k, _m, us, revision) => ({ action: 'LOOKUP', query: 'public count', speakText: '', reason: 'Explicit request', addressee: null, sourceUtteranceIds: [us.at(-1)!.id], contextRevision: revision }),
    research: async () => result,
    reviewResearch: async () => { throw new DOMException('private provider content', 'TimeoutError'); },
    synthesize: async () => { audio++; return new Int16Array(480); },
  });
  session.on('evidence', e => events.push(e));
  await session.connect();
  try {
    session.acceptUtterance({ id: 'request', identity: 'a', text: 'Look up the count', startMs: 0, endMs: 1 });
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(audio, 0);
    assert.equal(session.isReady, true);
    const request = events.find(e => e.stage === 'research-review-request');
    assert.equal(request?.resultReady, true);
    assert.deepEqual(events.find(e => e.stage === 'research-review-failed')?.failure, { category: 'timeout' });
    assert.ok(!JSON.stringify(events).includes('private provider content'));
  } finally { await session.close(); }
});
