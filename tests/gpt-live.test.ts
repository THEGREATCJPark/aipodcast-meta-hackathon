import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { WebSocketServer, type WebSocket } from "ws";
import { defaultSettings } from "../shared/settings.js";
import { pcmToBase64 } from "../server/audio/mixer.js";
import { GptLiveSession, buildSessionStart } from "../server/engines/gpt-live.js";
import { SettingsStore } from "../server/settings/store.js";
import { inviteLink } from "../server/livekit/tokens.js";

test("session.start: 설정이 문서 형식대로 들어간다", () => {
  const s = defaultSettings();
  const msg = buildSessionStart({ ...s, gptLive: { ...s.gptLive, delegation: { ...s.gptLive.delegation, webSearch: false, reasoningEffort: "none" } } }, "e1") as {
    type: string; session: Record<string, any>;
  };
  assert.equal(msg.type, "session.start");
  assert.equal(msg.session.model, "gpt-live-1");
  assert.equal(msg.session.audio.output.voice, "noeul");
  assert.deepEqual(msg.session.audio.format, { type: "audio/pcm", rate: 24000 });
  assert.equal(msg.session.input[0].role, "developer");
  assert.ok(msg.session.instructions.includes("<|SpawnThinking|>"), "GPT-Live 부록이 붙어야 한다");
  assert.equal(msg.session.delegation.type, "responses");
  assert.deepEqual(msg.session.delegation.responses.tools, []);
  assert.equal(msg.session.delegation.responses.reasoning, undefined);
  const withSearch = buildSessionStart(s, "e2") as { session: Record<string, any> };
  assert.deepEqual(withSearch.session.delegation.responses.tools, [{ type: "web_search" }]);
  assert.deepEqual(withSearch.session.delegation.responses.reasoning, { effort: "low" });
});

/** 가짜 GPT-Live 서버로 실제 WebSocket 왕복을 검증한다. */
async function withFakeServer(fn: (url: string, received: Record<string, any>[], peer: () => WebSocket) => Promise<void>): Promise<void> {
  const wss = new WebSocketServer({ port: 0 });
  const received: Record<string, any>[] = [];
  let socket: WebSocket | null = null;
  wss.on("connection", (ws, req) => {
    socket = ws;
    assert.equal(req.headers.authorization, "Bearer test-key");
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      received.push(msg);
      if (msg.type === "session.start") ws.send(JSON.stringify({ type: "session.started", session: { id: "live_1" } }));
      if (msg.type === "session.close") ws.send(JSON.stringify({ type: "session.closed", reason: "close_requested", usage: { seconds: 12.5 } }));
    });
  });
  await new Promise((r) => wss.once("listening", r));
  const port = (wss.address() as { port: number }).port;
  try {
    await fn(`ws://127.0.0.1:${port}`, received, () => socket!);
  } finally {
    wss.clients.forEach((c) => c.terminate());
    wss.close();
  }
}

const tick = (ms = 30): Promise<void> => new Promise((r) => setTimeout(r, ms));

test("GPT-Live: 시작 → 인사 요청 → 오디오·전사·백엔드 이벤트 → 제어 → 종료", async () => {
  await withFakeServer(async (url, received, peer) => {
    const session = new GptLiveSession("test-key", defaultSettings(), url);
    const got = { audio: 0, input: "", output: "", backend: "", searches: [] as string[], usage: 0, cost: 0, closed: "", errors: [] as string[] };
    session.on("error", (_m, code) => got.errors.push(code ?? ""));
    const samples: number[] = [];
    session.on("audio", (pcm) => {
      got.audio += pcm.length;
      samples.push(...pcm.slice(0, 2));
    });
    session.on("inputTranscript", (d) => (got.input += d.delta));
    session.on("outputTranscript", (d) => (got.output += d.delta));
    session.on("backendText", (_id, d) => (got.backend += d));
    session.on("webSearch", (_id, q) => got.searches.push(q));
    session.on("usage", (u) => {
      got.usage = u.seconds;
      got.cost = u.costUsd;
    });
    session.on("closed", (r) => (got.closed = r));

    await session.connect();
    assert.equal(received[0].type, "session.start");
    await tick();
    assert.equal(received[1].type, "session.commentary.append");
    assert.equal(received[1].delegation_id, null);

    session.appendAudio(new Int16Array([1, 2, 3, 4]));
    session.instruct("멈춰");
    session.think("메모");
    await tick();
    const types = received.map((m) => m.type);
    assert.ok(types.includes("session.input_audio.append"));
    assert.ok(types.includes("session.instructions.append"));
    assert.ok(types.includes("session.thinking.append"));

    const ws = peer();
    ws.send(JSON.stringify({ type: "session.output_audio.delta", delta: pcmToBase64(new Int16Array(480)) }));
    // 샘플 중간에서 끊긴 조각: 3바이트 + 1바이트 → 2샘플
    const split = Buffer.from(new Int16Array([1000, -2000]).buffer);
    ws.send(JSON.stringify({ type: "session.output_audio.delta", delta: split.subarray(0, 3).toString("base64") }));
    ws.send(JSON.stringify({ type: "session.output_audio.delta", delta: split.subarray(3).toString("base64") }));
    ws.send(JSON.stringify({ type: "session.input_transcript.delta", delta: "특이점", start_ms: 0, end_ms: 400 }));
    ws.send(JSON.stringify({ type: "session.output_transcript.delta", delta: "네, 좋아요", start_ms: 500, end_ms: 900 }));
    ws.send(JSON.stringify({ type: "session.delegation.created", delegation: { id: "d1", type: "delegation", target: "responses" } }));
    ws.send(JSON.stringify({ type: "response.event", delegation_id: "d1", event: { type: "response.output_item.done", item: { type: "web_search_call", action: { type: "search", query: "기술적 특이점 정의" } } } }));
    ws.send(JSON.stringify({ type: "response.event", delegation_id: "d1", event: { type: "response.output_text.delta", delta: "가설적 전환점" } }));
    ws.send(JSON.stringify({ type: "session.usage.updated", usage: { seconds: 3 } }));
    ws.send("not json");
    await tick(60);
    assert.equal(got.audio, 482);
    assert.deepEqual(samples.slice(-2), [1000, -2000]);
    assert.equal(got.input, "특이점");
    assert.equal(got.output, "네, 좋아요");
    assert.deepEqual(got.searches, ["기술적 특이점 정의"]);
    assert.equal(got.backend, "가설적 전환점");
    assert.equal(got.usage, 3);
    assert.deepEqual(got.errors, ["parse_error"]);

    await session.close();
    await tick();
    assert.equal(got.closed, "close_requested");
    assert.equal(got.usage, 12.5);
    assert.ok(Math.abs(got.cost - (12.5 / 60) * 0.05) < 1e-9);
  });
});

test("GPT-Live: 시작 중 오류는 거부로 전달된다", async () => {
  const wss = new WebSocketServer({ port: 0 });
  wss.on("connection", (ws) =>
    ws.on("message", () => ws.send(JSON.stringify({ type: "error", error: { code: "model_not_found", message: "no access" } }))),
  );
  await new Promise((r) => wss.once("listening", r));
  const port = (wss.address() as { port: number }).port;
  const session = new GptLiveSession("test-key", defaultSettings(), `ws://127.0.0.1:${port}`);
  session.on("error", () => undefined);
  await assert.rejects(session.connect(), /model_not_found/);
  wss.clients.forEach((c) => c.terminate());
  wss.close();
});

test("설정 저장소: 검증 후 저장하고, 잘못된 값은 거부한다", () => {
  const dir = mkdtempSync(join(tmpdir(), "mc-settings-"));
  const store = new SettingsStore(dir);
  const s = store.get();
  const saved = store.save({ ...s, engine: "gemini-live", gptLive: { ...s.gptLive, voice: "marin" } });
  assert.equal(saved.gptLive.voice, "marin");
  assert.equal(new SettingsStore(dir).get().engine, "gemini-live");
  assert.throws(() => store.save({ ...s, show: { ...s.show, roomName: "방 이름!" } }));
  assert.equal(store.get().gptLive.voice, "marin");
});

test("초대 링크: 토큰은 fragment에 들어간다", () => {
  const link = inviteLink("https://guest.example.com/", "wss://x.livekit.cloud", "tok.en", "홍길동");
  assert.ok(link.startsWith("https://guest.example.com/join#"));
  const p = new URLSearchParams(link.split("#")[1]);
  assert.equal(p.get("t"), "tok.en");
  assert.equal(p.get("n"), "홍길동");
});

test("설정 저장소: 이전 형식(voice/delegation)을 새 형식으로 옮긴다", () => {
  const dir = mkdtempSync(join(tmpdir(), "mc-settings-"));
  writeFileSync(
    join(dir, "settings.json"),
    JSON.stringify({
      engine: "gpt-live",
      voice: { model: "gpt-live-1", voice: "gleam", opening: "인사", prompt: "옛 프롬프트" },
      delegation: { type: "responses", model: "gpt-6-astra", reasoningEffort: "medium", webSearch: false, prompt: "작가" },
      show: { hostName: "CJ", roomName: "studio" },
    }),
  );
  const s = new SettingsStore(dir).get();
  assert.equal(s.prompt.instructions, "옛 프롬프트");
  assert.equal(s.prompt.opening, "인사");
  assert.equal(s.gptLive.voice, "gleam");
  assert.equal(s.gptLive.delegation.model, "gpt-6-astra");
  assert.equal(s.gptLive.delegation.webSearch, false);
  assert.equal(s.geminiLive.model, "gemini-3.8-live");
});
