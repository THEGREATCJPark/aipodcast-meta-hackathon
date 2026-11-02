/** OpenAI REST 호출: 모델 목록, "프롬프트로 시작하기" 생성 */

const API = "https://api.openai.com/v1";

interface ModelList {
  live: string[];
  backend: string[];
}

const FALLBACK: ModelList = { live: ["gpt-live-1"], backend: ["gpt-6-luna", "gpt-6-sol", "gpt-5.6-luna"] };

async function call(key: string, path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: { message?: string } }).error;
    throw new Error(`OpenAI ${res.status}: ${err?.message ?? "요청 실패"}`);
  }
  return body;
}

/** 계정에서 쓸 수 있는 모델을 분류한다. 실패하면 문서상 기본값을 돌려준다. */
export async function listModels(key: string | undefined): Promise<ModelList & { source: "api" | "fallback" }> {
  if (!key) return { ...FALLBACK, source: "fallback" };
  try {
    const body = (await call(key, "/models")) as { data?: { id: string }[] };
    const ids = (body.data ?? []).map((m) => m.id).sort();
    const live = ids.filter((id) => id.startsWith("gpt-live") && !id.includes("transcribe"));
    // 위임 백엔드 후보: GPT-5 이상 범용 모델, 최신 순
    const backend = ids
      .filter((id) => /^gpt-([5-9]|\d{2})/.test(id) && !/(audio|realtime|live|transcribe|tts|image|search|codex|chat)/.test(id))
      .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
    return {
      live: live.length ? live : FALLBACK.live,
      backend: backend.length ? backend : FALLBACK.backend,
      source: "api",
    };
  } catch {
    return { ...FALLBACK, source: "fallback" };
  }
}

const GEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["voicePrompt", "backendPrompt", "opening"],
  properties: {
    voicePrompt: { type: "string" },
    backendPrompt: { type: "string" },
    opening: { type: "string" },
  },
};

const GEN_INSTRUCTIONS = `You write prompts for a Korean podcast AI MC built on OpenAI GPT-Live (a full-duplex voice model that delegates research to a backend Responses model).
Return JSON with:
- voicePrompt: Korean system prompt for the voice MC, shared by OpenAI GPT-Live and Gemini Live (do not mention engine-specific delegation syntax; the app appends it): identity, speaking style (short, one question at a time, natural Korean spoken style), multi-party etiquette (several humans in the room; speaker names arrive as "[진행 메모]" notes; don't interrupt humans talking to each other; respond when addressed or when the floor is open; backchannels are not requests), obey "[진행자 지시]" instructions immediately, and verify facts instead of inventing them.
- backendPrompt: Korean prompt for the backend: verify facts with web search, answer in 2-4 short spoken Korean sentences, separate facts from predictions, name the source once.
- opening: one short Korean instruction for the greeting at session start (not the greeting itself).
Keep the user's show concept. Do not invent facts about real people.`;

export async function generatePrompts(
  key: string,
  model: string,
  description: string,
): Promise<{ voicePrompt: string; backendPrompt: string; opening: string }> {
  const body = (await call(
    key,
    "/responses",
    {
      method: "POST",
      body: JSON.stringify({
        model,
        instructions: GEN_INSTRUCTIONS,
        input: description.slice(0, 32000),
        text: { format: { type: "json_schema", name: "mc_prompts", strict: true, schema: GEN_SCHEMA } },
      }),
    },
    90000,
  )) as { output_text?: string; output?: { content?: { type: string; text?: string }[] }[] };
  const text =
    body.output_text ??
    (body.output ?? []).flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text ??
    "";
  const parsed = JSON.parse(text) as { voicePrompt: string; backendPrompt: string; opening: string };
  return parsed;
}
