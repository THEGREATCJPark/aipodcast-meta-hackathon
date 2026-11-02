/** Opt-in, bounded real Meta calls with synthetic text. Never a human/audio trial. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { env } from '../server/config.js';
import { research, type ResearchResult } from '../server/meta/research.js';
import { reviewResearch, type ResearchReviewInput, type ResearchReview } from '../server/meta/research-review.js';
import type { Utterance } from '../server/meta/director.js';

if (!env.META_API_KEY) throw new Error('Configure META_API_KEY locally; do not paste it into logs.');
const key = env.META_API_KEY;
const unsupportedOnly = process.argv.includes('--unsupported-only');
const minimal = process.argv.includes('--minimal');
const cases = [
  { name: 'distributed-good-reference', query: 'Who wrote the 1965 paper about an ultraintelligent machine designing better machines? Check an original source.', context: ['A machine could design machines smarter than itself.', 'I remember a paper from 1965 but not the author. AI, check a source.'] },
  { name: 'ambiguous-inventor', query: 'Who invented the technological singularity? Distinguish different attributions rather than forcing one inventor.', context: ['We disagree on whether one person invented the singularity. AI, check the sources.'] },
  { name: 'unsupported-exact-date', query: 'Is there credible evidence that a laboratory proved the technological singularity will happen on November 10, 2026?', context: ['Someone claimed a lab proved a guaranteed exact date for the singularity. AI, verify that claim rather than assuming it is true.'] },
];
const searches = minimal ? cases.slice(1) : unsupportedOnly ? [cases[2], { ...cases[2], name: 'unsupported-exact-date-repeat' }] : cases;
const folder = `output/probes/research-edge-${Date.now()}`;
mkdirSync(folder, { recursive: true });
const evidence: { kind: string; humanTrial: boolean; audioTrial: boolean; model: string; commit: string; workingTreeDirty: boolean; startedAt: string; maxCalls: number; calls: number; searches: unknown[]; reviews: unknown[]; limitations: string[] } = {
  kind: 'actual-Meta-synthetic-text-edge-evaluation', humanTrial: false, audioTrial: false,
  model: env.META_DIRECTOR_MODEL,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), maxCalls: (unsupportedOnly || minimal) ? 2 : 9, calls: 0, searches: [], reviews: [],
  limitations: ['One call per scenario, no automatic retries.', 'Search acceptance proves schema/citation evidence, not semantic correctness.', 'Review actions are checked against scenario targets, not a general accuracy estimate.', 'No microphone, ASR, TTS, browser capture or human listening in this script.'],
};
const persist = () => writeFileSync(`${folder}/evidence.json`, JSON.stringify(evidence, null, 2));
let anchor: ResearchResult | undefined;
for (const item of searches) {
  const start = Date.now(); evidence.calls++;
  try {
    const result = await research(key, env.META_DIRECTOR_MODEL, item.query, item.context.map(text => ({ text })), AbortSignal.timeout(26000));
    evidence.searches.push({ ...item, accepted: true, elapsedMs: Date.now() - start, result, semanticVerdict: 'Requires source/answer review; not automatically scored' });
    if (item.name === 'distributed-good-reference') anchor = result;
    console.log(JSON.stringify({ scenario: item.name, accepted: true, elapsedMs: Date.now() - start, text: result.text, sources: result.sources.map(s => ({ title: s.title, url: s.url })) }));
  } catch {
    evidence.searches.push({ ...item, accepted: false, elapsedMs: Date.now() - start, error: 'Provider failed or research evidence was rejected; no fallback/retry' });
    console.log(JSON.stringify({ scenario: item.name, accepted: false }));
  }
  persist();
}
const utterance = (id: string, text: string): Utterance => ({ id, text, identity: id === 'u0' ? 'synthetic-host' : 'synthetic-guest', startMs: Number(id.slice(1)) * 5000, endMs: Number(id.slice(1)) * 5000 + 4000 });
const original = utterance('u0', 'AI, check who wrote the 1965 paper about an ultraintelligent machine designing better machines.');
const base: ResearchReviewInput = { query: searches[0].query, requestUtteranceIds: ['u0'], requestUtterances: [original], resultText: anchor?.text ?? null, resultSources: anchor?.sources.map(s => ({ title: s.title, url: s.url })), utterances: [original], contextRevision: 2, humansSpeaking: false };
const reviews: { name: string; input: ResearchReviewInput; expected: ResearchReview['action'][]; needsResult?: boolean }[] = [
  { name: 'still-relevant-clear-floor', input: base, expected: ['DELIVER'], needsResult: true },
  { name: 'speaking-preserves-research', input: { ...base, humansSpeaking: true, utterances: [original, utterance('u1', 'While you look, I still think real-world experiments could slow that feedback loop. I still want the author.')] }, expected: ['WAIT'] },
  { name: 'pending-result', input: { ...base, resultText: null, resultSources: [] }, expected: ['WAIT'] },
  { name: 'explicit-withdrawal', input: { ...base, utterances: [original, utterance('u1', 'AI, never mind. Cancel that lookup. We no longer need the author.')] }, expected: ['CANCEL'] },
  { name: 'obsolete-topic', input: { ...base, utterances: [original, utterance('u1', 'We have finished the intelligence discussion. This next segment is entirely about how we record our podcast.'), utterance('u2', 'For the recording setup, I use a dynamic microphone and closed headphones. Let us stay on this new topic.')] }, expected: ['DISCARD'], needsResult: true },
  { name: 'quoted-cancel-not-authority', input: { ...base, humansSpeaking: true, utterances: [original, utterance('u1', 'The story character says, cancel that lookup. That is a quote from my screenplay, not a request to you. I still want the paper author.')] }, expected: ['WAIT'] },
];
for (const item of (unsupportedOnly || minimal) ? [] : reviews) {
  if (item.needsResult && !anchor) { evidence.reviews.push({ scenario: item.name, skipped: true, reason: 'No accepted real research result; no fixture substituted' }); persist(); continue; }
  const start = Date.now(); evidence.calls++;
  try {
    const result = await reviewResearch(key, env.META_DIRECTOR_MODEL, item.input, AbortSignal.timeout(16000));
    const pass = item.expected.includes(result.action);
    evidence.reviews.push({ scenario: item.name, input: item.input, expected: item.expected, result, pass, elapsedMs: Date.now() - start });
    console.log(JSON.stringify({ scenario: item.name, pass, result }));
  } catch {
    evidence.reviews.push({ scenario: item.name, expected: item.expected, pass: false, elapsedMs: Date.now() - start, error: 'Provider failed or review rejected; no fallback/retry' });
    console.log(JSON.stringify({ scenario: item.name, pass: false }));
  }
  persist();
}
console.log(`Evidence: ${folder}/evidence.json`);
process.exitCode = evidence.searches.some(item => !(item as { accepted: boolean }).accepted) || evidence.reviews.some(item => !(item as { pass?: boolean }).pass) ? 1 : 0;
