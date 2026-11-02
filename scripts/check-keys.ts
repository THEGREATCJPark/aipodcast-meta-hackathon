/**
 * API 키 진단: 키 값은 출력하지 않는다.
 * - OpenAI: 모델 목록(무료) + GPT-Live 세션을 열자마자 닫아 등급 제한 확인 (1초 미만 과금)
 * - Gemini: 모델 목록(무료)에서 Live 모델 확인
 */
import "dotenv/config";
import { RoomServiceClient } from "livekit-server-sdk";
import WebSocket from "ws";

const out = (label: string, msg: string): void => {
  process.stdout.write(`${label.padEnd(14)} ${msg}\n`);
};

async function openai(): Promise<void> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return out("OpenAI", "키 없음");
  const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return out("OpenAI", `모델 목록 실패 HTTP ${res.status}`);
  const ids = ((await res.json()) as { data: { id: string }[] }).data.map((m) => m.id);
  out("OpenAI", `키 유효 · 모델 ${ids.length}개 · live 모델: ${ids.filter((i) => i.includes("live")).join(", ") || "없음"}`);
  const backend = ids
    .filter((i) => /^gpt-([5-9]|\d{2})/.test(i) && !/(audio|realtime|live|transcribe|tts|image|search|codex|chat)/.test(i))
    .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  out("", `백엔드 후보 (최신순): ${backend.slice(0, 10).join(", ") || "없음"}`);

  await new Promise<void>((resolve) => {
    const ws = new WebSocket("wss://api.openai.com/v1/live/sessions", { headers: { Authorization: `Bearer ${key}` } });
    const done = (msg: string): void => {
      out("GPT-Live", msg);
      ws.terminate();
      resolve();
    };
    const timer = setTimeout(() => done("응답 없음 (10초)"), 10000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "session.start", session: { model: "gpt-live-1", store: false } })));
    ws.on("unexpected-response", (_req, r) => {
      clearTimeout(timer);
      done(`연결 거부 HTTP ${r.statusCode}`);
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString()) as { type: string; error?: { code?: string; message?: string } };
      if (msg.type === "session.started") {
        clearTimeout(timer);
        ws.send(JSON.stringify({ type: "session.close" }));
        setTimeout(() => done("사용 가능 ✅ (세션 시작 성공, 즉시 종료)"), 300);
      } else if (msg.type === "error") {
        clearTimeout(timer);
        done(`사용 불가 ❌ ${msg.error?.code ?? ""}: ${msg.error?.message ?? ""}`);
      }
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      done(`오류: ${e.message}`);
    });
  });
}

async function gemini(): Promise<void> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return out("Gemini", "키 없음");
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    return out("Gemini", `모델 목록 실패 HTTP ${res.status}: ${body.error?.message ?? ""}`);
  }
  const models = ((await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models ?? [];
  const live = models.filter((m) => m.supportedGenerationMethods?.includes("bidiGenerateContent")).map((m) => m.name.replace("models/", ""));
  out("Gemini", `키 유효 · 모델 ${models.length}개`);
  out("", `Live 지원 모델: ${live.join(", ") || "없음"}`);
}

async function livekit(): Promise<void> {
  const url = process.env.LIVEKIT_URL?.trim();
  const key = process.env.LIVEKIT_API_KEY?.trim();
  const secret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !key || !secret) return out("LiveKit", "URL·KEY·SECRET 중 비어 있는 값이 있음");
  if (!/^wss?:\/\//.test(url)) return out("LiveKit", "URL은 wss:// 로 시작해야 합니다");
  const rooms = await new RoomServiceClient(url.replace(/^ws/, "http"), key, secret).listRooms();
  out("LiveKit", `인증 성공 ✅ · 현재 열린 방 ${rooms.length}개`);
}

/** 음성 이름마다 GPT-Live 세션을 열어 보고 바로 닫는다 (음성당 1초 미만 과금). */
async function probeVoice(voice: string): Promise<void> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return;
  await new Promise<void>((resolve) => {
    const ws = new WebSocket("wss://api.openai.com/v1/live/sessions", { headers: { Authorization: `Bearer ${key}` } });
    const done = (msg: string): void => {
      out(`  voice ${voice}`, msg);
      ws.terminate();
      resolve();
    };
    const timer = setTimeout(() => done("응답 없음"), 10000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "session.start", session: { model: "gpt-live-1", store: false, audio: { output: { voice } } } })));
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString()) as { type: string; error?: { code?: string; message?: string } };
      if (msg.type === "session.started") {
        clearTimeout(timer);
        ws.send(JSON.stringify({ type: "session.close" }));
        setTimeout(() => done("사용 가능 ✅"), 300);
      } else if (msg.type === "error") {
        clearTimeout(timer);
        done(`거부 ❌ ${msg.error?.code ?? ""}: ${msg.error?.message ?? ""}`);
      }
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      done(`오류: ${e.message}`);
    });
  });
}

const voicesArg = process.argv.find((a) => a.startsWith("--voices="));

await openai().catch((e: unknown) => out("OpenAI", `오류: ${String(e)}`));
await gemini().catch((e: unknown) => out("Gemini", `오류: ${String(e)}`));
await livekit().catch((e: unknown) => out("LiveKit", `실패 ❌ ${e instanceof Error ? e.message : String(e)}`));
if (voicesArg) {
  for (const v of voicesArg.slice("--voices=".length).split(",").filter(Boolean)) await probeVoice(v.trim());
}
