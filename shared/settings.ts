import { z } from "zod";
import {
  COMMON_PODCAST_RULES, OPERATION_RULES, PERSONA_TRACKS, TRACK_IDS, TURN_LENGTH_BOTTOM, TURN_LENGTH_TOP, WAIT_FOR_HOST_OPENING,
  type PersonaChoice,
} from "./personas.js";

export const ENGINES = ["meta", "gpt-live", "gemini-live"] as const;
export type EngineId = (typeof ENGINES)[number];

export const ENGINE_LABEL: Record<EngineId, string> = {
  meta: "Meta co-host",
  "gpt-live": "OpenAI GPT-Live",
  "gemini-live": "Gemini Live",
};

/**
 * GPT-Live 음성 목록. 한국어 전용 음성은 noeul.
 * 2026-10 공식 문서 목록 + 실제 세션 시작으로 확인한 기존 Realtime 음성(coral, ash, ballad, cedar, alloy, sage, shimmer, verse, echo).
 */
export const GPT_LIVE_VOICES = [
  "noeul", "marin", "quartz", "ripple", "vesper", "willow", "stone", "gleam",
  "meridian", "beacon", "delta", "cinder", "bossa", "tempo", "nuri", "juni",
  "flitz", "brise", "sillage", "nira", "harema", "shida",
  "coral", "ash", "ballad", "cedar", "alloy", "sage", "shimmer", "verse", "echo",
] as const;

/** Gemini 음성 목록 (TTS 공용 30종). 모두 다국어이며 한국어 전용 음성은 없다. 언어는 모델이 자동 선택. */
export const GEMINI_VOICES = [
  "Kore", "Zephyr", "Puck", "Charon", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
  "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
  "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird",
  "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
] as const;

export const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;
export const GEMINI_SENSITIVITY = ["HIGH", "LOW"] as const;
/** extended-thinking 모델 전용. "off"는 호환용으로만 남기고 실제로는 low로 보낸다 (이 모델은 생각 깊이 지정이 필수). */
export const GEMINI_THINKING = ["off", "low", "medium", "high"] as const;
export const GEMINI_THINKING_CHOICES = ["low", "medium", "high"] as const;

/**
 * "직접 작성" 트랙의 기본 프롬프트. 방송 운영 규칙·엔진 부록·발화 길이 규칙은 자동으로 붙으므로 여기엔 캐릭터만 쓴다.
 */
export const DEFAULT_INSTRUCTIONS = `# 역할
너는 한국어 팟캐스트 "특이점 이후"의 AI MC다. 고정 패널 CJ, 그리고 회차별 게스트와 함께 방송한다.
이야기를 경청하고, 핵심을 짚고, 대화가 끊기지 않게 흥미로운 후속 질문을 던진다.

# 말투
- 친근한 구어체 존댓말. 과잉 칭찬과 상담원 말투는 쓰지 않는다.
- 상대 답변을 매번 요약하거나 반복하지 않는다.
- 맞장구는 아주 가끔, 한 단어로만 한다. 녹음에 그대로 남는다.`;

export const DEFAULT_OPENING =
  "활기차고 자연스러운 라디오 진행자 톤으로 청취자에게 짧게 첫인사를 하세요. 오늘 함께하는 CJ님을 소개하고, 오늘 어떤 주제로 이야기할지 CJ님께 물어보세요. 두세 문장 안에서 끝내세요.";

export const DEFAULT_BACKEND_PROMPT = `너는 팟캐스트 AI MC를 보조하는 수석 방송 작가이자 리서처다.
1. 요청받은 사실은 웹 검색으로 확인한다.
2. MC가 바로 말할 수 있게 핵심 사실과 흥미로운 포인트를 짧은 한국어 구어체 3~4문장으로 정리한다.
3. 확인된 사실과 전망·주장을 구분한다. 불확실하면 불확실하다고 말한다.
4. 출처 이름(기관·매체)을 한 번 언급한다. URL은 읽지 않는다.
5. 청취자의 흥미를 끌 후속 질문 아이디어 하나를 함께 제안한다.`;

/**
 * 엔진마다 사실 확인 방법이 달라서 자동으로 붙이는 부록.
 * 검색은 응답을 늦추고 말투를 요약봇으로 바꾸므로, 분명히 요청받았을 때만 쓰게 한다.
 */
export const ENGINE_APPENDIX: Record<EngineId, string> = {
  meta: "Meta independent discussion co-host",
  "gpt-live": `# 검색·사실 확인 (엔진: GPT-Live)
- CJ님이나 게스트가 최신 뉴스·수치·사실 확인을 분명히 요청할 때만 Generate <|SpawnThinking|> 로 백엔드에 맡긴다.
- 그 외에는 검색하지 말고 자체 상식과 일상 비유로 바로 받아친다. 모르면 모른다고 솔직하게 말한다.
- 백엔드 결과는 읽어주지 말고 내 말투로 완전히 풀어서 2~3문장 구어체로 말한다.`,
  "gemini-live": `# 검색·사실 확인 (엔진: Gemini Live)
- CJ님이나 게스트가 최신 뉴스·수치·사실 확인을 분명히 요청할 때만 Google 검색 도구를 쓴다.
- 그 외에는 검색하지 말고 자체 상식과 일상 비유로 바로 받아친다. 모르면 모른다고 솔직하게 말한다.
- 검색 결과는 요약문처럼 읽지 말고 내 말투로 완전히 풀어서 2~3문장 구어체로 말한다.`,
};

export interface ComposeInput {
  persona: { track: PersonaChoice; openingMode: "smalltalk" | "wait" };
  prompt: { instructions: string };
}

/**
 * 엔진에 보낼 최종 시스템 프롬프트.
 * 순서: 발화 길이(상단) → 공통 규칙(트랙일 때) → 트랙 또는 직접 작성 → 방송 운영 규칙 → (기다리는 오프닝) → 엔진 부록 → 발화 길이(하단)
 */
export function composeInstructions(settings: ComposeInput, engine: EngineId): string {
  const { track } = settings.persona;
  const body = track === "custom" ? [settings.prompt.instructions.trim()] : [COMMON_PODCAST_RULES, PERSONA_TRACKS[track].prompt];
  const opening = settings.persona.openingMode === "wait" ? [WAIT_FOR_HOST_OPENING] : [];
  return [TURN_LENGTH_TOP, ...body, OPERATION_RULES, ...opening, ENGINE_APPENDIX[engine], TURN_LENGTH_BOTTOM]
    .filter((part) => part.trim())
    .join("\n\n");
}

/** 세션 시작 직후 MC에게 줄 오프닝 지시. CJ의 첫마디를 기다리는 모드면 null. */
export function openingInstruction(settings: ComposeInput & { prompt: { opening: string } }): string | null {
  if (settings.persona.openingMode === "wait") return null;
  const { track } = settings.persona;
  if (track === "custom") return settings.prompt.opening.trim() || null;
  return PERSONA_TRACKS[track].opening;
}

export const PERSONA_CHOICES = [...TRACK_IDS, "custom"] as const;

export const SettingsSchema = z.object({
  researchEnabled: z.boolean().default(false),
  engine: z.enum(ENGINES).default("meta"),
  /** MC 캐릭터 트랙. custom이면 prompt.instructions / prompt.opening을 쓴다. */
  persona: z.object({
    track: z.enum([...TRACK_IDS, "custom"]).default("custom"),
    /** smalltalk: 트랙별 스몰토크로 먼저 연다 / wait: CJ의 첫마디를 듣고 받아친다 */
    openingMode: z.enum(["smalltalk", "wait"]).default("wait"),
  }).prefault({}),
  /** 두 엔진 공통 */
  prompt: z.object({
    opening: z.string().max(2000).default(DEFAULT_OPENING),
    instructions: z.string().max(32000).default(DEFAULT_INSTRUCTIONS),
  }).prefault({}),
  gptLive: z.object({
    model: z.string().min(1).default("gpt-live-1"),
    voice: z.string().min(1).default("noeul"),
    delegation: z.object({
      model: z.string().min(1).default("gpt-6-luna"),
      reasoningEffort: z.enum(REASONING_EFFORTS).default("low"),
      webSearch: z.boolean().default(true),
      prompt: z.string().max(32000).default(DEFAULT_BACKEND_PROMPT),
    }).prefault({}),
  }).prefault({}),
  geminiLive: z.object({
    model: z.string().min(1).default("gemini-3.8-live"),
    voice: z.string().min(1).default("Kore"),
    googleSearch: z.boolean().default(true),
    /** extended-thinking 모델에서만 적용 */
    thinkingLevel: z.enum(GEMINI_THINKING).default("low"),
    vad: z.object({
      startSensitivity: z.enum(GEMINI_SENSITIVITY).default("HIGH"),
      endSensitivity: z.enum(GEMINI_SENSITIVITY).default("LOW"),
      silenceDurationMs: z.number().int().min(200).max(3000).default(800),
    }).prefault({}),
  }).prefault({}),
  show: z.object({
    hostName: z.string().min(1).max(40).default("CJ"),
    roomName: z.string().regex(/^[a-z0-9-]{1,40}$/).default("studio"),
  }).prefault({}),
  floor: z.object({
    /** 사람 발화로 판정할 RMS 임계값 (dBFS) */
    speechThresholdDb: z.number().min(-80).max(-10).default(-45),
    /** 화자가 바뀌면 MC에게 진행 메모로 알려줄지 */
    announceSpeakers: z.boolean().default(true),
  }).prefault({}),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const defaultSettings = (): Settings => SettingsSchema.parse({});

type Loose = Record<string, unknown>;

/** v1 설정(voice/delegation 최상위)을 현재 형식으로 옮긴다. */
export function migrateSettings(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Loose;
  if (!("voice" in r) && !("delegation" in r)) return raw;
  const voice = (r.voice ?? {}) as Loose;
  const delegation = (r.delegation ?? {}) as Loose;
  const { voice: _v, delegation: _d, ...rest } = r;
  return {
    ...rest,
    engine: rest.engine === "gemini-live" ? "gemini-live" : "gpt-live",
    prompt: { opening: voice.opening, instructions: voice.prompt },
    gptLive: {
      model: voice.model,
      voice: voice.voice,
      delegation: {
        model: delegation.model,
        reasoningEffort: delegation.reasoningEffort,
        webSearch: delegation.webSearch,
        prompt: delegation.prompt,
      },
    },
  };
}
