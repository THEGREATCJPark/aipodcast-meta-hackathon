/** Two bounded actual Meta calls; sanitized failures only. Does not reproduce a whole voice session. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { env } from '../server/config.js';
import { research } from '../server/meta/research.js';
import { safeResearchFailure } from '../server/meta/session.js';

if (!env.META_API_KEY) throw new Error('Configure META_API_KEY locally. Never paste it into logs.');
const query = '1993 essay The Coming Technological Singularity author';
const folder = `output/probes/research-diagnosis-${Date.now()}`;
mkdirSync(folder, { recursive: true });
const evidence: Record<string, unknown> = {
  kind: 'actual-Meta-synthetic-text-diagnostic', humanTrial: false, audioTrial: false,
  query, model: env.META_DIRECTOR_MODEL,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  originalFailureSession: '2026-11-02_1202_meta_dc37',
  originalCause: 'Unknown. Later calls cannot retroactively establish the original cause.',
  maximumCalls: 2, results: [],
};
const results: Record<string, unknown>[] = [];
for (let trial = 1; trial <= 2; trial++) {
  const start = Date.now();
  try {
    const result = await research(env.META_API_KEY, env.META_DIRECTOR_MODEL, query, [
      { text: 'We were discussing machines becoming smarter than people, and how predictions about the future might break down after that point.' },
      { text: 'I remember an essay from the early nineteen nineties, perhaps nineteen ninety three. It described a technological singularity, but I cannot remember its author.' },
      { text: 'AI, who wrote that essay? Please look it up and check a source for us.' },
    ], AbortSignal.timeout(26000));
    results.push({ trial, accepted: true, elapsedMs: Date.now() - start, result });
    console.log(JSON.stringify({ trial, accepted: true, elapsedMs: Date.now() - start, text: result.text, sources: result.sources.map(s => ({ title: s.title, url: s.url })) }));
  } catch (error) {
    const failure = safeResearchFailure(error);
    results.push({ trial, accepted: false, elapsedMs: Date.now() - start, failure });
    console.log(JSON.stringify({ trial, accepted: false, elapsedMs: Date.now() - start, failure }));
  }
  evidence.results = results;
  writeFileSync(`${folder}/evidence.json`, JSON.stringify(evidence, null, 2));
}
console.log(`Evidence: ${folder}/evidence.json`);
if (results.some(item => item.accepted !== true)) process.exitCode = 1;
