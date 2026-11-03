/** PAID synthetic input through the real app. Does not certify human naturalness.
 * --voice-provider=openai explicitly selects the timing control while Gemini is blocked.
 * --fixtures=<manifest> accepts prepared per-turn PCM16 mono 24kHz input (including Gemini).
 * Both guest tracks continuously publish 20ms frames. Human turns never wait for ASR.
 */
import { env, livekitConfig } from '../server/config.js';
import { synthesize } from '../server/speech/tts.js';
import { AgentRoom } from '../server/agent/room.js';
import { createToken } from '../server/livekit/tokens.js';
import { AudioFrame } from '@livekit/rtc-node';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const fixtureArg = process.argv.find(s => s.startsWith('--fixtures='))?.slice(11);
if (!fixtureArg && !process.argv.includes('--voice-provider=openai')) throw new Error('Explicitly select --fixtures=<manifest> or --voice-provider=openai. Paid opt-in only.');
const root = join(env.OUTPUT_DIR, 'probes', `cadence-${Date.now()}`);
mkdirSync(root, { recursive: true });
const base = `http://localhost:${env.PORT}`;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, Math.max(0, ms)));
async function api(path: string, body?: unknown, method = 'POST') {
  const r = await fetch(base + path, { method: body === undefined ? 'GET' : method, headers: { Origin: base, 'x-studio': '1', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const j = await r.json() as any;
  if (!r.ok || !j.success) throw new Error(`Local Studio request failed: ${path}`);
  return j.data;
}
const before = await api('/api/state');
if (before.status.sessionActive || before.status.agentInRoom) throw new Error('An active session must finish first; refusing to interrupt it.');
if (!livekitConfig() || !env.META_API_KEY) throw new Error('Meta and LiveKit local configuration required.');
const dialogue = [
  [0, "Okay, singularity. I keep hearing 'AI gets smarter, then everything changes.' But what actually changes first?"],
  [1, "The feedback loop, right? Better AI helps build the next AI."],
  [0, "Right. Who wrote that ninety-three essay? Co-host, check the author and title for us."],
  [1, "My question is, does that loop actually escape the real world? You still need chips. You need power."],
  [0, "And experiments. A model can pitch a thousand ideas. Somebody still has to find out which ones work."],
  [1, "Exactly. More ideas isn't automatically more discovery."],
  [0, "Though if the AI starts picking better experiments, that's a different story."],
  [1, "Yeah. That's where I'd start watching. Not just how fast it talks, but what it helps us test."],
  [1, "There we go. Let's keep that source. The interesting part is still the feedback loop."],
  [0, "Yeah, and whether the experiments can keep up. That's the conversation I want to have."],
] as const;
type Clip = { speaker: number; text: string; pcm: Int16Array; provider: string; voice?: string };
const clips: Clip[] = [];
const e: any = { kind: 'synthetic-cadence-real-Meta-app', humanTrial: false, startedAt: Date.now(), scenario: 'cadence',
  source: fixtureArg ? 'explicit-fixture-manifest' : 'OpenAI timing control; Gemini generation blocked by monthly spending cap',
  cohost: { asr: env.META_ASR_MODEL, director: env.META_DIRECTOR_MODEL, tts: `OpenAI ${env.TTS_MODEL} / ${env.TTS_VOICE}` },
  gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  utterances: [], receivedNonSilentAiFrames: 0, receiverAudioDuringPublishedSpeech: 0,
  followupDisclosure: 'Prewritten synthetic follow-up lines, scheduled after observed answer audio; not spontaneous human reactions.',
  timingDisclosure: 'Sender frame schedule and same-computer event timestamps. Physical speech end and human listener latency not measured.' };
function trim(pcm: Int16Array) {
  // Remove only fixture padding before publishing, never gaps from the recorded run.
  let a = 0, b = pcm.length;
  while (a < b && Math.abs(pcm[a]) < 120) a++;
  while (b > a && Math.abs(pcm[b - 1]) < 120) b--;
  return pcm.slice(Math.max(0, a - 1200), Math.min(pcm.length, b + 1920));
}
if (fixtureArg) {
  const manifest = JSON.parse(readFileSync(fixtureArg, 'utf8'));
  if (manifest.sampleRate !== 24000 || manifest.channels !== 1 || manifest.format !== 'pcm16le' || manifest.turns.length !== dialogue.length) throw new Error('Invalid fixture manifest');
  for (const c of manifest.turns) {
    if (![0, 1].includes(c.speaker) || typeof c.text !== 'string') throw new Error('Invalid fixture speaker/text');
    const bytes = Uint8Array.from(readFileSync(resolve(dirname(fixtureArg), c.path)));
    if (bytes.length % 2 || !bytes.length || bytes.length > 24000 * 2 * 30) throw new Error('Invalid fixture audio');
    clips.push({ speaker: c.speaker, text: c.text, pcm: trim(new Int16Array(bytes.buffer)), provider: manifest.provider, voice: c.voice });
  }
} else {
  const cache = join(env.OUTPUT_DIR, 'probes', 'synthetic-tts-cache'); mkdirSync(cache, { recursive: true });
  for (const [speaker, text] of dialogue) {
    const voice = speaker ? 'alloy' : 'nova';
    const id = createHash('sha256').update(JSON.stringify({ provider: 'OpenAI', model: env.TTS_MODEL, voice, text, format: 'pcm16-mono-24000-v1' })).digest('hex');
    const path = join(cache, id + '.json');
    let pcm: Int16Array;
    if (existsSync(path)) {
      const saved = JSON.parse(readFileSync(path, 'utf8')), bytes = Buffer.from(saved.pcmBase64, 'base64');
      if (saved.key !== id || createHash('sha256').update(bytes).digest('hex') !== saved.sha256 || bytes.length % 2) throw new Error('Corrupt synthetic cache');
      pcm = new Int16Array(Uint8Array.from(bytes).buffer);
    } else {
      pcm = await synthesize(env.OPENAI_API_KEY!, env.TTS_MODEL, voice, text, AbortSignal.timeout(22000));
      const bytes = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      writeFileSync(path, JSON.stringify({ key: id, sha256: createHash('sha256').update(bytes).digest('hex'), pcmBase64: bytes.toString('base64') }));
    }
    clips.push({ speaker, text, pcm: trim(pcm), provider: 'OpenAI', voice });
  }
}

const rooms = [new AgentRoom(), new AgentRoom()];
const logs = new Map<string, any>();
const stage = (s: string) => [...logs.values()].filter(x => x.meta?.stage === s);
let running = false, started = false, changed = false, pump: Promise<void> | undefined, observer: Promise<void> | undefined;
let epoch = 0, frameIndex = 0, lastAiAt = 0, deadline = Infinity, active: { clip: Clip; start: number; end: number } | null = null;
let pumpFailure = false, pollFailure = false;
function guard() {
  if (Date.now() >= deadline) throw new Error('150-second session deadline');
  if (pumpFailure || pollFailure) throw new Error('Frame pump or state observer failed');
  if ([...logs.values()].some(x => x.kind === 'error') || stage('research-cancelled').some(x => x.meta.reason === '60-second TTL expired')) throw new Error('Provider failure or expired research; inspect the preserved session events');
}
async function until(test: () => boolean) { while (!test()) { guard(); await sleep(40); } }
async function play(i: number, gapMs = 220) {
  guard();
  const clip = clips[i];
  const start = frameIndex + Math.ceil(gapMs / 20), frames = Math.ceil(clip.pcm.length / 480);
  active = { clip, start, end: start + frames };
  const u: any = { index: i, speaker: clip.speaker, identity: e.participants[clip.speaker].identity, text: clip.text, provider: clip.provider,
    voice: clip.voice, syntheticSendStartedAt: epoch + start * 20, syntheticSendEndedAt: epoch + (start + frames) * 20,
    pcmDurationMs: clip.pcm.length / 24, precedingScheduledGapMs: gapMs, waitsForAsr: false };
  e.utterances.push(u);
  if (i === 2) e.explicitRequestStartedAt = u.syntheticSendStartedAt;
  await until(() => frameIndex >= start + frames);
  u.observedSendEndedAt = Date.now(); active = null;
}
try {
  await api('/api/settings', { ...before.settings, engine: 'meta', researchEnabled: true }, 'PUT'); changed = true;
  const cfg = livekitConfig()!;
  const tokens = await Promise.all([0, 1].map(i => createToken(cfg, { room: before.settings.show.roomName, role: 'guest', name: `Synthetic ${i ? 'Sam' : 'Alex'}`, ttlSeconds: 240 })));
  e.participants = tokens.map((t, i) => ({ identity: t.identity, name: `Synthetic ${i ? 'Sam' : 'Alex'}` }));
  rooms[0].on('frame', f => {
    if (f.identity !== 'ai-mc' || !f.pcm.some(x => Math.abs(x) > 100)) return;
    e.receivedNonSilentAiFrames++; lastAiAt = Date.now(); e.firstReceiverObservedAt ??= lastAiAt;
    if (active && frameIndex >= active.start && frameIndex < active.end) e.receiverAudioDuringPublishedSpeech++;
  });
  e.sessionStartedAt = Date.now(); deadline = e.sessionStartedAt + 150000;
  e.sessionId = (await api('/api/session/start', {})).sessionId; started = true;
  await Promise.all(rooms.map((r, i) => r.join(cfg.url, tokens[i].token)));
  running = true; epoch = Date.now(); e.audioClockStartedAt = epoch;
  pump = (async () => {
    while (running) {
      const current = active;
      await Promise.all(rooms.map(async (r, speaker) => {
        const frame = new Int16Array(480);
        if (current && current.clip.speaker === speaker && frameIndex >= current.start && frameIndex < current.end) {
          const offset = (frameIndex - current.start) * 480;
          frame.set(current.clip.pcm.subarray(offset, offset + 480));
        }
        await r.source.captureFrame(new AudioFrame(frame, 24000, 1, 480));
      }));
      frameIndex++;
      e.maxPumpLatenessMs = Math.max(e.maxPumpLatenessMs ?? 0, Date.now() - (epoch + frameIndex * 20));
      await sleep(epoch + frameIndex * 20 - Date.now());
    }
  })().catch(() => { pumpFailure = true; });
  observer = (async () => { while (running) {
    const s = await api('/api/state'); for (const x of s.history) if (x.at >= e.sessionStartedAt) logs.set(x.id, x);
    await sleep(120);
  } })().catch(() => { pollFailure = true; });
  await sleep(1100);
  for (const i of [0, 1, 2]) await play(i);
  // Research classification is asynchronous. The speakers keep their natural cadence.
  e.lookupTransitionWaitMs = 0;
  for (let i = 3; i < 8; i++) await play(i);
  e.discussionEndedAt = Date.now();
  await until(() => {
    const generated = stage('tts-generated')[0];
    const duration = generated?.meta.samples ? generated.meta.samples / 24 : Infinity;
    return Boolean(e.firstReceiverObservedAt) && Date.now() >= e.firstReceiverObservedAt + duration + 220 && Date.now() - lastAiAt > 220;
  });
  e.followupStartedAt = Date.now();
  for (const i of [8, 9]) await play(i, 220);
  await sleep(1500); await api('/api/control', { action: 'hold' });
  e.holdState = (await api('/api/state')).status.mcState;
} catch (error) { e.error = error instanceof Error ? error.message : 'Probe failed'; }
finally {
  running = false; await pump; await observer;
  if (started) await api('/api/session/stop', {}).catch(() => { e.stopFailed = true; });
  for (const r of rooms) { await r.leave().catch(() => { e.leaveFailed = true; }); await r.source.close().catch(() => { e.sourceCloseFailed = true; }); }
  if (changed) await api('/api/settings', before.settings, 'PUT').catch(() => { e.settingsRestoreFailed = true; });
  if (e.sessionId) {
    const dir = join(env.OUTPUT_DIR, e.sessionId), file = join(dir, 'events.jsonl');
    if (existsSync(file)) for (const line of readFileSync(file, 'utf8').split('\n').filter(Boolean)) { const x = JSON.parse(line); logs.set(x.id, x); }
    e.artifacts = ['mix.wav', 'mc.wav', 'events.jsonl', 'summary.json'].map(file => ({ file, exists: existsSync(join(dir, file)) }));
  }
  const events = [...logs.values()].sort((a, b) => a.at - b.at);
  e.transcripts = events.filter(x => x.kind === 'human'); e.timeline = events.filter(x => x.meta?.stage);
  e.sources = stage('research-complete').flatMap(x => x.meta.sources ?? []);
  e.researchJobId = stage('research-request')[0]?.meta.jobId ?? null;
  e.reviewFailures = stage('research-review-failed').map(x => x.meta.failure);
  e.delivered = stage('research-review').some(x => x.meta.action === 'DELIVER');
  e.twoIdentitiesTranscribed = e.participants?.every((p: any) => e.transcripts.some((x: any) => x.meta?.identity === p.identity));
  e.firstReceiverAfterDiscussionMs = e.firstReceiverObservedAt && e.discussionEndedAt ? e.firstReceiverObservedAt - e.discussionEndedAt : null;
  e.ok = !e.error && !e.stopFailed && !e.leaveFailed && !e.sourceCloseFailed && !e.settingsRestoreFailed && !pumpFailure && !pollFailure &&
    e.delivered && e.sources.length > 0 && e.twoIdentitiesTranscribed && e.receiverAudioDuringPublishedSpeech === 0 && e.holdState === 'held' &&
    e.artifacts?.every((a: any) => a.exists);
  e.finishedAt = Date.now();
  writeFileSync(join(root, 'evidence.json'), JSON.stringify(e, null, 2));
  writeFileSync(join(root, 'events.json'), JSON.stringify(events, null, 2));
  console.log(JSON.stringify({ ok: e.ok, output: root, sessionId: e.sessionId, inputProvider: clips[0]?.provider, lookupTransitionWaitMs: e.lookupTransitionWaitMs,
    firstReceiverAfterDiscussionMs: e.firstReceiverAfterDiscussionMs, error: e.error ?? null }));
}
process.exit(e.ok ? 0 : 1);
