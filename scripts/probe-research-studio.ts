/** Explicit paid integration probe; synthetic speech, never a human trial. */
import { env, livekitConfig } from '../server/config.js';
import { synthesize } from '../server/speech/tts.js';
import { AgentRoom } from '../server/agent/room.js';
import { createToken } from '../server/livekit/tokens.js';
import { AudioFrame } from '@livekit/rtc-node';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = `http://localhost:${env.PORT}`;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
async function api(path: string, body?: unknown, method = 'POST') {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : method,
    headers: { 'Content-Type': 'application/json', Origin: base, 'x-studio': '1' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json() as any;
  if (!response.ok || !result.success) throw new Error(`Studio request failed: ${path}`);
  return result.data;
}
const before = await api('/api/state');
if (before.status.sessionActive || before.status.agentInRoom) throw new Error('Stop the existing session before this probe.');
const root = `output/probes/research-studio-${Date.now()}`;
mkdirSync(root, { recursive: true });
const evidence: any = { at: new Date().toISOString(), kind: 'synthetic-English-research-through-real-Studio', humanTrial: false, handoffButtonUsed: false };
const participant = new AgentRoom();
const interrupt = process.argv.includes('--interrupt');
let started = false;
let settingsChanged = false;
let received = 0;
let lastAudioAt = 0;
try {
  const text = 'We are discussing the technological singularity and machines designing smarter machines. AI co-host, can you look up who wrote the 1965 paper about an ultraintelligent machine and an intelligence explosion? I forgot the name. Please check a source and tell us briefly.';
  const pcm = await synthesize(env.OPENAI_API_KEY!, env.TTS_MODEL, env.TTS_VOICE, text, new AbortController().signal);
  const interruptionPcm = interrupt ? await synthesize(env.OPENAI_API_KEY!, env.TTS_MODEL, env.TTS_VOICE, 'Wait, let me finish my point. Let us talk about the mechanism instead.', new AbortController().signal) : null;
  await api('/api/settings', { ...before.settings, engine: 'meta', researchEnabled: true }, 'PUT');
  settingsChanged = true;
  const cfg = livekitConfig()!;
  const token = await createToken(cfg, { room: before.settings.show.roomName, role: 'guest', name: 'Synthetic research fixture', ttlSeconds: 240 });
  participant.on('frame', f => {
    if (f.identity === 'ai-mc' && f.pcm.some(x => Math.abs(x) > 100)) { received++; lastAudioAt = Date.now(); }
  });
  const start = await api('/api/session/start', {});
  started = true;
  evidence.sessionId = start.sessionId;
  await participant.join(cfg.url, token.token);
  await wait(1500);
  for (let i = 0; i < pcm.length; i += 480) {
    const frame = new Int16Array(480);
    frame.set(pcm.slice(i, i + 480));
    await participant.source.captureFrame(new AudioFrame(frame, 24000, 1, 480));
  }
  for (let i = 0; i < 100; i++) await participant.source.captureFrame(new AudioFrame(new Int16Array(480), 24000, 1, 480));
  const deadline = Date.now() + 90000;
  let nextStateCheck = 0;
  while (Date.now() < deadline) {
    if (interruptionPcm && received >= 20) {
      evidence.syntheticInterruptionStartedAt = Date.now();
      evidence.framesBeforeInterruption = received;
      for (let i = 0; i < interruptionPcm.length; i += 480) {
        const frame = new Int16Array(480);
        frame.set(interruptionPcm.slice(i, i + 480));
        await participant.source.captureFrame(new AudioFrame(frame, 24000, 1, 480));
      }
      for (let i = 0; i < 100; i++) await participant.source.captureFrame(new AudioFrame(new Int16Array(480), 24000, 1, 480));
      await wait(2000);
      const afterGrace = received;
      await wait(3000);
      evidence.lateAiFramesAfterGrace = received - afterGrace;
      break;
    }
    if (received && Date.now() - lastAudioAt > 2000) break;
    if (Date.now() >= nextStateCheck) {
      const state = await api('/api/state');
      if (state.history.some((entry: any) => entry.kind === 'error')) break;
      nextStateCheck = Date.now() + 2000;
    }
    await wait(250);
  }
  evidence.receivedNonSilentAiFrames = received;
  await api('/api/control', { action: 'hold' });
  evidence.holdState = (await api('/api/state')).status.mcState;
  await api('/api/session/stop', {});
  started = false;
  const dir = join(env.OUTPUT_DIR, evidence.sessionId);
  evidence.artifacts = ['events.jsonl', 'summary.json', 'mc.wav', 'mix.wav'].map(file => ({ file, exists: existsSync(join(dir, file)) }));
  const entries = readFileSync(join(dir, 'events.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  evidence.transcripts = entries.filter(e => e.kind === 'human').map(e => ({ text: e.text, meta: e.meta }));
  evidence.research = entries.filter(e => String(e.meta?.stage).startsWith('research')).map(e => e.meta);
  evidence.decisions = entries.filter(e => e.meta?.stage === 'generated-decision').map(e => e.meta);
  evidence.errors = entries.filter(e => e.kind === 'error').map(e => e.text);
  if (interrupt) evidence.automaticInterruptionObserved = entries.some(e => e.meta?.stage === 'automatic-interruption' && e.at >= evidence.syntheticInterruptionStartedAt);
  evidence.ok = received > 0 && evidence.transcripts.length > 0 && evidence.errors.length === 0 && evidence.holdState === 'held' && evidence.research.some((e: any) => e.stage === 'research-complete' && e.sources?.length > 0) && evidence.artifacts.every((a: any) => a.exists);
  if (interrupt) evidence.ok = evidence.ok && evidence.automaticInterruptionObserved && evidence.lateAiFramesAfterGrace === 0;
} catch (error) {
  evidence.ok = false;
  evidence.error = error instanceof Error ? error.message : 'Probe failed';
} finally {
  if (started) await api('/api/session/stop', {}).catch(() => undefined);
  await participant.leave();
  if (settingsChanged) await api('/api/settings', before.settings, 'PUT').catch(() => { evidence.settingsRestoreFailed = true; });
  if (evidence.settingsRestoreFailed) evidence.ok = false;
  writeFileSync(`${root}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(evidence.ok ? 0 : 1);
}
