import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMON_PODCAST_RULES, OPERATION_RULES, PERSONA_TRACKS, TRACK_IDS, WAIT_FOR_HOST_OPENING } from "../shared/personas.js";
import { composeInstructions, defaultSettings, openingInstruction, type Settings } from "../shared/settings.js";
import { buildSessionStart } from "../server/engines/gpt-live.js";
import { buildGeminiSetup } from "../server/engines/gemini-live.js";

const withPersona = (track: Settings["persona"]["track"], openingMode: Settings["persona"]["openingMode"] = "smalltalk"): Settings => ({
  ...defaultSettings(),
  persona: { track, openingMode },
});

test("트랙 프롬프트: 발화 길이(상·하단) + 공통 규칙 + 트랙 + 운영 규칙 순서로 조립된다", () => {
  for (const id of TRACK_IDS) {
    const text = composeInstructions(withPersona(id), "gemini-live");
    const order = ["# [최우선] 발화 길이", COMMON_PODCAST_RULES, PERSONA_TRACKS[id].prompt, OPERATION_RULES, "# 검색·사실 확인", "# [다시 강조] 발화 길이"].map((p) => text.indexOf(p));
    assert.ok(order.every((i) => i >= 0), `${id}: 모든 블록이 들어가야 한다`);
    assert.deepEqual([...order].sort((a, b) => a - b), order, `${id}: 순서가 맞아야 한다`);
    for (const other of TRACK_IDS.filter((x) => x !== id)) assert.ok(!text.includes(PERSONA_TRACKS[other].prompt), "다른 트랙은 섞이지 않는다");
  }
});

test("직접 작성: 공통 규칙 없이 사용자 프롬프트 + 운영 규칙", () => {
  const s = { ...withPersona("custom"), prompt: { opening: "내 오프닝", instructions: "내 캐릭터" } };
  const text = composeInstructions(s, "gpt-live");
  assert.ok(text.includes("내 캐릭터") && text.includes(OPERATION_RULES));
  assert.ok(!text.includes(COMMON_PODCAST_RULES));
  assert.equal(openingInstruction(s), "내 오프닝");
});

test("오프닝: 트랙별 스몰토크 지시, 기다리기 모드면 선공하지 않는다", () => {
  const talk = openingInstruction(withPersona("track_3_chimchakman"));
  assert.ok(talk?.includes("고정 템플릿 인사는 절대 쓰지 마라") && talk.includes("둥지식 오프닝"));
  const wait = withPersona("track_2_spns", "wait");
  assert.equal(openingInstruction(wait), null);
  assert.ok(composeInstructions(wait, "gpt-live").includes(WAIT_FOR_HOST_OPENING));

  const gptStart = buildSessionStart(wait, "e") as { session: { input: unknown[] } };
  assert.deepEqual(gptStart.session.input, [], "GPT-Live: 기다리기 모드면 오프닝 메시지를 넣지 않는다");
  const gemini = buildGeminiSetup(withPersona("track_1_pinggyego")) as { setup: { systemInstruction: { parts: { text: string }[] } } };
  assert.ok(gemini.setup.systemInstruction.parts[0].text.includes("유재석 스타일"));
});

test("검색 최소화 규칙: 두 엔진 부록 모두 '분명히 요청할 때만'과 구어체 풀이를 요구한다", () => {
  for (const engine of ["gpt-live", "gemini-live"] as const) {
    const text = composeInstructions(withPersona("track_1_pinggyego"), engine);
    assert.ok(text.includes("분명히 요청할 때만"));
    assert.ok(text.includes("구어체"));
  }
});
