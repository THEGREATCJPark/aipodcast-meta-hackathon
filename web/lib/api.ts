interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 로컬 스튜디오 서버 API. 변경 요청에는 출처 확인용 헤더를 붙인다. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", "X-Studio": "1" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const env = (await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }))) as Envelope<T>;
  if (!env.success) throw new Error(env.error ?? "요청 실패");
  return env.data as T;
}
