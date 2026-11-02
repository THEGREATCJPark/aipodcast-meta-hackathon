import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultSettings } from "../shared/settings.js";
import { WavTrack, mixWavFiles } from "../server/recording/wav-track.js";
import { buildTranscript, readSessionLog, writeSessionOutput, type SessionStats } from "../server/recording/report.js";

const tmp = (): string => mkdtempSync(join(tmpdir(), "mc-rec-"));

function readWav(path: string): { rate: number; samples: Int16Array } {
  const buf = readFileSync(path);
  assert.equal(buf.toString("ascii", 0, 4), "RIFF");
  assert.equal(buf.toString("ascii", 8, 12), "WAVE");
  const rate = buf.readUInt32LE(24);
  const bytes = buf.readUInt32LE(40);
  assert.equal(buf.length, 44 + bytes, "헤더의 데이터 크기와 실제 파일 크기가 같아야 한다");
  const samples = new Int16Array(bytes / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(44 + i * 2);
  return { rate, samples };
}

test("WAV 트랙: 늦게 들어온 조각은 그 시각 위치에 놓고 사이를 무음으로 채운다", () => {
  const dir = tmp();
  const t = new WavTrack(join(dir, "a.wav"), 1000, 50);
  t.writeAt(Int16Array.from(Array(10).fill(5)), 10); // 0~10ms
  t.writeAt(Int16Array.from(Array(10).fill(7)), 520); // 510~520ms (500ms 끊김)
  t.writeAt(Int16Array.from(Array(10).fill(9)), 540); // 약간의 흔들림(허용 범위)은 이어 붙인다
  t.padTo(600);
  t.finalize();
  const { rate, samples } = readWav(join(dir, "a.wav"));
  assert.equal(rate, 1000);
  assert.equal(samples.length, 600);
  assert.equal(samples[0], 5);
  assert.equal(samples[300], 0);
  assert.equal(samples[510], 7);
  assert.equal(samples[520], 9);
  assert.equal(samples[599], 0);
});

test("믹스: 트랙들을 더하고 길이는 가장 긴 트랙에 맞추며 클리핑한다", () => {
  const dir = tmp();
  const a = new WavTrack(join(dir, "a.wav"), 1000);
  a.writeAt(Int16Array.from([100, 30000, 3]), 3);
  a.finalize();
  const b = new WavTrack(join(dir, "b.wav"), 1000);
  b.writeAt(Int16Array.from([1, 30000, 3, 4, 5]), 5);
  b.finalize();
  const total = mixWavFiles([join(dir, "a.wav"), join(dir, "b.wav")], join(dir, "mix.wav"), 1000);
  assert.equal(total, 5);
  assert.deepEqual([...readWav(join(dir, "mix.wav")).samples], [101, 32767, 6, 4, 5]);
});

test("세션 로그: 같은 id는 마지막 내용, 처음 시각으로 합친다", () => {
  const dir = tmp();
  const file = join(dir, "events.jsonl");
  writeFileSync(
    file,
    [
      { id: "mc-1", kind: "mc", at: 1000, speaker: "AI MC", text: "안녕" },
      { id: "h-1", kind: "human", at: 3000, speaker: "CJ", text: "반가워요" },
      { id: "mc-1", kind: "mc", at: 2500, speaker: "AI MC", text: "안녕하세요" },
    ].map((e) => JSON.stringify(e)).join("\n") + "\n{broken\n",
  );
  const entries = readSessionLog(file);
  assert.deepEqual(entries.map((e) => [e.id, e.text, e.at]), [["mc-1", "안녕하세요", 1000], ["h-1", "반가워요", 3000]]);
  const md = buildTranscript(entries, 0);
  assert.ok(md.includes("**[00:01] AI MC:** 안녕하세요"));
  assert.ok(md.includes("**[00:03] CJ:** 반가워요"));
});

test("세션 정리: 리포트·대화록·요약·설정 파일을 만든다", () => {
  const dir = tmp();
  writeFileSync(join(dir, "events.jsonl"), JSON.stringify({ id: "mc-1", kind: "mc", at: 5000, speaker: "AI MC", text: "오늘 주제는?" }) + "\n");
  const stats: SessionStats = {
    summary: {
      sessionId: "s1", engine: "gemini-live", engineLabel: "Gemini Live", description: "Gemini Live · gemini-3.8-live / Kore",
      startedAt: 0, durationSec: 605, turns: 3, latencyMedianMs: 900, latencyP95Ms: 1500, costUsd: 0.1234,
    },
    latenciesMs: [800, 900, 1500],
    counts: { mcUtterances: 4, holds: 1 },
    tokens: { input: 1000, output: 200 },
  };
  writeSessionOutput(dir, stats, defaultSettings(), [{ file: join(dir, "mc.wav"), label: "AI MC", seconds: 605 }], 0);
  const report = readFileSync(join(dir, "report.md"), "utf8");
  assert.ok(report.includes("10분 5초"));
  assert.ok(report.includes("900 ms"));
  assert.ok(report.includes("| AI 즉시 정지 | 1 |"));
  assert.ok(report.includes("`mc.wav`"));
  assert.ok(report.includes("오늘 주제는?"));
  const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  assert.equal(summary.engine, "gemini-live");
  assert.deepEqual(summary.tokens, { input: 1000, output: 200 });
  assert.equal(JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")).geminiLive.voice, "Kore");
  assert.ok(readFileSync(join(dir, "transcript.md"), "utf8").includes("[00:05] AI MC"));
});
