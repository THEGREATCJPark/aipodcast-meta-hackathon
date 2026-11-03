import { MetaSession } from "../meta/session.js";
import { env } from "../config.js";
import { PERSONA_TRACKS } from "../../shared/personas.js";
import type { Settings } from "../../shared/settings.js";
import { GeminiLiveSession } from "./gemini-live.js";
import { GptLiveSession } from "./gpt-live.js";
import type { LiveEngine } from "./types.js";
import { GEMINI_TTS_MODEL } from "../speech/gemini-tts.js";

export interface EngineKeys {
  meta?: string;
  openai?: string;
  gemini?: string;
}

/** 설정의 엔진 선택에 맞는 세션을 만든다. 키가 없으면 이유를 알려준다. */
export function createEngine(settings: Settings, keys: EngineKeys): LiveEngine {
  if (settings.engine === "meta") {
    const gemini = env.TTS_PROVIDER === 'gemini', ttsKey = gemini ? keys.gemini : keys.openai;
    if (!keys.meta || !ttsKey) throw new Error(`Set META_API_KEY and ${gemini ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'} in the new repository .env`);
    return new MetaSession({ key: keys.meta, ttsKey, asr: env.META_ASR_MODEL, director: env.META_DIRECTOR_MODEL,
      ttsProvider: env.TTS_PROVIDER, tts: gemini ? GEMINI_TTS_MODEL : env.TTS_MODEL, voice: gemini ? env.GEMINI_TTS_VOICE : env.TTS_VOICE, researchEnabled: settings.researchEnabled });
  }
  if (settings.engine === "gemini-live") {
    if (!keys.gemini) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다 (.env)");
    return new GeminiLiveSession(keys.gemini, settings);
  }
  if (!keys.openai) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다 (.env)");
  return new GptLiveSession(keys.openai, settings);
}

export function personaLabel(settings: Settings): string {
  if (settings.engine === "meta") return "Independent Meta co-host";
  const t = settings.persona.track;
  return t === "custom" ? "직접 작성" : PERSONA_TRACKS[t].label;
}

export function engineDescription(settings: Settings): string {
  if (settings.engine === "meta") return `Meta ${env.META_ASR_MODEL} → ${env.META_DIRECTOR_MODEL} · ${env.TTS_PROVIDER === 'gemini' ? `Gemini TTS ${GEMINI_TTS_MODEL}/${env.GEMINI_TTS_VOICE}` : `OpenAI TTS ${env.TTS_MODEL}/${env.TTS_VOICE}`}`;
  if (settings.engine === "gemini-live") {
    const g = settings.geminiLive;
    return `Gemini Live · ${g.model} / ${g.voice}${g.googleSearch ? " · Google 검색" : ""}`;
  }
  const o = settings.gptLive;
  return `GPT-Live · ${o.model} / ${o.voice} · 백엔드 ${o.delegation.model}`;
}
