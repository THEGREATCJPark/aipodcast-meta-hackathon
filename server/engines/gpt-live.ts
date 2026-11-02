import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { composeInstructions, openingInstruction, type Settings } from "../../shared/settings.js";
import { pcmToBase64 } from "../audio/mixer.js";
import type { EngineEvents, LiveEngine } from "./types.js";

/** GPT-Live 음성 요금 (침묵 포함, 초 단위 과금). 백엔드 모델·검색은 별도. */
const USD_PER_MINUTE = 0.05;

export const GPT_LIVE_URL = "wss://api.openai.com/v1/live/sessions";
export const GPT_LIVE_SAMPLE_RATE = 24000;

/** 설정으로 session.start 메시지를 만든다 (순수 함수). */
export function buildSessionStart(settings: Settings, eventId: string): Record<string, unknown> {
  const { gptLive } = settings;
  const opening = openingInstruction(settings);
  const input = opening ? [{ type: "message", role: "developer", content: [{ type: "input_text", text: opening }] }] : [];
  return {
    type: "session.start",
    event_id: eventId,
    session: {
      model: gptLive.model,
      instructions: composeInstructions(settings, "gpt-live"),
      input,
      audio: {
        format: { type: "audio/pcm", rate: GPT_LIVE_SAMPLE_RATE },
        output: { voice: gptLive.voice },
      },
      store: false,
      delegation: buildDelegation(settings),
    },
  };
}

export function buildDelegation(settings: Settings): Record<string, unknown> {
  const d = settings.gptLive.delegation;
  return {
    type: "responses",
    responses: {
      model: d.model,
      ...(d.prompt.trim() ? { instructions: d.prompt } : {}),
      tools: d.webSearch ? [{ type: "web_search" }] : [],
      tool_choice: "auto",
      ...(d.reasoningEffort === "none" ? {} : { reasoning: { effort: d.reasoningEffort } }),
    },
  };
}

type Json = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

/** GPT-Live WebSocket 세션 (서버 측). 오디오는 PCM16 24kHz 모노. */
export class GptLiveSession extends EventEmitter<EngineEvents> implements LiveEngine {
  readonly id = "gpt-live" as const;
  private ws: WebSocket | null = null;
  private seq = 0;
  private ready = false;
  private openingSent = false;
  private closedEmitted = false;
  private oddByte: number | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly settings: Settings,
    private readonly url: string = GPT_LIVE_URL,
  ) {
    super();
  }

  get isReady(): boolean {
    return this.ready;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url, { headers: { Authorization: `Bearer ${this.apiKey}` } });
      this.ws = ws;
      const timer = setTimeout(() => {
        reject(new Error("GPT-Live 연결 시간 초과 (15초)"));
        ws.terminate();
      }, 15000);
      ws.on("open", () => this.send(buildSessionStart(this.settings, this.nextId("start"))));
      ws.on("message", (raw) => {
        const msg = this.parse(raw.toString());
        if (!msg) return;
        if (msg.type === "session.started") {
          clearTimeout(timer);
          resolve();
        }
        if (msg.type === "error" && !this.ready) {
          clearTimeout(timer);
          const err = (msg.error ?? {}) as Json;
          reject(new Error(`${str(err.code) || "error"}: ${str(err.message)}`));
          ws.close();
        }
        this.handle(msg);
      });
      ws.on("error", (err) => {
        clearTimeout(timer);
        this.emit("error", err.message, null);
        reject(err);
      });
      ws.on("close", (code) => this.markClosed(`socket_closed_${code}`));
    });
  }

  appendAudio(pcm: Int16Array): void {
    if (!this.ready) return;
    this.send({ type: "session.input_audio.append", audio: pcmToBase64(pcm) });
  }

  /** 모델에게 따라야 할 지시. 말하는 중에도 끼어들 수 있다. */
  instruct(content: string): void {
    this.send({ type: "session.instructions.append", event_id: this.nextId("instr"), delegation_id: null, content });
  }

  /** 모델이 말하도록 요청하는 문장 (의역될 수 있음). */
  commentary(content: string): void {
    this.send({ type: "session.commentary.append", event_id: this.nextId("comm"), delegation_id: null, content });
  }

  /** GPT-Live는 지시문이 진행 중인 말에도 끼어들 수 있어 넘기기에도 instructions를 쓴다. */
  speakNow(instruction: string): void {
    this.instruct(instruction);
  }

  /** 말하게 하지 않고 맥락만 추가. */
  think(content: string): void {
    this.send({ type: "session.thinking.append", event_id: this.nextId("think"), delegation_id: null, content });
  }

  applyLiveSettings(settings: Settings): string | null {
    this.send({ type: "session.update", event_id: this.nextId("update"), session: { delegation: buildDelegation(settings) } });
    return "백엔드(위임 모델) 설정";
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return resolve();
      const done = (): void => {
        this.ws?.close();
        resolve();
      };
      const timer = setTimeout(done, 3000);
      this.once("closed", () => {
        clearTimeout(timer);
        resolve();
      });
      this.send({ type: "session.close", event_id: this.nextId("close") });
    });
  }

  private handle(msg: Json): void {
    switch (msg.type) {
      case "session.started": {
        this.ready = true;
        this.emit("started", str((msg.session as Json | undefined)?.id));
        const opening = openingInstruction(this.settings);
        if (opening && !this.openingSent) {
          this.openingSent = true;
          this.commentary(opening);
        }
        return;
      }
      case "session.output_audio.delta":
        this.emit("audio", this.decodeAudio(str(msg.delta)));
        return;
      case "session.input_transcript.delta":
        this.emit("inputTranscript", { delta: str(msg.delta), startMs: num(msg.start_ms), endMs: num(msg.end_ms) });
        return;
      case "session.output_transcript.delta":
        this.emit("outputTranscript", { delta: str(msg.delta), startMs: num(msg.start_ms), endMs: num(msg.end_ms) });
        return;
      case "session.delegation.created": {
        const d = (msg.delegation ?? {}) as Json;
        this.emit("delegationCreated", str(d.id));
        return;
      }
      case "response.event":
        this.handleBackend(str(msg.delegation_id), (msg.event ?? {}) as Json);
        return;
      case "session.usage.updated":
        this.emitUsage(num((msg.usage as Json | undefined)?.seconds));
        return;
      case "session.closed":
        this.emitUsage(num((msg.usage as Json | undefined)?.seconds));
        this.markClosed(str(msg.reason) || "closed");
        this.ws?.close();
        return;
      case "error": {
        const err = (msg.error ?? {}) as Json;
        this.emit("error", str(err.message) || "알 수 없는 오류", str(err.code) || null);
        return;
      }
      default:
        return;
    }
  }

  /** 조각 경계가 샘플 중간에서 끊겨도 다음 조각과 이어 붙인다. */
  private decodeAudio(b64: string): Int16Array {
    let bytes: Uint8Array = Buffer.from(b64, "base64");
    if (this.oddByte !== null) {
      const joined = new Uint8Array(bytes.length + 1);
      joined[0] = this.oddByte;
      joined.set(bytes, 1);
      bytes = joined;
      this.oddByte = null;
    }
    if (bytes.length % 2 === 1) {
      this.oddByte = bytes[bytes.length - 1];
      bytes = bytes.subarray(0, bytes.length - 1);
    }
    const copy = new Uint8Array(bytes);
    return new Int16Array(copy.buffer, 0, copy.length / 2);
  }

  private emitUsage(seconds: number): void {
    this.emit("usage", { seconds, costUsd: (seconds / 60) * USD_PER_MINUTE });
  }

  private markClosed(reason: string): void {
    this.ready = false;
    if (this.closedEmitted) return;
    this.closedEmitted = true;
    this.emit("closed", reason);
  }

  private handleBackend(delegationId: string, ev: Json): void {
    if (ev.type === "response.output_text.delta") {
      this.emit("backendText", delegationId, str(ev.delta));
    } else if (ev.type === "response.completed") {
      this.emit("backendDone", delegationId);
    } else if (ev.type === "response.output_item.done") {
      const item = (ev.item ?? {}) as Json;
      if (item.type === "web_search_call") {
        const action = (item.action ?? {}) as Json;
        this.emit("webSearch", delegationId, str(action.query) || str(action.url) || "(검색)");
      }
    }
  }

  private parse(raw: string): Json | null {
    try {
      const v: unknown = JSON.parse(raw);
      return v && typeof v === "object" ? (v as Json) : null;
    } catch {
      this.emit("error", "서버 메시지를 해석하지 못함", "parse_error");
      return null;
    }
  }

  private send(msg: Json): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${Date.now().toString(36)}_${this.seq}`;
  }
}
