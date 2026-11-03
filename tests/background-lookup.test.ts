import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MetaSession } from '../server/meta/session.js';
import type { Decision, Utterance } from '../server/meta/director.js';
import type { ResearchResult } from '../server/meta/research.js';
import { defaultSettings } from '../shared/settings.js';

const options = { key: 'fixture', ttsKey: 'fixture', asr: 'fixture', director: 'fixture', tts: 'fixture', voice: 'fixture', researchEnabled: true };
const utterance: Utterance = { id: 'request', identity: 'alex', text: 'Check who wrote the singularity essay.', startMs: 0, endMs: 100 };
const result: ResearchResult = { text: 'Source attributes the essay to Vinge.', sources: [{ kind: 'provider-annotation', title: 'Source', url: 'https://example.org/essay', startIndex: 0, endIndex: 6 }], results: [], responseId: 'fixture', searchCallIds: ['search-fixture'], requestedAt: 0, completedAt: 100 };
const lookup = (revision: number): Decision => ({ action: 'LOOKUP', query: 'singularity essay author', addressee: null, speakText: '', sourceUtteranceIds: ['request'], contextRevision: revision, reason: 'Explicit request' });
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test('background lookup classification survives the next speaker; delivery still needs fresh review and a clear floor', async t => {
  let finish!: () => void, searches = 0, spoken = 0, calls = 0;
  const s = new MetaSession(options, {
    decide: async (_k, _m, _u, revision) => { calls++; await new Promise<void>(resolve => { finish = resolve; }); return lookup(revision); },
    research: async () => { searches++; return result; },
    reviewResearch: async (_k, _m, input) => ({ action: input.humansSpeaking ? 'WAIT' : 'DELIVER', contextRevision: input.contextRevision, reason: 'Current floor checked', speakText: 'According to Source, Vinge wrote it.' }),
    synthesize: async () => { spoken++; return new Int16Array(480); },
  });
  s.on('error', () => undefined); await s.connect(); t.after(() => s.close());
  s.humanSpeaking('sam', true); s.acceptUtterance(utterance); await tick();
  assert.equal(calls, 1, 'search classification must start while another person keeps talking');
  s.acceptUtterance({ ...utterance, id: 'continued', identity: 'sam', text: 'The hardware still matters.', startMs: 110, endMs: 200 });
  finish(); await tick();
  assert.equal(searches, 1, 'continued speech must not erase the explicit lookup request');
  assert.equal(spoken, 0, 'a background classification cannot grant the floor');
  s.humanSpeaking('sam', false); await tick();
  assert.equal(spoken, 1);
});

for (const boundary of ['hold', 'close', 'permission', 'resume'] as const) test(`late background lookup cannot restart research after ${boundary}`, async t => {
  let finish!: () => void, signal!: AbortSignal, searches = 0;
  const s = new MetaSession(options, {
    decide: async (_k, _m, _u, revision, _handoff, requestSignal) => { signal = requestSignal; await new Promise<void>(resolve => { finish = resolve; }); return lookup(revision); },
    research: async () => { searches++; return result; }, synthesize: async () => { throw new Error('No speech expected'); },
  });
  s.on('error', () => undefined); await s.connect(); t.after(() => s.close());
  s.humanSpeaking('sam', true); s.acceptUtterance(utterance); await tick();
  assert.equal(typeof finish, 'function');
  if (boundary === 'hold') s.hold();
  if (boundary === 'close') await s.close();
  if (boundary === 'permission') s.applyLiveSettings({ ...defaultSettings(), researchEnabled: false });
  if (boundary === 'resume') s.resume();
  assert.equal(signal.aborted, true);
  finish(); await tick(); assert.equal(searches, 0);
});

test('background ASK is discarded even if the floor becomes clear before it completes', async t => {
  let finish!: () => void, spoken = 0;
  const s = new MetaSession(options, {
    decide: async (_k, _m, _u, revision) => { await new Promise<void>(resolve => { finish = resolve; }); return { ...lookup(revision), action: 'ASK', query: undefined, speakText: 'A stale follow-up question?' }; },
    synthesize: async () => { spoken++; return new Int16Array(480); },
  });
  await s.connect(); t.after(() => s.close()); s.humanSpeaking('sam', true); s.acceptUtterance(utterance); await tick();
  assert.equal(typeof finish, 'function'); s.humanSpeaking('sam', false); finish(); await tick(); assert.equal(spoken, 0);
});

test('a lookup between two quick turns is not lost while the previous classification is busy', async t => {
  let finish!: () => void, calls = 0, searches = 0, candidateIds: string[] = [];
  const s = new MetaSession(options, {
    decide: async (...args: any[]) => {
      const revision = args[3];
      if (++calls === 1) {
        await new Promise<void>(resolve => { finish = resolve; });
        return { ...lookup(revision), action: 'WAIT', query: undefined, sourceUtteranceIds: [] };
      }
      candidateIds = args[6] ?? [];
      return lookup(revision);
    },
    research: async () => { searches++; return result; },
    reviewResearch: async (_k, _m, input) => ({ action: 'WAIT', reason: 'People continue speaking', contextRevision: input.contextRevision }),
    synthesize: async () => { throw new Error('No speech expected'); },
  });
  s.on('error', () => undefined); await s.connect(); t.after(() => s.close());
  s.humanSpeaking('sam', true);
  s.acceptUtterance({ ...utterance, id: 'intro', text: 'Let us talk about the singularity.' }); await tick();
  s.acceptUtterance({ ...utterance, startMs: 200, endMs: 300 });
  s.acceptUtterance({ ...utterance, id: 'next', identity: 'sam', text: 'Meanwhile, hardware still matters.', startMs: 310, endMs: 500 });
  finish(); await tick();
  assert.equal(searches, 1, 'later ordinary conversation must not overwrite the unclassified lookup request');
  assert.deepEqual(candidateIds, ['request', 'next']);
});

test('a new transcript aborts the obsolete review immediately and reviews fresh context without waiting for its timeout', async t => {
  let firstSignal!: AbortSignal, reviews = 0, spoken = 0;
  const failures: unknown[] = [];
  const s = new MetaSession(options, {
    decide: async (_k, _m, _u, revision) => lookup(revision), research: async () => result,
    reviewResearch: async (_k, _m, input, signal) => {
      if (++reviews === 1) {
        firstSignal = signal;
        await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Stale review', 'AbortError')), { once: true }));
      }
      return { action: 'DELIVER', reason: 'Fresh review', contextRevision: input.contextRevision, speakText: 'According to Source, Vinge wrote it.' };
    }, synthesize: async () => { spoken++; return new Int16Array(480); },
  });
  s.on('error', () => undefined); s.on('evidence', x => { if (x.stage === 'research-review-failed') failures.push(x); });
  await s.connect(); t.after(() => s.close()); s.acceptUtterance(utterance); await tick();
  assert.equal(reviews, 1);
  s.acceptUtterance({ ...utterance, id: 'last-final', text: 'And experiments still take time.', startMs: 200, endMs: 300 });
  assert.equal(firstSignal.aborted, true, 'fresh ASR must not sit behind an obsolete network request');
  await tick(); assert.equal(reviews, 2); assert.equal(spoken, 1); assert.equal(failures.length, 0);
});
