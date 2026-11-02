import assert from "node:assert/strict";
import { test } from "node:test";
import { PcmMixer, base64ToPcm, pcmToBase64, rmsDb } from "../server/audio/mixer.js";
import { SpeakerTimeline } from "../server/audio/speaker-timeline.js";
import { EnergyVad } from "../server/audio/vad.js";
import { TranscriptAssembler } from "../server/agent/transcript-assembler.js";

const tone = (n: number, amp: number): Int16Array => Int16Array.from({ length: n }, (_, i) => Math.round(amp * Math.sin(i / 3)));

test("믹서: 두 참가자를 더하고, 입력이 없으면 침묵을 낸다", () => {
  const m = new PcmMixer({ sampleRate: 1000, chunkMs: 10, maxBufferMs: 100 });
  m.push("a", Int16Array.from(Array(10).fill(100)));
  m.push("b", Int16Array.from(Array(5).fill(50)));
  assert.deepEqual([...m.pull()], [150, 150, 150, 150, 150, 100, 100, 100, 100, 100]);
  assert.deepEqual([...m.pull()], Array(10).fill(0));
});

test("믹서: 합이 범위를 넘으면 클리핑한다", () => {
  const m = new PcmMixer({ sampleRate: 1000, chunkMs: 2, maxBufferMs: 100 });
  m.push("a", Int16Array.from([30000, -30000]));
  m.push("b", Int16Array.from([30000, -30000]));
  assert.deepEqual([...m.pull()], [32767, -32768]);
});

test("믹서: 버퍼가 상한을 넘으면 오래된 샘플을 버려 지연이 쌓이지 않는다", () => {
  const m = new PcmMixer({ sampleRate: 1000, chunkMs: 10, maxBufferMs: 20 });
  m.push("a", Int16Array.from({ length: 50 }, (_, i) => i));
  assert.equal(m.bufferedSamples("a"), 20);
  assert.equal(m.pull()[0], 30);
});

test("PCM base64 왕복과 RMS", () => {
  const pcm = tone(480, 8000);
  assert.deepEqual([...base64ToPcm(pcmToBase64(pcm))], [...pcm]);
  assert.equal(rmsDb(new Int16Array(100)), -100);
  assert.ok(rmsDb(tone(480, 8000)) > -20);
});

test("VAD: 짧은 소리는 무시하고, 충분히 길면 시작·종료를 판정한다", () => {
  const vad = new EnergyVad({ thresholdDb: -40, startMs: 200, endMs: 600 });
  const loud = -20;
  const quiet = -80;
  assert.equal(vad.process(loud, 0, 20), null);
  assert.equal(vad.process(quiet, 20, 20), null); // 40ms짜리 잡음
  const events = [];
  let t = 100;
  for (let i = 0; i < 20; i++, t += 20) events.push(vad.process(loud, t, 20));
  const start = events.find((e) => e?.type === "start");
  assert.deepEqual(start, { type: "start", atMs: 100 });
  const lastVoice = t;
  let end = null;
  for (let i = 0; i < 40 && !end; i++, t += 20) end = vad.process(quiet, t, 20);
  assert.deepEqual(end, { type: "end", atMs: lastVoice });
});

test("VAD: 발화 중 짧은 쉼은 종료로 보지 않는다", () => {
  const vad = new EnergyVad({ thresholdDb: -40, startMs: 100, endMs: 600 });
  let t = 0;
  for (; t < 300; t += 20) vad.process(-20, t, 20);
  for (; t < 700; t += 20) assert.equal(vad.process(-80, t, 20), null);
  vad.process(-20, t, 20);
  assert.equal(vad.isSpeaking, true);
});

test("화자 판정: 전사 구간과 가장 많이 겹치는 사람을 고른다", () => {
  const tl = new SpeakerTimeline();
  tl.start("CJ", 0);
  tl.end("CJ", 3000);
  tl.start("게스트", 2800);
  tl.end("게스트", 6000);
  assert.equal(tl.attribute(500, 2900, 7000), "CJ");
  assert.equal(tl.attribute(3100, 5000, 7000), "게스트");
  assert.equal(tl.attribute(7000, 8000, 9000), null);
  tl.start("CJ", 9000);
  assert.equal(tl.attribute(9100, 9500, 9600), "CJ"); // 아직 끝나지 않은 발화
});

test("전사 묶기: 간격이 짧으면 이어 붙이고 길면 새 발화로 나눈다", () => {
  const a = new TranscriptAssembler("h", 1000);
  assert.equal(a.add({ delta: "안녕", startMs: 0, endMs: 300 })?.isNew, true);
  const cont = a.add({ delta: "하세요", startMs: 400, endMs: 700 });
  assert.equal(cont?.isNew, false);
  assert.equal(cont?.utterance.text, "안녕하세요");
  const next = a.add({ delta: " 다음", startMs: 3000, endMs: 3300 });
  assert.equal(next?.isNew, true);
  assert.equal(next?.utterance.text, "다음");
  assert.notEqual(next?.utterance.id, cont?.utterance.id);
  assert.equal(a.add({ delta: "", startMs: 0, endMs: 0 }), null);
});

test("믹서: 미리 쌓기 전에는 섞지 않고, 버퍼가 바닥나면 다시 쌓을 때까지 기다린다", () => {
  const m = new PcmMixer({ sampleRate: 1000, chunkMs: 10, maxBufferMs: 100, prebufferMs: 20 });
  m.push("a", Int16Array.from(Array(10).fill(7)));
  assert.deepEqual([...m.pull()], Array(10).fill(0)); // 10ms만 있음 → 대기
  m.push("a", Int16Array.from(Array(15).fill(7)));
  assert.deepEqual([...m.pull()], Array(10).fill(7)); // 25ms → 시작
  assert.equal(m.bufferedSamples("a"), 15);
  m.pull(); // 15 → 5 남음
  assert.deepEqual([...m.pull()].slice(0, 5), Array(5).fill(7)); // 남은 5ms를 내보내고 다시 대기 상태
  m.push("a", Int16Array.from(Array(10).fill(7)));
  assert.deepEqual([...m.pull()], Array(10).fill(0)); // 10ms < 20ms 미리 쌓기
});
