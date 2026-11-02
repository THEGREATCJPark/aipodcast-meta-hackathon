import { EventEmitter } from "node:events";
import type { Settings } from "../../shared/settings.js";
import type { EngineEvents, LiveEngine } from "../engines/types.js";
import { MetaAsr } from "./asr-realtime.js";
import { decide, validateDecision, type Decision, type Utterance } from "./director.js";
import { TurnManager } from "./turn-manager.js";
import { synthesize } from "../speech/tts.js";

export interface MetaOptions { key: string; ttsKey: string; asr: string; director: string; tts: string; voice: string }
export interface MetaServices {
  decide: typeof decide;
  synthesize: typeof synthesize;
}
export class MetaSession extends EventEmitter<EngineEvents> implements LiveEngine {
  readonly id = "meta" as const;
  isReady = false;
  readonly turns = new TurnManager();
  readonly models: Omit<MetaOptions, "key" | "ttsKey">;
  state: "listening" | "thinking" | "waiting" | "speaking" | "held" | "error" = "listening";
  private streams = new Map<string, MetaAsr>();
  private utterances: Utterance[] = [];
  private startedAt = 0;
  private calls = 0;
  private busy = false;
  private pending = false;
  private deadline: NodeJS.Timeout | undefined;
  constructor(private options: MetaOptions, private services: MetaServices = { decide, synthesize }) {
    super(); this.models = { asr: options.asr, director: options.director, tts: options.tts, voice: options.voice };
  }
  async connect(): Promise<void> {
    this.isReady = true; this.startedAt = Date.now();
    this.deadline = setTimeout(() => { this.hold(); for (const stream of this.streams.values()) stream.close(); this.emit("error", "15 minute provider limit reached; recording continues until Stop", "session_limit"); }, 15 * 60 * 1000);
    this.emit("started", "meta-local");
    this.emit("info", "Meta handoff mode: live account access unverified until provider response; OpenAI TTS only renders Meta text.");
  }
  appendAudio(_pcm: Int16Array): void { /* mixed PCM deliberately not sent to Meta */ }
  appendParticipant(identity: string, pcm: Int16Array): void {
    if (!this.isReady || Date.now() - this.startedAt >= 15 * 60 * 1000) return;
    let stream = this.streams.get(identity);
    if (!stream) {
      if (this.streams.size >= 4) return;
      stream = new MetaAsr(this.options.key, this.options.asr, Date.now() - this.startedAt, {
        complete: (id, text, startMs, endMs) => this.acceptUtterance({ id, identity, text, startMs, endMs }),
        failed: message => { this.cancel("ASR failure"); this.state = "error"; this.emit("error", message, "meta_asr"); },
      });
      this.streams.set(identity, stream);
      void stream.connect().catch(() => { this.cancel("ASR failure"); this.state = "error"; this.emit("error", "Meta ASR unavailable; recording continues", "meta_asr"); });
      // Buffer at most two seconds while connecting, then send at real-time pace.
      this.emit("info", `ASR connection starting for ${identity}; up to 2 seconds buffered during handshake; overflow stops ASR, original recording retained`);
    }
    stream.append(pcm);
  }
  participantLeft(identity: string): void { this.streams.get(identity)?.close(); this.streams.delete(identity); this.turns.human(identity, false); this.cancel("participant disconnected"); }
  humanSpeaking(identity: string, speaking: boolean): void { this.turns.human(identity, speaking); if (speaking) { this.emit("interrupted"); this.state = "listening"; this.emit("info", "Automatic VAD interruption: server output invalidated; listener timing unmeasured"); } }
  acceptUtterance(u: Utterance): void {
    if (!this.isReady || this.utterances.some(x => x.id === u.id) || !u.text.trim()) return;
    this.turns.changed(); this.emit("interrupted");
    this.utterances = [...this.utterances, u].sort((a,b) => a.startMs - b.startMs).slice(-30);
    this.emit("inputTranscript", { delta: u.text, startMs: u.startMs, endMs: u.endMs, identity: u.identity, utteranceId: u.id });
    // Meta may recommend speech, but only a fresh explicit host handoff can release it.
    void this.evaluate(false);
  }
  cancel(reason: string): void { this.turns.invalidate(); this.emit("interrupted"); this.emit("info", `Cancelled: ${reason}`); }
  hold(): void { this.turns.hold(); this.state = "held"; this.emit("interrupted"); }
  resume(): void { this.turns.resume(); this.state = "listening"; this.emit("interrupted"); }
  instruct(_content: string): void { /* MC uses explicit hold/resume methods; text is never control authority */ }
  think(_content: string): void { /* Speaker identity comes from tracks, not prompts. */ }
  speakNow(_instruction: string): void { this.resume(); void this.evaluate(true); }
  applyLiveSettings(_settings: Settings): string | null { return null; }
  async evaluate(handoff: boolean): Promise<void> {
    if (this.busy) { if (!handoff) this.pending = true; else this.emit("info", "Previous request cancelling; handoff again when waiting"); return; }
    if (!this.isReady || this.turns.held || this.turns.speakers.size || !this.utterances.length) return;
    if (++this.calls > 60) { this.emit("error", "60 director call cap reached; recording continues", "call_limit"); return; }
    this.busy = true; const ticket = this.turns.begin(); const context = this.utterances.slice();
    this.state = "thinking";
    try {
      const d: Decision = await this.services.decide(this.options.key, this.options.director, context, ticket.revision, handoff, ticket.signal);
      if (!this.turns.permits(ticket)) return;
      validateDecision(d, context, ticket.revision);
      this.emit("decision", d);
      this.state = "waiting";
      if (d.action === "WAIT" || !handoff) return;
      const pcm = await this.services.synthesize(this.options.ttsKey, this.options.tts, this.options.voice, d.speakText, ticket.signal);
      if (!this.turns.permits(ticket)) return;
      this.emit("generatedAudio", pcm, ticket.generation);
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
      if (!ticket.signal.aborted) { this.state = "error"; this.emit("error", "Meta/TTS request failed or timed out; WAIT, recording continues, no fallback", "provider_failure"); }
    } finally { this.busy = false; if (this.pending) { this.pending = false; void this.evaluate(false); } }
  }
  async close(): Promise<void> { this.isReady = false; this.turns.close(); clearTimeout(this.deadline); for (const stream of this.streams.values()) stream.close(); this.streams.clear(); this.emit("interrupted"); }
}
