import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { LogEntry, SessionSummary } from "../../shared/events.js";
import type { Settings } from "../../shared/settings.js";
import type { RecordedTrack } from "./session-recorder.js";

/** events.jsonl을 읽어 같은 id의 마지막 줄만 남긴다 (전사는 이어 붙으며 여러 번 저장됨). */
export function readSessionLog(file: string): LogEntry[] {
  if (!existsSync(file)) return [];
  const byId = new Map<string, LogEntry>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as LogEntry;
      const prev = byId.get(e.id);
      // 처음 등장한 시각을 유지하고 내용은 최신으로
      byId.set(e.id, prev ? { ...e, at: prev.at } : e);
    } catch {
      // 깨진 줄은 건너뛴다.
    }
  }
  return [...byId.values()].sort((a, b) => a.at - b.at);
}

const clock = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const WHO: Record<LogEntry["kind"], string> = {
  human: "참가자", mc: "AI MC", backend: "백엔드", search: "검색", note: "진행 지시", system: "시스템", error: "오류",
};

/** 사람이 읽는 대화록: 대화(사람·MC)와 진행 이벤트를 시간순으로 */
export function buildTranscript(entries: LogEntry[], startedAt: number): string {
  const lines = ["# 대화록", ""];
  for (const e of entries) {
    const t = clock(e.at - startedAt);
    const who = e.speaker ?? WHO[e.kind];
    if (e.kind === "human" || e.kind === "mc") lines.push(`**[${t}] ${who}:** ${e.text}`, "");
    else if (e.kind === "search") lines.push(`> [${t}] 🔎 ${who}: ${e.text}`, "");
    else if (e.kind === "backend") lines.push(`> [${t}] 📝 ${who}: ${e.text.replace(/\n/g, " ")}`, "");
    else lines.push(`_[${t}] ${who}: ${e.text}_`, "");
  }
  return lines.join("\n");
}

export interface SessionStats {
  summary: SessionSummary;
  latenciesMs: number[];
  counts: Record<string, number>;
  tokens?: { input: number; output: number };
}

const fmtMs = (v: number | null): string => (v === null ? "–" : `${v.toLocaleString()} ms`);

export function buildReport(stats: SessionStats, settings: Settings, tracks: RecordedTrack[], transcript: string): string {
  const s = stats.summary;
  const c = stats.counts;
  const trackRows = tracks.map((t) => `| ${t.label} | \`${basename(t.file)}\` | ${t.seconds.toFixed(1)}초 |`);
  return [
    `# 시범 녹음 리포트 · ${s.engineLabel}${s.persona ? ` · ${s.persona}` : ""}`,
    "",
    `- 세션: \`${s.sessionId}\``,
    `- 시작: ${new Date(s.startedAt).toLocaleString("ko-KR")}`,
    `- 길이: ${Math.floor(s.durationSec / 60)}분 ${s.durationSec % 60}초`,
    `- 엔진: ${s.description}`,
    `- MC 트랙: ${s.persona ?? "-"}${settings.persona.openingMode === "wait" ? " (CJ 첫마디 대기)" : " (스몰토크로 시작)"}`,
    "",
    "## 성능",
    "",
    "| 항목 | 값 |",
    "|---|---|",
    `| MC 응답 횟수 (지연 측정) | ${s.turns} |`,
    `| 응답 지연 중앙값 | ${fmtMs(s.latencyMedianMs)} |`,
    `| 응답 지연 p95 | ${fmtMs(s.latencyP95Ms)} |`,
    `| 추정 비용 | $${s.costUsd.toFixed(4)} ${settings.engine === "gpt-live" ? "(GPT 백엔드 별도)" : "(Google 검색 별도)"} |`,
    ...(stats.tokens ? [`| 토큰 (입력 / 출력) | ${stats.tokens.input.toLocaleString()} / ${stats.tokens.output.toLocaleString()} |`] : []),
    "",
    "응답 지연 = 사람 말이 끝난 뒤(에이전트 음량 감지 기준) MC 첫 소리가 송출되기까지. 비용은 공개 요금 기준 추정치입니다.",
    ...(settings.engine === "gemini-live" ? ["Gemini는 MC가 한 턴을 끝낼 때 사용량을 보내므로, MC가 말하는 도중 종료했다면 마지막 턴의 사용량은 빠져 있습니다."] : []),
    "",
    "## 이벤트",
    "",
    "| 항목 | 횟수 |",
    "|---|---|",
    `| 사람 발화 | ${c.humanUtterances ?? 0} |`,
    `| MC 발화 | ${c.mcUtterances ?? 0} |`,
    `| 사람이 MC 말을 끊음 (서버 감지) | ${c.interruptions ?? 0} |`,
    `| AI 즉시 정지 | ${c.holds ?? 0} |`,
    `| MC에게 넘기기 | ${c.handoffs ?? 0} |`,
    `| 귓속말 | ${c.notes ?? 0} |`,
    `| 백엔드 위임 | ${c.delegations ?? 0} |`,
    `| 검색 | ${c.searches ?? 0} |`,
    `| 오류 | ${c.errors ?? 0} |`,
    "",
    "## 오디오",
    "",
    "| 트랙 | 파일 | 길이 |",
    "|---|---|---|",
    ...(trackRows.length ? trackRows : ["| (녹음 없음) | | |"]),
    "",
    "모든 트랙은 같은 시간축(세션 시작 = 0초)으로 정렬되어 있습니다. MC 트랙에는 실제로 송출된 음성만 들어 있습니다 (정지로 버린 음성 제외).",
    "",
    "## 응답 지연 전체 (ms)",
    "",
    stats.latenciesMs.length ? stats.latenciesMs.join(", ") : "(측정값 없음)",
    "",
    "---",
    "",
    transcript,
  ].join("\n");
}

/** 세션 폴더에 리포트·대화록·요약·설정을 쓴다 */
export function writeSessionOutput(dir: string, stats: SessionStats, settings: Settings, tracks: RecordedTrack[], startedAt: number): void {
  const entries = readSessionLog(join(dir, "events.jsonl"));
  const transcript = buildTranscript(entries, startedAt);
  writeFileSync(join(dir, "transcript.md"), transcript, "utf8");
  writeFileSync(join(dir, "report.md"), buildReport(stats, settings, tracks, transcript), "utf8");
  writeFileSync(join(dir, "settings.json"), JSON.stringify(settings, null, 2), "utf8");
  writeFileSync(
    join(dir, "summary.json"),
    JSON.stringify({ ...stats.summary, counts: stats.counts, tokens: stats.tokens ?? null, latenciesMs: stats.latenciesMs, audio: tracks.map((t) => ({ label: t.label, file: basename(t.file), seconds: Number(t.seconds.toFixed(2)) })) }, null, 2),
    "utf8",
  );
}
