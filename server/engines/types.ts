import type { EventEmitter } from "node:events";
import type { EngineId, Settings } from "../../shared/settings.js";

export interface TranscriptDelta {
  identity?: string;
  utteranceId?: string;
  delta: string;
  startMs: number;
  endMs: number;
}

/** 두 엔진이 공통으로 내보내는 이벤트. 엔진에 없는 이벤트는 발생하지 않는다. */
export interface EngineEvents {
  evidence: [record: Record<string, unknown>];
  decision: [decision: import("../meta/director.js").Decision];
  generatedAudio: [pcm: Int16Array, generation: number];
  started: [sessionId: string];
  audio: [pcm: Int16Array];
  inputTranscript: [TranscriptDelta];
  outputTranscript: [TranscriptDelta];
  /** 모델 발화 한 턴이 끝남 */
  turnEnd: [];
  /** 사람이 끼어들어 서버가 생성을 취소함: 재생 대기 음성을 버려야 한다 */
  interrupted: [];
  delegationCreated: [delegationId: string];
  backendText: [delegationId: string, delta: string];
  backendDone: [delegationId: string];
  webSearch: [delegationId: string, query: string];
  /** 누적 사용량. costUsd는 공개 요금 기준 추정치 */
  usage: [usage: EngineUsage];
  info: [message: string];
  error: [message: string, code: string | null];
  closed: [reason: string];
}

export interface EngineUsage {
  seconds: number;
  costUsd: number;
  /** 토큰 과금 엔진(Gemini)의 누적 토큰 */
  tokens?: { input: number; output: number };
}

/** 실시간 음성 엔진 공통 인터페이스. 입력·출력 오디오는 PCM16 모노 24kHz. */
export interface LiveEngine extends EventEmitter<EngineEvents> {
  readonly id: EngineId;
  readonly isReady: boolean;
  connect(): Promise<void>;
  appendAudio(pcm: Int16Array): void;
  /** 따라야 할 지시 (말하는 중에도 반영) */
  instruct(content: string): void;
  /** 지시를 주고 지금 바로 말하게 한다 (넘기기 등) */
  speakNow(instruction: string): void;
  /** 말하지 않고 맥락만 추가 */
  think(content: string): void;
  /** 세션 중 바꿀 수 있는 설정을 반영. 반영한 항목 설명을 돌려준다. */
  applyLiveSettings(settings: Settings): string | null;
  close(): Promise<void>;
}
