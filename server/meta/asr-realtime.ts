import { PcmMixer } from "../audio/mixer.js";
import WebSocket from "ws";
import { randomUUID } from "node:crypto";

export interface AsrCallbacks {
  complete(id: string, text: string, startMs: number, endMs: number): void;
  failed(message: string): void;
}
/** One paced stream per known LiveKit identity. No diarization-name guessing. */
export class MetaAsr {
  private socket: WebSocket | null = null;
  private ready = false;
  private pump: NodeJS.Timeout | undefined;
  private buffer = new PcmMixer({ sampleRate: 24000, chunkMs: 20, maxBufferMs: 2000 });
  private stopped = false;
  private starts = new Map<number, number>();
  private seen = new Set<number>();
  readonly streamId = randomUUID();
  constructor(private key: string, private model: string, private offsetMs: number, private cb: AsrCallbacks, private endpoint = "wss://api.meta.ai/v1/asr/realtime") {}
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.endpoint, { handshakeTimeout: 10000, maxPayload: 1024 * 1024 });
      this.socket = ws;
      const timeout = setTimeout(() => { ws.terminate(); reject(new Error("Meta ASR handshake timeout")); }, 10000);
      ws.on("open", () => ws.send(JSON.stringify({ authorization: { accessToken: `Bearer ${this.key}` }, audioEncoding: "PCM_24KHZ", model: this.model, mode: "ENDPOINTING", partialMode: "CUMULATIVE", emitAudioProgress: false, languageBias: ["Korean", "English"] })));
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
          if (this.stopped) return;
          if (!msg.type && typeof msg.sessionId === "string" && !this.ready) { clearTimeout(timeout); this.ready = true; this.pump = setInterval(() => this.sendFrame(), 20); resolve(); return; }
          if (msg.type === "error") { clearTimeout(timeout); reject(new Error("Meta ASR rejected stream")); this.cb.failed("Meta ASR rejected stream; recording continues"); this.close(); return; }
          this.accept(msg);
        } catch { this.cb.failed("Invalid Meta ASR event"); }
      });
      ws.on("error", () => { clearTimeout(timeout); reject(new Error("Meta ASR transport failed")); });
      ws.on("close", () => { clearInterval(this.pump); clearTimeout(timeout); this.ready = false; reject(new Error("Meta ASR closed before ready")); if (!this.stopped) this.cb.failed("Meta ASR disconnected; restart session to reconnect. Recording continues."); });
    });
  }
  accept(msg: Record<string, unknown>): void {
    if (this.stopped) return;
    const turn = msg.turnId, at = msg.audioProcessedMs;
    if (typeof turn !== "number" || !Number.isInteger(turn) || typeof at !== "number" || !Number.isFinite(at)) return;
    if (msg.type === "speechStart") { if (this.starts.size >= 100) { this.cb.failed("ASR pending turn limit"); this.close(); return; } this.starts.set(turn, at); }
    if (msg.type !== "speechComplete" || this.seen.has(turn) || typeof msg.transcript !== "string") return;
    this.seen.add(turn);
    const start = this.starts.get(turn) ?? at;
    this.starts.delete(turn);
    if (this.seen.size > 5000) { this.cb.failed("ASR turn limit reached"); this.close(); return; }
    this.cb.complete(`${this.streamId}-${turn}`, msg.transcript.slice(0, 6000), this.offsetMs + start, this.offsetMs + at);
  }
  append(pcm: Int16Array): void {
    if (this.stopped) return;
    if (this.buffer.bufferedSamples("track") + pcm.length > 48000) { this.cb.failed("ASR 2-second input buffer exceeded; restart required, original recording retained"); this.close(); return; }
    this.buffer.push("track", pcm);
  }
  private sendFrame(): void {
    if (!this.ready || this.stopped || !this.socket) return;
    if (this.socket.bufferedAmount > 48000) { this.cb.failed("ASR backlog limit reached; audio gap recorded"); this.close(); return; }
    const pcm = this.buffer.pull();
    this.socket.send(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
  }
  close(): void { clearInterval(this.pump); this.buffer.clear(); this.stopped = true; this.ready = false; this.socket?.close(); }
}
