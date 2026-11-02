import { research, researchSpeech, ResearchResultSchema } from "./research.js";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { Settings } from "../../shared/settings.js";
import type { EngineEvents, LiveEngine } from "../engines/types.js";
import { MetaAsr, type AsrCallbacks } from "./asr-realtime.js";
import { decide, validateDecision, type Decision, type Utterance } from "./director.js";
import { TurnManager } from "./turn-manager.js";
import { synthesize } from "../speech/tts.js";

export interface MetaOptions { key: string; ttsKey: string; asr: string; director: string; tts: string; voice: string; researchEnabled?: boolean }
type AsrTransport = Pick<MetaAsr, "connect" | "append" | "close">;
export interface MetaServices {
  createAsr?: (key: string, model: string, offsetMs: number, callbacks: AsrCallbacks) => AsrTransport;
  research?: typeof research;
  decide: typeof decide;
  synthesize: typeof synthesize;
}
export class MetaSession extends EventEmitter<EngineEvents> implements LiveEngine {
  readonly id = "meta" as const;
  isReady = false;
  readonly turns = new TurnManager();
  readonly models: Omit<MetaOptions, "key" | "ttsKey">;
  state: "listening" | "thinking" | "waiting" | "speaking" | "held" | "error" = "listening";
  readonly runId = randomUUID();
  private seenUtterances = new Set<string>();
  private limited = false;
  private streams = new Map<string, AsrTransport>();
  private failedAsr = new Set<string>();
  private unavailableAsr = new Set<string>();
  private retriedAsr = new Set<string>();
  private utterances: Utterance[] = [];
  private startedAt = 0;
  private calls = 0;
  private researchCalls = 0;
  private researchedRequests = new Set<string>();
  private busy = false;
  private pending = false;
  private pendingHandoff: { generation: number; revision: number } | null = null;
  private deadline: NodeJS.Timeout | undefined;
  constructor(private options: MetaOptions, private services: MetaServices = { decide, synthesize, research }) {
    super(); this.models = { asr: options.asr, director: options.director, tts: options.tts, voice: options.voice };
  }
  async connect(): Promise<void> {
    if (this.isReady || this.turns.closed) throw new Error("Create a fresh MetaSession for each run");
    this.isReady = true; this.startedAt = Date.now();
    this.deadline = setTimeout(() => { this.limited = true; this.hold("provider-limit"); for (const stream of this.streams.values()) stream.close(); this.emit("error", "15 minute provider limit reached; recording continues until Stop", "session_limit"); }, 15 * 60 * 1000);
    this.emit("started", this.runId);
    this.emit("info", "Meta handoff mode: live account access unverified until provider response; OpenAI TTS only renders Meta text.");
  }
  appendAudio(_pcm: Int16Array): void { /* mixed PCM deliberately not sent to Meta */ }
  appendParticipant(identity: string, pcm: Int16Array): void {
    if (!this.isReady || this.limited || Date.now() - this.startedAt >= 15 * 60 * 1000) return;
    let stream = this.streams.get(identity);
    if (!stream) {
      if (this.streams.size >= 4) return;
      const callbacks: AsrCallbacks = {
        complete: (id, text, startMs, endMs) => { if (this.isReady && this.streams.get(identity) === stream && !this.failedAsr.has(identity)) this.acceptUtterance({ id, identity, text, startMs, endMs }); },
        failed: message => this.asrFailed(identity, stream!, message),
      };
      stream = this.services.createAsr?.(this.options.key, this.options.asr, Date.now() - this.startedAt, callbacks)
        ?? new MetaAsr(this.options.key, this.options.asr, Date.now() - this.startedAt, callbacks);
      this.streams.set(identity, stream); this.unavailableAsr.add(identity);
      void stream.connect().then(() => {
        if (!this.isReady || this.streams.get(identity) !== stream || this.failedAsr.has(identity)) return;
        this.unavailableAsr.delete(identity);
        this.evidence("asr-connected", { identity, recovered: this.retriedAsr.has(identity), audioGapPossible: this.retriedAsr.has(identity) });
        if (this.pending && !this.unavailableAsr.size && !this.turns.held) { this.pending = false; void this.evaluate(false); }
      }).catch(() => this.asrFailed(identity, stream!, "Meta ASR unavailable; recording continues"));
      // Buffer at most two seconds while connecting, then send at real-time pace.
      this.emit("info", `ASR connection starting for ${identity}; up to 2 seconds buffered during handshake; overflow stops ASR, original recording retained`);
    }
    stream.append(pcm);
  }
  private asrFailed(identity: string, stream: AsrTransport, message: string): void {
    if (!this.isReady || this.streams.get(identity) !== stream || this.failedAsr.has(identity)) return;
    this.failedAsr.add(identity); this.unavailableAsr.add(identity); stream.close();
    this.hold("asr-failure");
    this.evidence("asr-gap-start", { identity, retryAvailable: !this.retriedAsr.has(identity) });
    this.emit("error", `${message}. ${this.retriedAsr.has(identity) ? "Retry exhausted; restart the session." : "Resume allows one reconnect attempt."}`, "meta_asr");
  }
  participantLeft(identity: string): void { this.failedAsr.delete(identity); this.unavailableAsr.delete(identity); this.streams.get(identity)?.close(); this.streams.delete(identity); this.turns.human(identity, false); this.cancel("participant disconnected"); }
  humanSpeaking(identity: string, speaking: boolean): void {
    if (!this.isReady) return;
    this.turns.human(identity, speaking);
    if (speaking) {
      this.emit("interrupted");
      if (!this.turns.held) this.state = "listening";
      this.evidence("automatic-interruption", { identity, listenerStopMeasured: false });
    } else if (!this.turns.speakers.size && this.pending && !this.turns.held) {
      this.pending = false;
      void this.evaluate(false);
    }
  }
  private evidence(stage: string, data: Record<string, unknown> = {}): void {
    this.emit("evidence", { runId: this.runId, stage, at: Date.now(), generation: this.turns.generation, contextRevision: this.turns.revision, ...data });
  }
  acceptUtterance(u: Utterance): void {
    if (!this.isReady || this.seenUtterances.has(u.id) || !u.text.trim()) return;
    if (this.seenUtterances.size >= 5000) { this.limited = true; this.hold("provider-limit"); this.emit("error", "Transcript limit reached; recording continues", "transcript_limit"); return; }
    this.seenUtterances.add(u.id);
    this.turns.changed(); this.emit("interrupted");
    this.utterances = [...this.utterances, u].sort((a,b) => a.startMs - b.startMs).slice(-30);
    this.emit("inputTranscript", { delta: u.text, startMs: u.startMs, endMs: u.endMs, identity: u.identity, utteranceId: u.id });
    // Meta may recommend speech, but only a fresh explicit host handoff can release it.
    void this.evaluate(false);
  }
  cancel(reason: string): void { this.pendingHandoff = null; this.turns.invalidate(); this.emit("interrupted"); this.emit("info", `Cancelled: ${reason}`); }
  hold(reason = "manual-hold"): void { this.pendingHandoff = null; this.pending = false; this.turns.hold(); this.evidence(reason); this.state = "held"; this.emit("interrupted"); }
  resume(): void {
    if (!this.isReady || this.limited) return;
    if ([...this.failedAsr].some(identity => this.retriedAsr.has(identity))) { this.emit("info", "ASR reconnect attempt exhausted; restart session to resume transcription."); return; }
    for (const identity of this.failedAsr) {
      this.retriedAsr.add(identity); this.streams.delete(identity);
      this.evidence("asr-reconnect-authorized", { identity, maxRetries: 1 });
    }
    this.failedAsr.clear(); this.pendingHandoff = null;
    this.turns.resume(); this.state = "listening"; this.emit("interrupted"); this.evidence("resume-listening");
  }
  instruct(_content: string): void { /* MC uses explicit hold/resume methods; text is never control authority */ }
  think(_content: string): void { /* Speaker identity comes from tracks, not prompts. */ }
  speakNow(_instruction: string): void {
    if (this.failedAsr.size) { this.emit("info", "Handoff blocked: use Resume for the bounded ASR reconnect attempt."); return; }
    this.resume(); void this.evaluate(true);
  }
  applyLiveSettings(settings: Settings): string | null {
    if (Boolean(this.options.researchEnabled) === settings.researchEnabled) return null;
    this.options = { ...this.options, researchEnabled: settings.researchEnabled };
    this.pending = false; this.cancel("Research permission changed");
    this.evidence("research-permission", { enabled: settings.researchEnabled });
    return "Research permission updated; pending output cancelled";
  }
  async evaluate(handoff: boolean): Promise<void> {
    if (!this.isReady || this.limited || this.turns.held || !this.utterances.length) return;
    if (this.unavailableAsr.size) { if (!handoff) this.pending = true; else this.emit("info", "Handoff blocked while transcription is unavailable."); return; }
    if (this.busy) {
      if (!handoff) this.pending = true;
      else if (!this.turns.speakers.size) {
        this.pendingHandoff = { generation: this.turns.generation, revision: this.turns.revision };
        this.evidence("handoff-queued", { waitsForCurrentCancellation: true });
      }
      return;
    }
    if (this.turns.speakers.size) { if (!handoff) this.pending = true; else this.emit("info", "Human speaking: handoff was not queued. Handoff again after the floor is clear."); return; }
    if (this.calls >= 60) { this.limited = true; this.hold("provider-limit"); this.emit("error", "60 director call cap reached; recording continues", "call_limit"); return; }
    this.calls++; this.pending = false;
    this.busy = true; const ticket = this.turns.begin(); const context = this.utterances.slice();
    this.state = "thinking"; this.evidence("director-request", { handoff, call: this.calls, model: this.options.director });
    let researchStartedAt: number | null = null;
    let phase: "director" | "research" | "tts" = "director";
    try {
      const d: Decision = await this.services.decide(this.options.key, this.options.director, context, ticket.revision, handoff, ticket.signal);
      if (!this.turns.permits(ticket)) return;
      validateDecision(d, context, ticket.revision);
      this.emit("decision", d);
      this.evidence("director-complete", { action: d.action, sourceUtteranceIds: d.sourceUtteranceIds, handoff });
      this.state = "waiting";
      let speakText = d.speakText;
      if (d.action === "LOOKUP") {
        const requestId = context.at(-1)!.id;
        if (!this.options.researchEnabled) { this.evidence("research-blocked", { reason: "Research is disabled in local settings" }); return; }
        if (this.researchedRequests.has(requestId) || this.researchCalls >= 8) { this.evidence("research-blocked", { reason: "Request already attempted or 8-call session cap reached" }); return; }
        this.researchedRequests.add(requestId); this.researchCalls++;
        this.state = "thinking"; phase = "research"; researchStartedAt = Date.now();
        this.evidence("research-request", { query: d.query, sourceUtteranceIds: d.sourceUtteranceIds, model: this.options.director, call: this.researchCalls });
        const result = ResearchResultSchema.parse(await (this.services.research ?? research)(this.options.key, this.options.director, d.query!, context.slice(-3), ticket.signal));
        if (!this.turns.permits(ticket) || !this.options.researchEnabled) return;
        this.evidence("research-complete", { query: d.query, ...result, elapsedMs: result.completedAt - result.requestedAt, provider: "Meta", model: this.options.director });
        researchStartedAt = null; speakText = researchSpeech(result);
      } else if (d.action === "WAIT" || !handoff) return;
      if (!this.turns.permits(ticket)) return;
      phase = "tts";
      this.evidence("tts-request", { provider: "OpenAI", model: this.options.tts, characters: speakText.length, text: speakText });
      const pcm = await this.services.synthesize(this.options.ttsKey, this.options.tts, this.options.voice, speakText, ticket.signal);
      if (!this.turns.permits(ticket)) return;
      if (!pcm.length || pcm.length > 24000 * 30) throw new Error("Invalid TTS duration");
      this.emit("generatedAudio", pcm, ticket.generation);
      this.evidence("tts-generated", { samples: pcm.length, file: `tts-generated-${ticket.generation}.wav` });
      this.state = "speaking";
      // Every chunk rechecks permission; future delayed provider results cannot refill playout.
      for (let offset = 0; offset < pcm.length; offset += 4800) {
        if (!this.turns.permits(ticket)) return;
        this.emit("audio", pcm.slice(offset, offset + 4800));
      }
      // Generated text stays in decision evidence, never claimed fully heard in transcript.
      this.emit("info", "TTS queued; actual sent PCM saved separately in mc.wav. Listener receipt unmeasured.");
      this.emit("turnEnd");
    } catch {
      if (researchStartedAt !== null) this.evidence(ticket.signal.aborted ? "research-cancelled" : "research-failed", { generation: ticket.generation, contextRevision: ticket.revision, elapsedMs: Date.now() - researchStartedAt, disposition: "WAIT", provider: "Meta" });
      if (!ticket.signal.aborted) { this.evidence("provider-failure", { phase, provider: phase === "tts" ? "OpenAI" : "Meta", generation: ticket.generation, contextRevision: ticket.revision, disposition: "WAIT", recordingPreserved: true }); this.state = "error"; this.emit("error", "Meta/TTS request failed or timed out; WAIT, recording continues, no fallback", "provider_failure"); }
    } finally {
      this.busy = false;
      if (this.state === "thinking") this.state = this.turns.held ? "held" : "listening";
      const handoff = this.pendingHandoff; this.pendingHandoff = null;
      if (handoff && this.turns.permits(handoff)) { this.pending = false; void this.evaluate(true); }
      else if (this.pending) { this.pending = false; void this.evaluate(false); }
    }
  }
  async close(): Promise<void> { this.pendingHandoff = null; this.pending = false; this.evidence("session-close"); this.isReady = false; this.turns.close(); clearTimeout(this.deadline); for (const stream of this.streams.values()) stream.close(); this.streams.clear(); this.emit("interrupted"); }
}
