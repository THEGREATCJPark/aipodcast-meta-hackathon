import assert from "node:assert/strict";
import { test } from "node:test";
import { WebSocketServer, type WebSocket } from "ws";
import { ENGINE_APPENDIX, composeInstructions, defaultSettings } from "../shared/settings.js";
import { pcmToBase64 } from "../server/audio/mixer.js";
import { GeminiLiveSession, buildGeminiSetup, estimateGeminiCost } from "../server/engines/gemini-live.js";

const tick = (ms = 30): Promise<void> => new Promise((r) => setTimeout(r, ms));

test("공통 프롬프트: 같은 본문에 엔진별 부록만 다르게 붙는다", () => {
  const custom = { ...defaultSettings(), persona: { track: "custom" as const, openingMode: "smalltalk" as const }, prompt: { opening: "", instructions: "본문" } };
  const gpt = composeInstructions(custom, "gpt-live");
  const gem = composeInstructions(custom, "gemini-live");
  assert.equal(gpt.replace(ENGINE_APPENDIX["gpt-live"], ""), gem.replace(ENGINE_APPENDIX["gemini-live"], ""), "부록 외에는 같아야 한다");
  assert.ok(gpt.includes("<|SpawnThinking|>"));
  assert.ok(gem.includes("Google 검색") && !gem.includes("SpawnThinking"));
});

test("Gemini setup: 모델·음성·검색·VAD·압축·이어받기가 들어간다", () => {
  const s = defaultSettings();
  const msg = buildGeminiSetup(s) as { setup: Record<string, any> };
  const setup = msg.setup;
  assert.equal(setup.model, "models/gemini-3.8-live");
  assert.deepEqual(setup.generationConfig.responseModalities, ["AUDIO"]);
  assert.equal(setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Kore");
  assert.equal(setup.generationConfig.thinkingConfig, undefined, "일반 3.8 모델에는 thinking 설정을 보내지 않는다");
  assert.deepEqual(setup.tools, [{ googleSearch: {} }]);
  assert.equal(setup.realtimeInputConfig.automaticActivityDetection.endOfSpeechSensitivity, "END_SENSITIVITY_LOW");
  assert.equal(setup.realtimeInputConfig.automaticActivityDetection.silenceDurationMs, 800);
  assert.deepEqual(setup.contextWindowCompression, { slidingWindow: {} });
  assert.deepEqual(setup.outputAudioTranscription, { languageCodes: ["ko-KR"] });
  assert.deepEqual(setup.sessionResumption, {});
  assert.ok(setup.systemInstruction.parts[0].text.includes("Google 검색"));

  const ext = buildGeminiSetup(
    { ...s, geminiLive: { ...s.geminiLive, model: "gemini-3.8-live-extended-thinking", thinkingLevel: "low", googleSearch: false } },
    "handle-1",
  ) as { setup: Record<string, any> };
  assert.deepEqual(ext.setup.generationConfig.thinkingConfig, { thinkingLevel: "low" });
  assert.deepEqual(ext.setup.tools, []);
  assert.deepEqual(ext.setup.sessionResumption, { handle: "handle-1" });
  const extOff = buildGeminiSetup({ ...s, geminiLive: { ...s.geminiLive, model: "gemini-3.8-live-extended-thinking", thinkingLevel: "off" } }) as { setup: Record<string, any> };
  assert.deepEqual(extOff.setup.generationConfig.thinkingConfig, { thinkingLevel: "low" }, "extended 모델은 생각 깊이가 필수라 off도 low로 보낸다");
});

test("Gemini 비용 추정: 모달리티별 요금을 적용한다", () => {
  const cost = estimateGeminiCost({
    promptTokensDetails: [{ modality: "TEXT", tokenCount: 1_000_000 }, { modality: "AUDIO", tokenCount: 1_000_000 }],
    responseTokensDetails: [{ modality: "AUDIO", tokenCount: 1_000_000 }],
    thoughtsTokenCount: 1_000_000,
  });
  assert.ok(Math.abs(cost - (0.75 + 3 + 12 + 4.5)) < 1e-9);
});

interface FakeServer {
  url: string;
  received: Record<string, any>[];
  sockets: WebSocket[];
  close: () => void;
}

async function fakeGemini(onSetup: (ws: WebSocket, setup: Record<string, any>, n: number) => void): Promise<FakeServer> {
  const wss = new WebSocketServer({ port: 0 });
  const received: Record<string, any>[] = [];
  const sockets: WebSocket[] = [];
  let setups = 0;
  wss.on("connection", (ws, req) => {
    assert.ok(req.url?.includes("key=test-key"));
    sockets.push(ws);
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      received.push(msg);
      if (msg.setup) {
        setups += 1;
        onSetup(ws, msg.setup, setups);
      }
    });
  });
  await new Promise((r) => wss.once("listening", r));
  const port = (wss.address() as { port: number }).port;
  return {
    url: `ws://127.0.0.1:${port}/live`,
    received,
    sockets,
    close: () => {
      wss.clients.forEach((c) => c.terminate());
      wss.close();
    },
  };
}

test("Gemini: 시작 → 인사 요청 → 음성·전사·검색·끼어들기·사용량 → 종료", async () => {
  const srv = await fakeGemini((ws) => ws.send(JSON.stringify({ setupComplete: {} })));
  try {
    const session = new GeminiLiveSession("test-key", defaultSettings(), srv.url);
    const got = { audio: 0, input: "", output: "", searches: [] as string[], interrupted: 0, turnEnd: 0, cost: 0, closed: "" };
    session.on("audio", (p) => (got.audio += p.length));
    session.on("inputTranscript", (d) => (got.input += d.delta));
    session.on("outputTranscript", (d) => (got.output += d.delta));
    session.on("webSearch", (_id, q) => got.searches.push(q));
    session.on("interrupted", () => (got.interrupted += 1));
    session.on("turnEnd", () => (got.turnEnd += 1));
    session.on("usage", (u) => (got.cost = u.costUsd));
    session.on("closed", (r) => (got.closed = r));
    session.on("error", () => undefined);

    await session.connect();
    await tick();
    const opening = srv.received[1];
    assert.equal(opening.clientContent.turnComplete, true, "오프닝은 바로 말하게 한다");

    session.appendAudio(new Int16Array(480));
    session.think("[진행 메모] 지금 말하는 사람: CJ");
    session.speakNow("[진행자 지시] 넘깁니다");
    await tick();
    const audioMsg = srv.received.find((m) => m.realtimeInput);
    assert.equal(audioMsg?.realtimeInput.audio.mimeType, "audio/pcm;rate=24000");
    const texts = srv.received.filter((m) => m.clientContent).map((m) => m.clientContent.turnComplete);
    assert.deepEqual(texts, [true, false, true], "메모는 응답을 강제하지 않고, 넘기기는 강제한다");

    const ws = srv.sockets[0];
    ws.send(JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcmToBase64(new Int16Array(240)) } }] } } }));
    ws.send(JSON.stringify({ serverContent: { outputTranscription: { text: "안녕하세요" } } }));
    ws.send(JSON.stringify({ serverContent: { inputTranscription: { text: "특이점" } } }));
    ws.send(JSON.stringify({ serverContent: { groundingMetadata: { webSearchQueries: ["기술적 특이점"] } } }));
    ws.send(JSON.stringify({ serverContent: { interrupted: true } }));
    ws.send(JSON.stringify({ serverContent: { turnComplete: true }, usageMetadata: { responseTokensDetails: [{ modality: "AUDIO", tokenCount: 1000 }] } }));
    await tick(60);
    assert.equal(got.audio, 240);
    assert.equal(got.output, "안녕하세요");
    assert.equal(got.input, "특이점");
    assert.deepEqual(got.searches, ["기술적 특이점"]);
    assert.equal(got.interrupted, 1);
    assert.equal(got.turnEnd, 1);
    assert.ok(Math.abs(got.cost - (1000 / 1e6) * 12) < 1e-9);

    await session.close();
    await tick();
    assert.equal(got.closed, "close_requested");
  } finally {
    srv.close();
  }
});

test("Gemini: 연결이 끊기면 이어받기 핸들로 다시 연결한다 (인사는 다시 하지 않음)", async () => {
  const srv = await fakeGemini((ws, _setup, n) => {
    ws.send(JSON.stringify({ setupComplete: {} }));
    if (n === 1) {
      ws.send(JSON.stringify({ sessionResumptionUpdate: { newHandle: "h-123", resumable: true } }));
      setTimeout(() => ws.send(JSON.stringify({ goAway: { timeLeft: "1s" } })), 20);
    }
  });
  try {
    const session = new GeminiLiveSession("test-key", defaultSettings(), srv.url);
    const infos: string[] = [];
    let closed = "";
    session.on("info", (m) => infos.push(m));
    session.on("closed", (r) => (closed = r));
    session.on("error", () => undefined);
    await session.connect();
    await tick(200);
    const setups = srv.received.filter((m) => m.setup);
    assert.equal(setups.length, 2);
    assert.deepEqual(setups[1].setup.sessionResumption, { handle: "h-123" });
    const greetings = srv.received.filter((m) => m.clientContent?.turnComplete === true);
    assert.equal(greetings.length, 1, "이어받은 뒤 인사를 반복하지 않는다");
    assert.ok(infos.some((m) => m.includes("이어받았습니다")));
    assert.equal(closed, "");
    assert.equal(session.isReady, true);
    await session.close();
  } finally {
    srv.close();
  }
});

test("Gemini: 설정 단계에서 거부되면 시작 실패로 전달된다", async () => {
  const srv = await fakeGemini((ws) => ws.close(1008, "invalid model"));
  try {
    const session = new GeminiLiveSession("test-key", defaultSettings(), srv.url);
    session.on("error", () => undefined);
    await assert.rejects(session.connect(), /1008/);
  } finally {
    srv.close();
  }
});
