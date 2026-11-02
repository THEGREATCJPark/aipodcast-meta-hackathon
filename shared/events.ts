/** 스튜디오 화면과 서버 사이에서 주고받는 이벤트 */

export type LogKind =
  | "human"      // 사람 발화 전사
  | "mc"         // MC 발화 전사
  | "backend"    // 백엔드(위임 모델) 결과
  | "search"     // 웹 검색 호출
  | "note"       // CJ가 보낸 진행 메모·지시
  | "system"     // 상태 변화
  | "error";

export interface LogEntry {
  id: string;
  kind: LogKind;
  at: number;           // epoch ms
  speaker?: string;     // 표시 이름
  text: string;
  meta?: Record<string, unknown>;
}

export type McState = "offline" | "connecting" | "listening" | "speaking" | "held" | "error";

export interface StudioStatus {
  livekitConfigured: boolean;
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  /** 진행 중인 세션의 엔진 */
  engine: "gpt-live" | "gemini-live" | null;
  /** 진행 중인 세션의 MC 트랙 이름 */
  persona: string | null;
  /** 공개 요금 기준 추정 비용 (USD) */
  costUsd: number;
  agentInRoom: boolean;
  sessionActive: boolean;
  mcState: McState;
  participants: { identity: string; name: string; speaking: boolean; levelDb: number }[];
  usageSeconds: number;
  lastLatencyMs: number | null;
  latencyMedianMs: number | null;
  sessionId: string | null;
  /** 지금 녹음 중인지 */
  recording: boolean;
  /** 마지막으로 정리된 세션 폴더 (프로젝트 기준 상대 경로) */
  lastOutputDir: string | null;
}

export type ServerMessage =
  | { type: "status"; status: StudioStatus }
  | { type: "log"; entry: LogEntry }
  | { type: "log-update"; entry: LogEntry }
  | { type: "history"; entries: LogEntry[] };

export type ControlCommand =
  | { action: "hold" }
  | { action: "resume" }
  | { action: "handoff" }
  | { action: "note"; text: string; speak: boolean };

export interface SessionSummary {
  sessionId: string | null;
  engine: "gpt-live" | "gemini-live";
  engineLabel: string;
  /** MC 캐릭터 트랙 이름 (예전 세션에는 없을 수 있음) */
  persona?: string;
  description: string;
  startedAt: number;
  durationSec: number;
  turns: number;
  latencyMedianMs: number | null;
  latencyP95Ms: number | null;
  costUsd: number;
}
