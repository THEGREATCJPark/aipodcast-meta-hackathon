/** PAID synthetic input through the real local Studio for v9 master video.
 * Host Maya & Host Leo discussing open-source AI energy efficiency and the original LLaMA 1 paper release date & parameter sizes.
 * Demonstrates:
 *  - Turn 1 (Host Maya rhetorical question) -> Meta stays in WAIT / Monitoring
 *  - Turn 2 (Host Leo response) -> Meta stays in WAIT / Monitoring
 *  - Turn 3 (Host Maya explicit lookup request for LLaMA 1 release date & parameter sizes) -> Meta LOOKUP + background web search
 *  - Turn 4 (Host Leo continues talking while research runs)
 *  - Turn 5 (Host Maya continues talking while research finishes -> Meta WAIT holds the floor so hosts aren't interrupted)
 *  - Floor clears -> Meta DELIVER streams grounded response via LiveKit
 *  - Turn 6 (Host Maya & Host Leo react to the delivered facts -> UI transitions to "Delivered · Monitoring conversation" with zero post-delivery interruption bug)
 */
import { env, livekitConfig } from '../server/config.js';
import { synthesize } from '../server/speech/tts.js';
import { GEMINI_TTS_MODEL } from '../server/speech/gemini-tts.js';
import { AgentRoom } from '../server/agent/room.js';
import { createToken } from '../server/livekit/tokens.js';
import { AudioFrame } from '@livekit/rtc-node';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

if (!process.argv.includes('--voice-provider=openai')) {
  throw new Error('Explicitly pass --voice-provider=openai. Paid opt-in only.');
}

const root = join(env.OUTPUT_DIR, 'probes', 'v9-master-session');
mkdirSync(root, { recursive: true });
const base = `http://localhost:${env.PORT}`;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, Math.max(0, ms)));

async function api(path: string, body?: unknown, method = 'POST') {
  const r = await fetch(base + path, {
    method: body === undefined ? 'GET' : method,
    headers: { Origin: base, 'x-studio': '1', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const j = (await r.json()) as any;
  if (!r.ok || !j.success) throw new Error(`Local Studio request failed: ${path}`);
  return j.data;
}

const before = await api('/api/state');
if (before.status.sessionActive || before.status.agentInRoom) {
  throw new Error('An active session must finish first; refusing to interrupt it.');
}
if (!livekitConfig() || !env.META_API_KEY || !env.OPENAI_API_KEY) {
  throw new Error('Meta, OpenAI, and LiveKit local configuration required.');
}

// Speaker 0 = Host Maya (nova), Speaker 1 = Host Leo (echo)
const dialogue = [
  [0, "Open-source AI models are getting so much more energy efficient during inference, aren't they?"],
  [1, "Definitely, especially with quantized weights running on local consumer hardware."],
  [0, "Wait, what was the exact release date and parameter sizes of the original LLaMA one paper from Meta? Co-host, could you check that for us?"],
  [1, "While that's running, think about on-device deployment. Smaller models cut cloud latency and keep user data local."],
  [0, "Right, and once teams fine-tune a compact model for one domain, the inference cost drops dramatically."],
  [0, "February twenty twenty-three, from seven billion up to sixty-five billion parameters—got it! That shows how fast model compression moved in just three years."],
  [1, "And having the exact paper details right in the middle of our debate kept our momentum going without missing a beat."],
] as const;

type Clip = {
  speaker: number;
  text: string;
  pcm: Int16Array;
  provider: string;
  voice: string;
  gapMs?: number;
};

const clips: Clip[] = [];
const e: any = {
  kind: 'v9-master-live-meta-session',
  humanTrial: false,
  startedAt: Date.now(),
  scenario: 'v9-llama1-efficiency',
  cohost: {
    asr: env.META_ASR_MODEL,
    director: env.META_DIRECTOR_MODEL,
    tts: env.TTS_PROVIDER === 'gemini' ? `Gemini ${GEMINI_TTS_MODEL} / ${env.GEMINI_TTS_VOICE}` : `OpenAI ${env.TTS_MODEL} / ${env.TTS_VOICE}`,
  },
  gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  utterances: [],
  receivedNonSilentAiFrames: 0,
  receiverAudioDuringPublishedSpeech: 0,
};

function trim(pcm: Int16Array) {
  let a = 0;
  let b = pcm.length;
  while (a < b && Math.abs(pcm[a]) < 120) a++;
  while (b > a && Math.abs(pcm[b - 1]) < 120) b--;
  return pcm.slice(Math.max(0, a - 1200), Math.min(pcm.length, b + 1920));
}

const cache = join(env.OUTPUT_DIR, 'probes', 'synthetic-tts-cache');
mkdirSync(cache, { recursive: true });

for (const [speaker, text] of dialogue) {
  const voice = speaker === 0 ? 'nova' : 'echo';
  const id = createHash('sha256')
    .update(JSON.stringify({ provider: 'OpenAI', model: env.TTS_MODEL, voice, text, format: 'pcm16-mono-24000-v1' }))
    .digest('hex');
  const path = join(cache, id + '.json');
  let pcm: Int16Array;
  if (existsSync(path)) {
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    const bytes = Buffer.from(saved.pcmBase64, 'base64');
    pcm = new Int16Array(Uint8Array.from(bytes).buffer);
  } else {
    pcm = await synthesize(env.OPENAI_API_KEY!, env.TTS_MODEL, voice, text, AbortSignal.timeout(22000));
    const bytes = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    writeFileSync(path, JSON.stringify({ key: id, sha256: createHash('sha256').update(bytes).digest('hex'), pcmBase64: bytes.toString('base64') }));
  }
  clips.push({ speaker, text, pcm: trim(pcm), provider: 'OpenAI', voice });
}

const rooms = [new AgentRoom(), new AgentRoom()];
const logs = new Map<string, any>();
const stage = (s: string) => [...logs.values()].filter(x => x.meta?.stage === s);
let running = false;
let started = false;
let changed = false;
let pump: Promise<void> | undefined;
let observer: Promise<void> | undefined;
let epoch = 0;
let frameIndex = 0;
let lastAiAt = 0;
let deadline = Infinity;
let active: { clip: Clip; start: number; end: number } | null = null;
let pumpFailure = false;
let pollFailure = false;

function guard() {
  if (Date.now() >= deadline) throw new Error('150-second session deadline');
  if (pumpFailure || pollFailure) throw new Error('Frame pump or state observer failed');
  if ([...logs.values()].some(x => x.kind === 'error') || stage('research-cancelled').some(x => x.meta.reason === '60-second TTL expired')) {
    throw new Error('Provider failure or expired research; inspect the preserved session events');
  }
}

async function until(test: () => boolean) {
  while (!test()) {
    guard();
    await sleep(40);
  }
}

async function play(i: number, requestedGapMs = 240) {
  guard();
  const clip = clips[i];
  const gapMs = requestedGapMs;
  const start = frameIndex + Math.ceil(gapMs / 20);
  const frames = Math.ceil(clip.pcm.length / 480);
  active = { clip, start, end: start + frames };
  const u: any = {
    index: i,
    speaker: clip.speaker,
    identity: e.participants[clip.speaker].identity,
    name: e.participants[clip.speaker].name,
    text: clip.text,
    provider: clip.provider,
    voice: clip.voice,
    syntheticSendStartedAt: epoch + start * 20,
    syntheticSendEndedAt: epoch + (start + frames) * 20,
    pcmDurationMs: clip.pcm.length / 24,
    precedingScheduledGapMs: gapMs,
  };
  e.utterances.push(u);
  if (i === 2) e.explicitRequestStartedAt = u.syntheticSendStartedAt;
  await until(() => frameIndex >= start + frames);
  u.observedSendEndedAt = Date.now();
  active = null;
  return u;
}

try {
  await api(
    '/api/settings',
    {
      ...before.settings,
      engine: 'meta',
      researchEnabled: true,
      show: {
        ...before.settings.show,
        hostName: 'Host Maya',
        showStyle: 'Two-host indie tech podcast debating open-source AI efficiency and foundational model milestones.',
      },
    },
    'PUT'
  );
  changed = true;
  const cfg = livekitConfig()!;
  const hostNames = ['Host Maya', 'Host Leo'];
  const tokens = await Promise.all(
    [0, 1].map(i => createToken(cfg, { room: before.settings.show.roomName, role: 'guest', name: hostNames[i], ttlSeconds: 240 }))
  );
  e.participants = tokens.map((t, i) => ({ identity: t.identity, name: hostNames[i] }));

  rooms[0].on('frame', f => {
    if (f.identity !== 'ai-mc' || !f.pcm.some(x => Math.abs(x) > 100)) return;
    e.receivedNonSilentAiFrames++;
    lastAiAt = Date.now();
    e.firstReceiverObservedAt ??= lastAiAt;
    if (active && frameIndex >= active.start && frameIndex < active.end) {
      e.receiverAudioDuringPublishedSpeech++;
    }
  });

  e.sessionStartedAt = Date.now();
  deadline = e.sessionStartedAt + 150000;
  e.sessionId = (await api('/api/session/start', {})).sessionId;
  started = true;
  await Promise.all(rooms.map((r, i) => r.join(cfg.url, tokens[i].token)));
  running = true;
  epoch = Date.now();
  e.audioClockStartedAt = epoch;

  pump = (async () => {
    while (running) {
      const current = active;
      await Promise.all(
        rooms.map(async (r, speaker) => {
          const frame = new Int16Array(480);
          if (current && current.clip.speaker === speaker && frameIndex >= current.start && frameIndex < current.end) {
            const offset = (frameIndex - current.start) * 480;
            frame.set(current.clip.pcm.subarray(offset, offset + 480));
          }
          await r.source.captureFrame(new AudioFrame(frame, 24000, 1, 480));
        })
      );
      frameIndex++;
      e.maxPumpLatenessMs = Math.max(e.maxPumpLatenessMs ?? 0, Date.now() - (epoch + frameIndex * 20));
      await sleep(epoch + frameIndex * 20 - Date.now());
    }
  })().catch(() => {
    pumpFailure = true;
  });

  observer = (async () => {
    while (running) {
      const s = await api('/api/state');
      for (const x of s.history) if (x.at >= e.sessionStartedAt) logs.set(x.id, x);
      await sleep(120);
    }
  })().catch(() => {
    pollFailure = true;
  });

  await sleep(1000);

  // Turn 0 (Maya rhetorical question) & Turn 1 (Leo response)
  for (const i of [0, 1]) {
    const u = await play(i, 240);
    await until(() => [...logs.values()].some(x => x.kind === 'human' && x.meta?.identity === u.identity && x.at >= u.syntheticSendStartedAt));
    await sleep(350);
  }

  // Turn 2: Maya explicit lookup request
  const u2 = await play(2, 240);
  await until(() => stage('research-request').length > 0);
  e.researchRequestedAt = stage('research-request')[0]?.at ?? Date.now();

  // Turn 3 & Turn 4: Leo and Maya continue talking while research runs & completes
  await play(3, 220);
  await play(4, 220);
  e.discussionEndedAt = Date.now();

  // Wait for AI co-host to deliver the grounded response and finish playback
  await until(() => {
    const generated = stage('tts-generated')[0];
    const duration = generated?.meta.samples ? generated.meta.samples / 24 : Infinity;
    return (
      Boolean(e.firstReceiverObservedAt) &&
      Date.now() >= e.firstReceiverObservedAt + duration + 300 &&
      Date.now() - lastAiAt > 300
    );
  });

  e.followupStartedAt = Date.now();
  // Turn 5 (Maya immediate reaction) & Turn 6 (Leo closing reaction)
  for (const i of [5, 6]) {
    const u = await play(i, 260);
    await until(() => [...logs.values()].some(x => x.kind === 'human' && x.meta?.identity === u.identity && x.at >= u.syntheticSendStartedAt));
    await sleep(300);
  }

  await sleep(1500);
  await api('/api/control', { action: 'hold' });
  e.holdState = (await api('/api/state')).status.mcState;
} catch (error) {
  e.error = error instanceof Error ? error.message : 'Probe failed';
} finally {
  running = false;
  await pump;
  await observer;
  if (started) await api('/api/session/stop', {}).catch(() => { e.stopFailed = true; });
  for (const r of rooms) {
    await r.leave().catch(() => { e.leaveFailed = true; });
    await r.source.close().catch(() => { e.sourceCloseFailed = true; });
  }
  if (changed) await api('/api/settings', before.settings, 'PUT').catch(() => { e.settingsRestoreFailed = true; });
  if (e.sessionId) {
    const dir = join(env.OUTPUT_DIR, e.sessionId);
    const file = join(dir, 'events.jsonl');
    if (existsSync(file)) {
      for (const line of readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
        const x = JSON.parse(line);
        logs.set(x.id, x);
      }
    }
    e.artifacts = ['mix.wav', 'mc.wav', 'events.jsonl', 'summary.json'].map(f => ({
      file: f,
      exists: existsSync(join(dir, f)),
    }));
  }
  const events = [...logs.values()].sort((a, b) => a.at - b.at);
  e.transcripts = events.filter(x => x.kind === 'human');
  e.timeline = events.filter(x => x.meta?.stage);
  e.sources = stage('research-complete').flatMap(x => x.meta.sources ?? []);
  e.researchJobId = stage('research-request')[0]?.meta.jobId ?? null;
  e.reviewFailures = stage('research-review-failed').map(x => x.meta.failure);
  e.delivered = stage('research-review').some(x => x.meta.action === 'DELIVER');
  e.twoIdentitiesTranscribed = e.participants?.every((p: any) =>
    e.transcripts.some((x: any) => x.meta?.identity === p.identity)
  );
  e.firstReceiverAfterDiscussionMs =
    e.firstReceiverObservedAt && e.discussionEndedAt ? e.firstReceiverObservedAt - e.discussionEndedAt : null;
  e.ok =
    !e.error &&
    !e.stopFailed &&
    !e.leaveFailed &&
    !e.sourceCloseFailed &&
    !e.settingsRestoreFailed &&
    !pumpFailure &&
    !pollFailure &&
    e.delivered &&
    e.sources.length > 0 &&
    e.twoIdentitiesTranscribed &&
    e.receiverAudioDuringPublishedSpeech === 0 &&
    e.holdState === 'held' &&
    e.artifacts?.every((a: any) => a.exists);
  e.finishedAt = Date.now();
  writeFileSync(join(root, 'evidence.json'), JSON.stringify(e, null, 2));
  writeFileSync(join(root, 'events.json'), JSON.stringify(events, null, 2));
  console.log(
    JSON.stringify({
      ok: e.ok,
      output: root,
      sessionId: e.sessionId,
      sourcesCount: e.sources.length,
      delivered: e.delivered,
      firstReceiverAfterDiscussionMs: e.firstReceiverAfterDiscussionMs,
      error: e.error ?? null,
    })
  );
}
process.exit(e.ok ? 0 : 1);
