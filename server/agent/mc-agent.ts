import { MetaSession } from "../meta/session.js";
import { WavTrack } from "../recording/wav-track.js";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { relative } from "node:path";
import type { ControlCommand, LogEntry, McState, StudioStatus } from "../../shared/events.js";
import { ENGINE_LABEL, type EngineId, type Settings } from "../../shared/settings.js";
import { PcmMixer, rmsDb } from "../audio/mixer.js";
import { SpeakerTimeline } from "../audio/speaker-timeline.js";
import { EnergyVad } from "../audio/vad.js";
import type { StudioBus } from "../bus.js";
import { createEngine, engineDescription, personaLabel } from "../engines/factory.js";
import type { LiveEngine } from "../engines/types.js";
import { AgentRoom, FRAME_MS, ROOM_SAMPLE_RATE } from "./room.js";
import { Playout } from "./playout.js";
import { TranscriptAssembler } from "./transcript-assembler.js";
import { SessionRecorder } from "../recording/session-recorder.js";
import { writeSessionOutput, type SessionStats } from "../recording/report.js";
import { HOLD_TEXT, HANDOFF_TEXT, RESUME_TEXT, noteText, speakerNote } from "./directives.js";

interface Participant {
  identity: string;
  name: string;
  vad: EnergyVad;
  levelDb: number;
}

export interface AgentDeps {
  bus: StudioBus;
  metaKey: () => string | undefined;
  openaiKey: () => string | undefined;
  geminiKey: () => string | undefined;
  livekit: () => { url: string; agentToken: (room: string) => Promise<string> } | null;
}

const CHUNK_MS = 40;

/** AI MC 한 명: LiveKit 방 ↔ 실시간 음성 엔진(GPT-Live / Gemini Live)을 잇고 CJ의 제어를 처리한다. */
export class McAgent {
  private readonly room = new AgentRoom();
  private readonly playout: Playout;
  private readonly mixer = new PcmMixer({ sampleRate: ROOM_SAMPLE_RATE, chunkMs: CHUNK_MS, maxBufferMs: 300, prebufferMs: 60 });
  private participants = new Map<string, Participant>();
  private session: LiveEngine | null = null;
  private starting: Promise<void> | null = null;
  private abortStart = false;
  private names = new Map<string, string>();
  private settings: Settings | null = null;
  private sessionId: string | null = null;
  private pump: NodeJS.Timeout | null = null;
  private clockStart = 0;
  private chunksSent = 0;
  private held = false;
  private state: McState = "offline";
  private usageSeconds = 0;
  private costUsd = 0;
  private sessionStartedAt = 0;
  private recorder: SessionRecorder | null = null;
  private counts: Record<string, number> = {};
  private tokens: { input: number; output: number } | null = null;
  private lastOutputDir: string | null = null;
  private timeline = new SpeakerTimeline();
  private humanTx = new TranscriptAssembler("human");
  private mcTx = new TranscriptAssembler("mc");
  private logIds = new Map<string, LogEntry>();
  private backendLogs = new Map<string, LogEntry>();
  private lastAnnounced: string | null = null;
  private turnEndedAt: number | null = null;
  private latencies: number[] = [];
  private statusTimer: NodeJS.Timeout;

  constructor(private readonly deps: AgentDeps) {
    this.playout = new Playout(this.room.source, ROOM_SAMPLE_RATE, FRAME_MS, () => this.onMcSound(), (frame) => this.recorder?.mc(frame));
    this.room.on("frame", (f) => this.onFrame(f.identity, f.name, f.pcm));
    this.room.on("participantJoined", (id, name) => {
      this.ensureParticipant(id, name);
      this.deps.bus.log("system", `${name} 입장`);
    });
    this.room.on("participantLeft", (id) => {
      const p = this.participants.get(id);
      if (this.session instanceof MetaSession) this.session.participantLeft(id);
      this.participants.delete(id);
      this.mixer.remove(id);
      if (p) this.deps.bus.log("system", `${p.name} 퇴장`);
    });
    this.room.on("disconnected", (reason) => {
      this.deps.bus.log("error", `AI MC가 방에서 끊어졌습니다 (${reason})`);
      void this.stopSession();
    });
    this.statusTimer = setInterval(() => this.deps.bus.status(this.status()), 150);
  }

  status(): StudioStatus {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    return {
      livekitConfigured: this.deps.livekit() !== null,
      metaConfigured: Boolean(this.deps.metaKey()),
      ...(this.session instanceof MetaSession ? { providerModels: this.session.models, metaState: this.session.state } : {}),
      openaiConfigured: Boolean(this.deps.openaiKey()),
      geminiConfigured: Boolean(this.deps.geminiKey()),
      engine: this.session ? this.session.id : null,
      persona: this.session && this.settings ? personaLabel(this.settings) : null,
      costUsd: this.costUsd,
      agentInRoom: this.room.connected,
      sessionActive: this.session !== null,
      mcState: this.currentState(),
      participants: [...this.participants.values()].map((p) => ({
        identity: p.identity, name: p.name, speaking: p.vad.isSpeaking, levelDb: Math.round(p.levelDb),
      })),
      // Gemini는 턴이 끝날 때만 사용량을 보내므로 화면에는 실제 경과 시간을 보여 준다.
      usageSeconds: this.session?.id === "gemini-live" ? (Date.now() - this.sessionStartedAt) / 1000 : this.usageSeconds,
      lastLatencyMs: this.latencies.at(-1) ?? null,
      latencyMedianMs: percentile(sorted, 0.5),
      sessionId: this.sessionId,
      recording: this.recorder !== null,
      lastOutputDir: this.lastOutputDir,
    };
  }

  get activeSettings(): Settings | null {
    return this.session ? this.settings : null;
  }

  async startSession(settings: Settings): Promise<void> {
    if (this.session || this.starting) throw new Error("이미 세션이 진행 중이거나 시작하는 중입니다");
    const lk = this.deps.livekit();
    if (!lk) throw new Error("LiveKit 설정이 없습니다 (.env)");
    // 키가 없으면 방에 들어가기 전에 바로 알린다.
    const engine = createEngine(settings, { meta: this.deps.metaKey(), openai: this.deps.openaiKey(), gemini: this.deps.geminiKey() });
    this.abortStart = false;
    this.starting = this.doStart(engine, lk, settings);
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  private async doStart(session: LiveEngine, lk: NonNullable<ReturnType<AgentDeps["livekit"]>>, settings: Settings): Promise<void> {
    this.state = "connecting";
    this.settings = settings;
    this.resetSessionState();
    try {
      if (!this.room.connected) await this.room.join(lk.url, await lk.agentToken(settings.show.roomName));
      if (this.abortStart) throw new Error("세션 시작이 취소되었습니다");
      this.wireSession(session);
      await session.connect();
      if (this.abortStart || !session.isReady) throw new Error("세션 시작이 취소되었거나 연결이 끊겼습니다");
      this.session = session;
      this.sessionId = sessionFolderName(settings.engine);
      const dir = this.deps.bus.beginSession(this.sessionId);
      this.sessionStartedAt = Date.now();
      this.recorder = new SessionRecorder(dir, ROOM_SAMPLE_RATE);
      this.deps.bus.log("system", `세션 시작 · ${engineDescription(settings)} · MC 트랙: ${personaLabel(settings)}${settings.persona.openingMode === "wait" ? " (CJ 첫마디 대기)" : ""}`);
      this.startPump();
      this.state = "listening";
    } catch (err: unknown) {
      this.state = this.abortStart ? "offline" : "error";
      this.session = null;
      this.stopPump();
      await session.close().catch(() => undefined);
      throw err;
    }
  }

  async stopSession(): Promise<void> {
    if (this.starting) {
      this.abortStart = true;
      await this.starting.catch(() => undefined);
    }
    this.stopPump();
    this.playout.flush();
    const s = this.session;
    this.session = null;
    if (s) {
      await s.close().catch(() => undefined);
      const extra = s.id === "gpt-live" ? ", 백엔드 별도" : ", 검색 별도";
      this.deps.bus.log("system", `세션 종료 · ${Math.round(this.usageSeconds)}초 · 추정 $${this.costUsd.toFixed(3)}${extra}`);
    }
    for (const e of this.logIds.values()) this.deps.bus.persist(e);
    for (const e of this.backendLogs.values()) this.deps.bus.persist(e);
    if (s) this.exportSession(s.id);
    this.recorder = null;
    this.deps.bus.endSession();
    this.state = "offline";
  }

  private stopPump(): void {
    if (this.pump) clearInterval(this.pump);
    this.pump = null;
  }

  async leaveRoom(): Promise<void> {
    await this.stopSession();
    await this.room.leave();
    this.participants = new Map();
  }

  updateLiveSettings(settings: Settings): void {
    if (!this.session || !this.settings) return;
    this.settings = { ...this.settings, gptLive: { ...this.settings.gptLive, delegation: settings.gptLive.delegation }, floor: settings.floor };
    const applied = this.session.id === "gpt-live" ? this.session.applyLiveSettings(this.settings) : null;
    for (const p of this.participants.values()) p.vad.setThreshold(settings.floor.speechThresholdDb);
    this.deps.bus.log("system", `${applied ? `${applied}, ` : ""}발화 감지 설정을 세션에 반영했습니다. 나머지는 다음 세션부터 적용됩니다.`);
  }

  control(cmd: ControlCommand): void {
    const s = this.session;
    if (!s) throw new Error("진행 중인 세션이 없습니다");
    switch (cmd.action) {
      case "hold":
        this.count("holds");
        this.held = true;
        this.playout.flush();
        if (s instanceof MetaSession) s.hold(); else s.instruct(HOLD_TEXT);
        this.deps.bus.log("note", "AI 즉시 정지", { speaker: this.hostName() });
        return;
      case "resume":
        this.playout.flush();
        this.held = false;
        if (s instanceof MetaSession) s.resume(); else s.instruct(RESUME_TEXT);
        this.deps.bus.log("note", "자동 진행 재개", { speaker: this.hostName() });
        return;
      case "handoff":
        this.count("handoffs");
        this.held = false;
        this.turnEndedAt = Date.now();
        s.speakNow(HANDOFF_TEXT(this.hostName()));
        this.deps.bus.log("note", "MC에게 넘기기", { speaker: this.hostName() });
        return;
      case "note": {
        const text = cmd.text.trim().slice(0, 1500);
        if (!text) return;
        this.count("notes");
        if (cmd.speak) {
          this.held = false;
          s.speakNow(noteText(this.hostName(), text, true));
        } else {
          s.think(noteText(this.hostName(), text, false));
        }
        this.deps.bus.log("note", text, { speaker: `${this.hostName()} → MC${cmd.speak ? " (말하기)" : " (메모)"}` });
        return;
      }
    }
  }

  dispose(): void {
    clearInterval(this.statusTimer);
  }

  private hostName(): string {
    return this.settings?.show.hostName ?? "CJ";
  }

  private currentState(): McState {
    if (this.state === "connecting" || this.state === "error") return this.state;
    if (!this.session) return "offline";
    if (this.held) return "held";
    return this.playout.speaking ? "speaking" : "listening";
  }

  private resetSessionState(): void {
    this.held = false;
    this.usageSeconds = 0;
    this.costUsd = 0;
    this.counts = {};
    this.tokens = null;
    this.latencies = [];
    this.timeline = new SpeakerTimeline();
    // 로그 항목 id가 이전 세션과 겹치면 화면에서 서로 덮어쓰므로 세션마다 다른 접두어를 쓴다.
    const tag = Date.now().toString(36);
    this.humanTx = new TranscriptAssembler(`human-${tag}`);
    this.mcTx = new TranscriptAssembler(`mc-${tag}`);
    this.logIds = new Map();
    this.backendLogs = new Map();
    this.lastAnnounced = null;
    this.turnEndedAt = null;
    this.mixer.clear();
    const threshold = this.settings?.floor.speechThresholdDb ?? -45;
    for (const p of this.participants.values()) p.vad = this.newVad(threshold);
  }

  private newVad(thresholdDb: number): EnergyVad {
    return new EnergyVad({ thresholdDb, startMs: 200, endMs: 700 });
  }

  private startPump(): void {
    this.stopPump();
    this.clockStart = performance.now();
    this.chunksSent = 0;
    this.pump = setInterval(() => {
      let due = Math.floor((performance.now() - this.clockStart) / CHUNK_MS);
      // 이벤트 루프가 크게 밀렸으면 따라잡지 않고 건너뛴다 (지연 누적 방지).
      // 보내지 않은 구간만큼 기준 시각을 옮겨 입력 시간축이 모델의 start_ms와 계속 맞게 한다.
      const behind = due - this.chunksSent;
      if (behind > 10) {
        this.clockStart += (behind - 1) * CHUNK_MS;
        due = this.chunksSent + 1;
      }
      while (this.chunksSent < due) {
        this.session?.appendAudio(this.mixer.pull());
        this.chunksSent += 1;
      }
    }, CHUNK_MS / 2);
  }

  /** 입력 스트림 기준 현재 시각 (GPT-Live start_ms와 같은 기준) */
  private inputMs(): number {
    return this.session ? this.chunksSent * CHUNK_MS : 0;
  }

  private ensureParticipant(identity: string, name: string): Participant {
    const existing = this.participants.get(identity);
    if (existing) return existing;
    const threshold = this.settings?.floor.speechThresholdDb ?? -45;
    const p: Participant = { identity, name, vad: this.newVad(threshold), levelDb: -100 };
    this.participants.set(identity, p);
    this.names.set(identity, name);
    return p;
  }

  private onFrame(identity: string, name: string, pcm: Int16Array): void {
    const p = this.ensureParticipant(identity, name);
    const db = rmsDb(pcm);
    p.levelDb = p.levelDb * 0.7 + db * 0.3;
    if (!this.session) return;
    if (this.session instanceof MetaSession) this.session.appendParticipant(identity, pcm);
    else this.mixer.push(identity, pcm);
    this.recorder?.human(identity, name, pcm);
    // 이 프레임은 믹서 버퍼에 쌓인 만큼 뒤에 전송되므로 그 위치를 발화 시각으로 쓴다.
    const queuedMs = Math.max(0, this.mixer.bufferedSamples(identity) - pcm.length) / (ROOM_SAMPLE_RATE / 1000);
    const ev = p.vad.process(db, this.inputMs() + queuedMs, FRAME_MS);
    if (ev?.type === "start") this.onHumanStart(p, ev.atMs);
    if (ev?.type === "end") this.onHumanEnd(p, ev.atMs);
  }

  private onHumanStart(p: Participant, atMs: number): void {
    if (this.session instanceof MetaSession) this.session.humanSpeaking(p.identity, true);
    this.timeline.start(p.identity, atMs);
    this.turnEndedAt = null;
    if (this.settings?.floor.announceSpeakers && this.lastAnnounced !== p.identity && this.participants.size > 1) {
      this.lastAnnounced = p.identity;
      this.session?.think(speakerNote(p.name));
    }
  }

  private onHumanEnd(p: Participant, atMs: number): void {
    if (this.session instanceof MetaSession) this.session.humanSpeaking(p.identity, false);
    this.timeline.end(p.identity, atMs);
    const anyoneSpeaking = [...this.participants.values()].some((x) => x.vad.isSpeaking);
    if (!anyoneSpeaking && !this.playout.speaking) this.turnEndedAt = Date.now();
  }

  private onMcSound(): void {
    if (this.turnEndedAt !== null) {
      this.latencies = [...this.latencies, Date.now() - this.turnEndedAt].slice(-5000);
      this.turnEndedAt = null;
    }
  }

  private count(key: string): void {
    this.counts = { ...this.counts, [key]: (this.counts[key] ?? 0) + 1 };
  }

  /** 세션 폴더에 오디오·대화록·사용량·리포트를 정리한다. 실패해도 세션 종료는 계속한다. */
  private exportSession(engine: EngineId): void {
    const dir = this.deps.bus.currentSessionDir();
    if (!dir || !this.settings) return;
    try {
      const tracks = this.recorder?.stop() ?? [];
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const stats: SessionStats = {
        summary: {
          sessionId: this.sessionId,
          engine,
          engineLabel: ENGINE_LABEL[engine],
          persona: personaLabel(this.settings),
          description: engineDescription(this.settings),
          startedAt: this.sessionStartedAt,
          durationSec: Math.round((Date.now() - this.sessionStartedAt) / 1000),
          turns: sorted.length,
          latencyMedianMs: percentile(sorted, 0.5),
          latencyP95Ms: percentile(sorted, 0.95),
          costUsd: Number(this.costUsd.toFixed(4)),
        },
        latenciesMs: this.latencies,
        counts: this.counts,
        tokens: this.tokens ?? undefined,
      };
      writeSessionOutput(dir, stats, this.settings, tracks, this.sessionStartedAt);
      this.lastOutputDir = relative(process.cwd(), dir);
      this.deps.bus.log("system", `녹음·대화록·사용량을 저장했습니다 → ${this.lastOutputDir}`);
    } catch (err: unknown) {
      this.deps.bus.log("error", `세션 정리 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private wireSession(session: LiveEngine): void {
    const bus = this.deps.bus;
    session.on("audio", (pcm) => {
      if (this.session !== session || this.held || (session.id === "meta" && [...this.participants.values()].some(p => p.vad.isSpeaking))) return;
      if (pcm.length > 0) this.playout.enqueue(pcm);
    });
    session.on("decision", (d) => { if (this.session === session) bus.log("system", `${d.action}: ${d.reason}`, { meta: { ...d, stage: "generated-decision" } }); });
    session.on("generatedAudio", (pcm, generation) => {
      const dir = bus.currentSessionDir();
      if (!dir || this.session !== session) return;
      const wav = new WavTrack(join(dir, `tts-generated-${generation}.wav`), ROOM_SAMPLE_RATE);
      wav.writeAt(pcm, 0); wav.finalize();
    });
    session.on("inputTranscript", (d) => {
      if (this.session !== session) return;
      if (d.identity && d.utteranceId) { bus.log("human", d.delta, { id: d.utteranceId, speaker: this.names.get(d.identity) ?? d.identity, meta: { identity: d.identity, startMs: d.startMs, endMs: d.endMs } }); this.count("humanUtterances"); return; }
      const r = this.humanTx.add(d);
      if (!r) return;
      const who = this.timeline.attribute(r.utterance.startMs, r.utterance.endMs, this.inputMs());
      const speaker = (who && this.names.get(who)) || "참가자";
      this.upsert(r.utterance.id, "human", r.utterance.text, speaker, r.isNew);
    });
    session.on("interrupted", () => {
      this.count("interruptions");
      // 서버가 생성을 취소했으므로 아직 재생하지 않은 음성을 버린다.
      this.playout.flush();
      this.mcTx.close();
    });
    session.on("turnEnd", () => this.mcTx.close());
    session.on("info", (message) => bus.log("system", message));
    session.on("outputTranscript", (d) => {
      if (this.held) return;
      const r = this.mcTx.add(d);
      if (r) this.upsert(r.utterance.id, "mc", r.utterance.text, "AI MC", r.isNew);
    });
    session.on("delegationCreated", (id) => {
      this.count("delegations");
      this.backendLogs.set(id, bus.log("backend", "백엔드 작업 중…", { speaker: `백엔드 · ${this.settings?.gptLive.delegation.model}` }));
    });
    session.on("webSearch", (_id, query) => {
      this.count("searches");
      bus.log("search", query, { speaker: session.id === "gemini-live" ? "Google 검색" : "웹 검색" });
    });
    session.on("backendText", (id, delta) => {
      const prev = this.backendLogs.get(id);
      if (!prev) return;
      const text = prev.text === "백엔드 작업 중…" ? delta : prev.text + delta;
      const next = { ...prev, text };
      this.backendLogs.set(id, next);
      bus.update(next);
    });
    session.on("backendDone", (id) => {
      const entry = this.backendLogs.get(id);
      if (entry) bus.persist(entry);
    });
    session.on("usage", (u) => {
      this.usageSeconds = Math.max(this.usageSeconds, u.seconds);
      this.costUsd = Math.max(this.costUsd, u.costUsd);
      if (u.tokens) this.tokens = u.tokens;
    });
    session.on("error", (message, code) => {
      this.count("errors");
      bus.log("error", `${code ?? "error"}: ${message}`);
    });
    session.on("closed", (reason) => {
      if (this.session === session) {
        bus.log("system", `${ENGINE_LABEL[session.id]} 세션이 닫혔습니다 (${reason})`);
        void this.stopSession();
      }
    });
  }

  private upsert(id: string, kind: "human" | "mc", text: string, speaker: string, isNew: boolean): void {
    const bus = this.deps.bus;
    const prev = this.logIds.get(id);
    if (isNew || !prev) {
      this.count(kind === "human" ? "humanUtterances" : "mcUtterances");
      for (const [k, e] of this.logIds) if (e.kind === kind && k !== id) bus.persist(e);
      this.logIds = new Map([...this.logIds].filter(([, e]) => e.kind !== kind));
      this.logIds.set(id, bus.log(kind, text, { id, speaker }));
      return;
    }
    const next = { ...prev, text, speaker };
    this.logIds.set(id, next);
    bus.update(next);
  }
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/** 사람이 알아보기 쉬운 세션 폴더 이름: 2026-10-25_1830_gemini-live_ab12 */
function sessionFolderName(engine: EngineId): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}_${engine}_${randomUUID().slice(0, 4)}`;
}
