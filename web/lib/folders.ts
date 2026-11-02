import { api } from "./api";

/** 세션 폴더를 탐색기로 연다. lastOutputDir 또는 세션 id를 받는다. */
export async function openFolder(pathOrId: string, onError: (m: string) => void): Promise<void> {
  const id = pathOrId.split(/[\\/]/).pop() ?? pathOrId;
  try {
    await api(`/api/sessions/${encodeURIComponent(id)}/open`, { method: "POST", body: {} });
  } catch (e: unknown) {
    onError(e instanceof Error ? e.message : "폴더를 열지 못했습니다");
  }
}
