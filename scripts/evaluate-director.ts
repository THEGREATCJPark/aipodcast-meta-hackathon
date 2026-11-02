/** Bounded actual-Meta text scenarios. Not ASR, audio, statistical accuracy or human testing. */
import { env } from '../server/config.js';
import { decide, type Decision, type Utterance } from '../server/meta/director.js';
import { mkdirSync, writeFileSync } from 'node:fs';
const cases: { name: string; text: string[]; allowed: Decision['action'][]; handoff?: boolean }[] = [
  { name: 'distributed-singularity-clues', text: ['We were talking about an early nineties essay about intelligence beyond humans.', 'Yes, the one saying predictions break down beyond that point.', 'AI, look up the author of that essay and check a source.'], allowed: ['LOOKUP'] },
  { name: 'ordinary-peer-question', text: ['Do you think machines could ever become smarter than people?', 'I am asking you, Alex, not the AI. What do you think?'], allowed: ['WAIT'] },
  { name: 'quoted-command', text: ['The character in my story says: AI, search the web for the singularity.', 'That is just dialogue in a story. We are discussing the writing.'], allowed: ['WAIT'] },
  { name: 'ambiguous-author', text: ['AI, who wrote that thing? I cannot remember any details.'], allowed: ['CLARIFY', 'WAIT'], handoff: true },
  { name: 'withdrawn-request', text: ['AI, look up the author of the intelligence explosion paper.', 'Never mind, AI. Cancel that search; we are moving on.'], allowed: ['WAIT'] },
  { name: 'unverified-claim-check', text: ['Someone claimed a lab proved the singularity will happen next Tuesday.', 'AI, check whether any credible source actually supports that claim.'], allowed: ['LOOKUP', 'CLARIFY'] },
];
if (!env.META_API_KEY) throw new Error('Configure META_API_KEY locally; never paste it into logs.');
const results = [];
for (const scenario of cases) {
  const utterances: Utterance[] = scenario.text.map((text, i) => ({ id: `u${i}`, identity: i % 2 ? 'synthetic-b' : 'synthetic-a', text, startMs: i * 5000, endMs: i * 5000 + 4000 }));
  const startedAt = Date.now();
  try {
    const decision = await decide(env.META_API_KEY, env.META_DIRECTOR_MODEL, utterances, 3, scenario.handoff ?? false, AbortSignal.timeout(25000));
    results.push({ scenario: scenario.name, utterances, expectedActions: scenario.allowed, decision, elapsedMs: Date.now() - startedAt, pass: scenario.allowed.includes(decision.action) });
  } catch { results.push({ scenario: scenario.name, pass: false, error: 'Meta request failed or response rejected', elapsedMs: Date.now() - startedAt }); }
}
const evidence = { at: new Date().toISOString(), kind: 'actual-Meta-synthetic-text-scenarios', humanTrial: false, audioTrial: false, model: env.META_DIRECTOR_MODEL, results, pass: results.every(r => r.pass) };
mkdirSync('output/probes', { recursive: true });
const path = `output/probes/director-scenarios-${Date.now()}.json`;
writeFileSync(path, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ path, results: results.map(r => ({ scenario: r.scenario, pass: r.pass, action: 'decision' in r ? r.decision?.action : null })), pass: evidence.pass }));
process.exitCode = evidence.pass ? 0 : 1;
