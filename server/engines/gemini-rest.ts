/** Gemini 계정에서 Live(양방향 스트리밍)를 지원하는 모델 목록. 실패하면 문서상 기본값. */
const FALLBACK = ["gemini-3.8-live", "gemini-3.8-live-extended-thinking"];

export async function listGeminiLiveModels(key: string | undefined): Promise<string[]> {
  if (!key) return FALLBACK;
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return FALLBACK;
    const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const live = (body.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("bidiGenerateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      // 전사·번역·로보틱스 전용 모델은 MC로 쓸 수 없다.
      .filter((id) => !/(transcribe|translate|robotics)/.test(id))
      .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
    return live.length ? live : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
