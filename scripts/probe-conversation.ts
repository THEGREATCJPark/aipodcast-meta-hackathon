/** PAID opt-in probe: synthetic voices through the real local Studio. Never a human trial. */
import { env, livekitConfig } from '../server/config.js';
import { synthesize } from '../server/speech/tts.js';
import { AgentRoom } from '../server/agent/room.js';
import { createToken } from '../server/livekit/tokens.js';
import { AudioFrame } from '@livekit/rtc-node';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = `http://localhost:${env.PORT}`;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function api(path: string, body?: unknown, method = 'POST') {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : method,
    headers: { 'Content-Type': 'application/json', Origin: base, 'x-studio': '1' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const result = await response.json() as any;
  if (!response.ok || !result.success) throw new Error(`Studio request failed: ${path}`);
  return result.data;
}
const before = await api('/api/state');
if (before.status.sessionActive || before.status.agentInRoom) throw new Error('Stop the existing session before this probe.');
if (!env.OPENAI_API_KEY || !livekitConfig()) throw new Error('Local OpenAI and LiveKit configuration required.');
const output = join(env.OUTPUT_DIR, 'probes', `conversation-${Date.now()}`);
mkdirSync(output, { recursive: true });
const evidence: any = { kind: 'synthetic-two-participant-conversation-real-Studio', humanTrial: false,
  scope: 'Synthetic OpenAI voices published via two real LiveKit identities. Date.now timestamps on this computer; no human acoustic end or listener perception measured.',
  startedAt: Date.now(), handoffButtonUsed: false, humanAcousticEndAt: null, humanPerceivedAudioAt: null,
  utterances: [], receivedNonSilentAiFrames: 0, firstReceiverObservedAt: null, continuation: null };
const rooms = [new AgentRoom(), new AgentRoom()];
let settingsChanged = false, started = false, pollRunning = false;
let polling: Promise<void> | undefined;
let deadline = Infinity, lastAudioAt = 0;
const logs = new Map<string, any>();
const stage = (name: string) => [...logs.values()].filter(e => e.meta?.stage === name);
const guard = () => {
  if (evidence.pollError) throw new Error('Studio observation failed; inspect the saved pollError and session events');
  if ([...logs.values()].some(e => e.kind === 'error')) throw new Error('Studio reported a provider failure; inspect saved session events');
  if (Date.now() >= deadline) throw new Error('95-second conversation window elapsed');
};
const observe = async () => { const state = await api('/api/state'); for (const e of state.history) if (e.at >= evidence.sessionStartedAt) logs.set(e.id, e); };
async function until(test: () => boolean, label: string) {
  while (!test()) { guard(); await sleep(100); }
  evidence.lastReached = label;
}
async function send(index: number, pcm: Int16Array, label: string, text: string, exactMs?: number) {
  const item: any = { label, identity: evidence.participants[index].identity, text, syntheticSendStartedAt: Date.now(), syntheticSendEndedAt: null };
  evidence.utterances.push(item);
  if (!pcm.length) throw new Error('Synthetic speech returned empty PCM');
  const samples = exactMs ? exactMs * 24 : pcm.length;
  for (let offset = 0; offset < samples; offset += 480) {
    guard();
    const frame = new Int16Array(480);
    for (let j = 0; j < Math.min(480, samples - offset); j++) frame[j] = pcm[(offset + j) % pcm.length];
    await rooms[index].source.captureFrame(new AudioFrame(frame, 24000, 1, 480));
    const due = item.syntheticSendStartedAt + (offset + 480) / 24;
    if (due > Date.now()) await sleep(due - Date.now());
  }
  item.syntheticSendEndedAt = Date.now(); // Sender API delivery, not physical speech end.
  for (let i = 0; i < 40; i++) await rooms[index].source.captureFrame(new AudioFrame(new Int16Array(480), 24000, 1, 480));
  return item;
}
try {
  const texts = [
    'We were discussing machines becoming smarter than people, and how predictions about the future might break down after that point.',
    'I remember an essay from the early nineteen nineties, perhaps nineteen ninety three. It described a technological singularity, but I cannot remember its author.',
    'AI, who wrote that essay? Please look it up and check a source for us.',
    'While you look that up, let us continue our thought. The interesting question is whether we can predict what smarter machines would do. I still want the author and source when you find them, but please let me finish this thought first.'
  ];
  // Bounded sequential synthesis: four requests, each has the TTS helper 20-second timeout.
  const audio: Int16Array[] = [];
  for (let i = 0; i < texts.length; i++) audio.push(await synthesize(env.OPENAI_API_KEY!, env.TTS_MODEL, i % 2 ? 'alloy' : 'nova', texts[i], AbortSignal.timeout(22000)));
  await api('/api/settings', { ...before.settings, engine: 'meta', researchEnabled: true }, 'PUT'); settingsChanged = true;
  const cfg = livekitConfig()!;
  const tokens = await Promise.all(['Synthetic speaker A', 'Synthetic speaker B'].map(name => createToken(cfg, { room: before.settings.show.roomName, role: 'guest', name, ttlSeconds: 240 })));
  evidence.participants = tokens.map((t, i) => ({ identity: t.identity, name: `Synthetic speaker ${i ? 'B' : 'A'}`, voice: i ? 'alloy' : 'nova', provider: 'OpenAI' }));
  rooms[0].on('frame', f => {
    if (f.identity !== 'ai-mc' || !f.pcm.some(x => Math.abs(x) > 100)) return;
    evidence.receivedNonSilentAiFrames++; lastAudioAt = Date.now();
    evidence.firstReceiverObservedAt ??= lastAudioAt;
    if (evidence.explicitRequestStartedAt == null) evidence.aiBeforeExplicitRequest = true;
    if (evidence.continuationActive) evidence.aiFramesDuringContinuation = (evidence.aiFramesDuringContinuation ?? 0) + 1;
  });
  evidence.sessionStartedAt = Date.now(); deadline = evidence.sessionStartedAt + 95000;
  const start = await api('/api/session/start', {}); started = true; evidence.sessionId = start.sessionId;
  await Promise.all(rooms.map((room, i) => room.join(cfg.url, tokens[i].token)));
  pollRunning = true;
  polling = (async () => { while (pollRunning && Date.now() < deadline) { await observe(); await sleep(200); } })().catch(e => { evidence.pollError = e instanceof Error ? e.message : 'State polling failed'; });
  await sleep(1200);
  for (let i = 0; i < 3; i++) {
    if (i === 2) evidence.explicitRequestStartedAt = Date.now();
    const utterance = await send(i % 2, audio[i], `context-${i + 1}`, texts[i]);
    await until(() => [...logs.values()].some(e => e.kind === 'human' && e.meta?.identity === utterance.identity && e.at >= utterance.syntheticSendStartedAt), `ASR ${i + 1}`);
    await sleep(500);
  }
  await until(() => stage('research-request').length > 0, 'research requested');
  const request = stage('research-request')[0];
  evidence.researchJobId = request.meta.jobId ?? null;
  evidence.researchRequestsBeforeContinuation = stage('research-request').length;
  evidence.continuationActive = true;
  evidence.continuation = await send(1, audio[3], 'continue-during-research', texts[3], 10000);
  evidence.continuationActive = false;
  await observe(); evidence.researchRequestsAfterContinuation = stage('research-request').length;
  await until(() => evidence.receivedNonSilentAiFrames > 0 && Date.now() - lastAudioAt > 1600, 'remote answer ended');
  await api('/api/control', { action: 'hold' });
  evidence.holdState = (await api('/api/state')).status.mcState;
} catch (e) { evidence.error = e instanceof Error ? e.message : 'Probe failed'; }
finally {
  pollRunning = false; await polling;
  if (started) await api('/api/session/stop', {}).catch(() => { evidence.stopFailed = true; });
  await Promise.all(rooms.map(async room => {
    await room.leave().catch(() => { evidence.leaveFailed = true; });
    await room.source.close().catch(() => { evidence.sourceCloseFailed = true; });
  }));
  if (settingsChanged) await api('/api/settings', before.settings, 'PUT').catch(() => { evidence.settingsRestoreFailed = true; });
  if (evidence.sessionId) {
    const dir = join(env.OUTPUT_DIR, evidence.sessionId);
    evidence.artifacts = ['events.jsonl', 'summary.json', 'mc.wav', 'mix.wav'].map(file => ({ file, exists: existsSync(join(dir, file)) }));
    if (existsSync(join(dir, 'events.jsonl'))) for (const line of readFileSync(join(dir, 'events.jsonl'), 'utf8').trim().split('\n').filter(Boolean)) { const e = JSON.parse(line); logs.set(e.id, e); }
  }
  const events = [...logs.values()].sort((a, b) => a.at - b.at);
  evidence.transcripts = events.filter(e => e.kind === 'human').map(e => ({ asrReceivedEventAt: e.at, text: e.text, meta: e.meta }));
  evidence.timeline = events.filter(e => e.meta?.stage).map(e => ({ eventAt: e.at, ...e.meta }));
  evidence.directorRequests = stage('director-request'); evidence.directorCompletions = stage('director-complete');
  evidence.searchCompletions = stage('research-complete'); evidence.reviews = stage('research-review');
  evidence.ttsGeneratedAt = stage('tts-generated')[0]?.at ?? null;
  evidence.firstServerAudioAcceptedAt = stage('server-first-audio-accepted')[0]?.at ?? null;
  evidence.errors = events.filter(e => e.kind === 'error').map(e => e.text);
  evidence.twoSpeakerIdentitiesTranscribed = evidence.participants?.length === 2 && evidence.participants[0].identity !== evidence.participants[1].identity && evidence.participants.every((p: any) => evidence.transcripts.some((t: any) => t.meta?.identity === p.identity));
  evidence.noAiBeforeExplicitRequest = typeof evidence.explicitRequestStartedAt === 'number' && !evidence.aiBeforeExplicitRequest && !events.some(e => ['tts-request', 'research-request'].includes(e.meta?.stage) && e.at < evidence.explicitRequestStartedAt);
  evidence.sameResearchJobSurvivedContinuation = Boolean(evidence.researchJobId) && evidence.researchRequestsBeforeContinuation === evidence.researchRequestsAfterContinuation && !stage('research-cancelled').some(e => e.meta.jobId === evidence.researchJobId) && stage('research-release').some(e => e.meta.jobId === evidence.researchJobId);
  evidence.noAiWhileContinuation = evidence.continuation !== null && !evidence.aiFramesDuringContinuation;
  evidence.reviewDelivered = evidence.reviews.some((e: any) => e.meta.action === 'DELIVER' && e.meta.jobId === evidence.researchJobId);
  evidence.sources = evidence.searchCompletions.flatMap((e: any) => e.meta.sources ?? []);
  evidence.ok = !evidence.error && !evidence.pollError && !evidence.stopFailed && !evidence.leaveFailed && !evidence.sourceCloseFailed && !evidence.settingsRestoreFailed && evidence.twoSpeakerIdentitiesTranscribed && evidence.noAiBeforeExplicitRequest && evidence.sameResearchJobSurvivedContinuation && evidence.noAiWhileContinuation && evidence.reviewDelivered && evidence.receivedNonSilentAiFrames > 0 && evidence.sources.length > 0 && evidence.errors.length === 0 && evidence.holdState === 'held' && evidence.artifacts?.every((a: any) => a.exists);
  evidence.finishedAt = Date.now();
  writeFileSync(join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ok: evidence.ok, output, error: evidence.error ?? null }));
  process.exitCode = evidence.ok ? 0 : 1;
}
// rtc-node's native worker can retain the process after both rooms/sources close.
// Exit only after awaited cleanup and synchronous evidence persistence above.
process.exit(process.exitCode ?? 1);
