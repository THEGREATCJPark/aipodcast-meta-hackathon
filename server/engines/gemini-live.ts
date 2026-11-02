import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { composeInstructions, openingInstruction, type Settings } from "../../shared/settings.js";
import { pcmToBase64 } from "../audio/mixer.js";
import { PcmDecoder } from "./pcm-decoder.js";
import type { EngineEvents, LiveEngine } from "./types.js";

export const GEMINI_LIVE_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

const INPUT_RATE = 24000;
const MAX_RECONNECTS = 3;

/** 공식 요금표(2026-10, USD / 1M 토큰) 기준 추정. 검색 그라운딩은 월 5,000회 무료 후 별도. */
const PRICE = {
  input: { TEXT: 0.75, AUDIO: 3.0, OTHER: 1.0 },
  output: { TEXT: 4.5, AUDIO: 12.0 },
} as const;

type Json = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

/** 설정으로 setup 메시지를 만든다 (순수 함수). resumeHandle이 있으면 이전 세션을 이어 받는다. */
export function buildGeminiSetup(settings: Settings, resumeHandle: string | null = null): Json {
  const g = settings.geminiLive;
  // extended-thinking 모델은 thinkingLevel이 없으면 연결을 거부한다 (1007). "off"는 가장 가벼운 low로 보낸다.
  // 일반 3.8 모델은 thinking 설정을 받지 않는다.
  const thinking = g.model.includes("extended-thinking")
    ? { thinkingConfig: { thinkingLevel: g.thinkingLevel === "off" ? "low" : g.thinkingLevel } }
    : {};
  return {
    setup: {
      model: `models/${g.model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: g.voice } } },
        ...thinking,
      },
      systemInstruction: { parts: [{ text: composeInstructions(settings, "gemini-live") }] },
      tools: g.googleSearch ? [{ googleSearch: {} }] : [],
      // 자동 언어 감지가 가끔 다른 문자(예: 말레이알람어)로 적어서 전사 언어를 한국어로 고정한다.
      inputAudioTranscription: { languageCodes: ["ko-KR"] },
      outputAudioTranscription: { languageCodes: ["ko-KR"] },
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: `START_SENSITIVITY_${g.vad.startSensitivity}`,
          endOfSpeechSensitivity: `END_SENSITIVITY_${g.vad.endSensitivity}`,
          silenceDurationMs: g.vad.silenceDurationMs,
        },
        activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
      },
      // 오디오 세션 15분 제한을 넘기기 위한 대화 기록 압축 + 연결 교체(약 10분) 대비 이어받기
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
    },
  };
}

/** usageMetadata 한 건의 비용 추정 (USD) */
export function estimateGeminiCost(usage: Json): number {
  const perM = (tokens: number, price: number): number => (tokens / 1_000_000) * price;
  let cost = 0;
  const promptDetails = arr(usage.promptTokensDetails);
  if (promptDetails.length) {
    for (const d of promptDetails) {
      const m = str(d.modality) as keyof typeof PRICE.input;
      cost += perM(num(d.tokenCount), PRICE.input[m] ?? PRICE.input.OTHER);
    }
  } else {
    cost += perM(num(usage.promptTokenCount), PRICE.input.TEXT);
  }
  const respDetails = arr(usage.responseTokensDetails);
  if (respDetails.length) {
    for (const d of respDetails) cost += perM(num(d.tokenCount), str(d.modality) === "AUDIO" ? PRICE.output.AUDIO : PRICE.output.TEXT);
  } else {
    cost += perM(num(usage.responseTokenCount), PRICE.output.AUDIO);
  }
  cost += perM(num(usage.thoughtsTokenCount), PRICE.output.TEXT);
  return cost;
}

/** Gemini Live WebSocket 세션 (서버 측). 입력 PCM16 24kHz, 출력 PCM16 24kHz. */
export class GeminiLiveSession extends EventEmitter<EngineEvents> implements LiveEngine {
  readonly id = "gemini-live" as const;
  private ws: WebSocket | null = null;
  private ready = false;
  private closing = false;
  private closedEmitted = false;
  private resumeHandle: string | null = null;
  private reconnects = 0;
  private inputMs = 0;
  private startedAt = 0;
  private costUsd = 0;
  private tokens = { input: 0, output: 0 };
  private decoder = new PcmDecoder();
  private openingSent = false;

  constructor(
    private readonly apiKey: string,
    private readonly settings: Settings,
    private readonly url: string = GEMINI_LIVE_URL,
  ) {
    super();
  }

  get isReady(): boolean {
    return this.ready;
  }

  connect(): Promise<void> {
    this.startedAt = Date.now();
    return this.open(null);
  }

  appendAudio(pcm: Int16Array): void {
    this.inputMs += pcm.length / (INPUT_RATE / 1000);
    if (!this.ready) return;
    this.send({ realtimeInput: { audio: { data: pcmToBase64(pcm), mimeType: `audio/pcm;rate=${INPUT_RATE}` } } });
  }

  /** 따라야 할 지시. 새 응답을 강제하지 않는다 (진행 중인 생성은 끊길 수 있음). */
  instruct(content: string): void {
    this.sendText(content, false);
  }

  /** 지시를 주고 지금 말하게 한다. */
  speakNow(instruction: string): void {
    this.sendText(instruction, true);
  }

  think(content: string): void {
    this.sendText(content, false);
  }

  applyLiveSettings(): string | null {
    // Gemini Live는 연결 중 설정을 바꿀 수 없다. 다음 세션부터 적용된다.
    return null;
  }

  close(): Promise<void> {
    this.closing = true;
    return new Promise((resolve) => {
      const ws = this.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        this.markClosed("close_requested");
        return resolve();
      }
      const timer = setTimeout(() => {
        ws.terminate();
        resolve();
      }, 3000);
      ws.once("close", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.close(1000);
    });
  }

  private open(resumeHandle: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.url}?key=${encodeURIComponent(this.apiKey)}`);
      this.ws = ws;
      let settled = false;
      const fail = (err: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      };
      const timer = setTimeout(() => {
        fail(new Error("Gemini Live 연결 시간 초과 (15초)"));
        ws.terminate();
      }, 15000);
      ws.on("open", () => this.send(buildGeminiSetup(this.settings, resumeHandle)));
      ws.on("message", (raw) => {
        const msg = this.parse(raw.toString());
        if (!msg) return;
        if ("setupComplete" in msg && !settled) {
          settled = true;
          clearTimeout(timer);
          this.onSetupComplete(resumeHandle !== null);
          resolve();
          return;
        }
        this.handle(msg);
      });
      ws.on("unexpected-response", (_req, res) => fail(new Error(`Gemini Live 연결 거부 HTTP ${res.statusCode}`)));
      ws.on("error", (err) => {
        // 키가 들어 있는 URL이 오류 문구에 섞이지 않게 한다.
        const message = err.message.replace(this.apiKey, "<key>");
        this.emit("error", message, null);
        fail(new Error(message));
      });
      ws.on("close", (code, reason) => {
        if (this.ws !== ws) return;
        this.ready = false;
        const why = reason.toString().slice(0, 200);
        if (!settled) return fail(new Error(`Gemini Live 연결 종료 (${code}) ${why}`));
        void this.onSocketClosed(code, why);
      });
    });
  }

  private onSetupComplete(resumed: boolean): void {
    this.ready = true;
    if (resumed) {
      this.emit("info", "Gemini 세션을 이어받았습니다");
      return;
    }
    this.emit("started", `gemini-${this.startedAt}`);
    const opening = openingInstruction(this.settings);
    if (opening && !this.openingSent) {
      this.openingSent = true;
      this.speakNow(opening);
    }
  }

  private async onSocketClosed(code: number, reason: string): Promise<void> {
    if (this.closing) return this.markClosed("close_requested");
    if (this.resumeHandle && this.reconnects < MAX_RECONNECTS) {
      this.reconnects += 1;
      this.emit("info", `Gemini 연결이 끊겨 이어받는 중… (${this.reconnects}/${MAX_RECONNECTS})`);
      try {
        await this.open(this.resumeHandle);
        this.reconnects = 0;
        return;
      } catch (err: unknown) {
        this.emit("error", `이어받기 실패: ${err instanceof Error ? err.message : String(err)}`, "resume_failed");
      }
    }
    this.markClosed(`socket_closed_${code}${reason ? ` ${reason}` : ""}`);
  }

  private handle(msg: Json): void {
    const sc = msg.serverContent as Json | undefined;
    if (sc) this.handleServerContent(sc);
    const usage = msg.usageMetadata as Json | undefined;
    if (usage) {
      this.costUsd += estimateGeminiCost(usage);
      this.tokens = {
        input: this.tokens.input + num(usage.promptTokenCount),
        output: this.tokens.output + num(usage.responseTokenCount) + num(usage.thoughtsTokenCount),
      };
      this.emit("usage", { seconds: (Date.now() - this.startedAt) / 1000, costUsd: this.costUsd, tokens: this.tokens });
    }
    const resumption = msg.sessionResumptionUpdate as Json | undefined;
    if (resumption?.resumable && str(resumption.newHandle)) this.resumeHandle = str(resumption.newHandle);
    if (msg.goAway) {
      // 서버가 곧 연결을 닫는다: 미리 새 연결로 이어받는다.
      this.emit("info", "Gemini 서버가 연결 교체를 요청했습니다");
      this.ws?.close(1000);
    }
    if (msg.toolCall) this.emit("info", "Gemini가 지원하지 않는 함수 호출을 요청했습니다 (무시)");
  }

  private handleServerContent(sc: Json): void {
    const turn = sc.modelTurn as Json | undefined;
    for (const part of arr(turn?.parts)) {
      const inline = part.inlineData as Json | undefined;
      if (inline && str(inline.data)) this.emit("audio", this.decoder.decode(str(inline.data)));
    }
    const input = str((sc.inputTranscription as Json | undefined)?.text);
    if (input) this.emit("inputTranscript", { delta: input, startMs: Math.max(0, this.inputMs - 1500), endMs: this.inputMs });
    const output = str((sc.outputTranscription as Json | undefined)?.text);
    if (output) this.emit("outputTranscript", { delta: output, startMs: this.inputMs, endMs: this.inputMs });
    const grounding = sc.groundingMetadata as Json | undefined;
    for (const q of Array.isArray(grounding?.webSearchQueries) ? (grounding.webSearchQueries as unknown[]) : []) {
      if (typeof q === "string") this.emit("webSearch", "google", q);
    }
    if (sc.interrupted) {
      this.decoder.reset();
      this.emit("interrupted");
    }
    if (sc.turnComplete) this.emit("turnEnd");
  }

  private sendText(text: string, turnComplete: boolean): void {
    this.send({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete } });
  }

  private markClosed(reason: string): void {
    this.ready = false;
    if (this.closedEmitted) return;
    this.closedEmitted = true;
    this.emit("closed", reason);
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
}
