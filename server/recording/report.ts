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
  human: "Participant", mc: "AI co-host", backend: "Backend", search: "Search", note: "Host control", system: "System", error: "Error",
};

/** 사람이 읽는 대화록: 대화(사람·MC)와 진행 이벤트를 시간순으로 */
export function buildTranscript(entries: LogEntry[], startedAt: number): string {
  const lines = ["# Transcript and session events", ""];
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
  const meta = settings.engine === "meta";
  const trackRows = tracks.map((t) => `| ${t.label} | \`${basename(t.file)}\` | ${t.seconds.toFixed(1)} s |`);
  return [
    `# Session report · ${s.engineLabel}${s.persona ? ` · ${s.persona}` : ""}`,
    "",
    `- Session: \`${s.sessionId}\``,
    `- Started: ${new Date(s.startedAt).toISOString()}`,
    `- Duration: ${Math.floor(s.durationSec / 60)} min ${s.durationSec % 60} s`,
    `- Providers: ${s.description}`,
    `- Co-host: ${s.persona ?? "-"}${settings.persona.openingMode === "wait" ? " (wait for humans)" : " (opening enabled)"}`,
    "",
    "## Observations",
    "",
    "| Metric | Value |", "|---|---|",
    `| Server first-audio timing samples | ${s.turns} |`,
    `| Median | ${fmtMs(s.latencyMedianMs)} |`,
    `| Sample p95 (not a general performance claim) | ${fmtMs(s.latencyP95Ms)} |`,
    meta ? "| Cost | Not measured; provider call/time caps only |" : `| Estimated cost | $${s.costUsd.toFixed(4)} (backend/search excluded) |`,
    ...(stats.tokens ? [`| Tokens (input / output) | ${stats.tokens.input} / ${stats.tokens.output} |`] : []),
    "",
    "Timing starts at local VAD turn end or host handoff and ends at the first server audio enqueue. Listener receipt and acoustic stop timing are not measured.",
    "",
    "## Events", "", "| Event | Count |", "|---|---|",
    `| Human transcripts | ${c.humanUtterances ?? 0} |`,
    `| Co-host transcript entries | ${c.mcUtterances ?? 0} |`,
    `| Output queue invalidations (all causes) | ${c.interruptions ?? 0} |`,
    `| Automatic local VAD interruption signals | ${c.automaticInterruptions ?? 0} |`,
    `| Manual HOLD | ${c.holds ?? 0} |`,
    `| Handoff requests | ${c.handoffs ?? 0} |`,
    `| Host notes | ${c.notes ?? 0} |`,
    `| Provider errors | ${c.errors ?? 0} |`,
    "",
    "Automatic interruption signals and manual HOLD are distinct. Neither count proves an acoustic interruption was heard by listeners. Meta generated text is decision evidence, not a transcript of fully heard speech.",
    "",
    "## Audio", "", "| Track | File | Duration |", "|---|---|---|",
    ...(trackRows.length ? trackRows : ["| No recording | | |"]),
    "",
    "Human tracks and mc.wav share the local session timeline. mc.wav contains acknowledged server capture frames, excluding invalidated pending frames; actual listener delivery is unmeasured. tts-generated-*.wav contains complete generated audio, which may have been interrupted and is not part of mix.wav. Input gaps, provider failures and generation stages are recorded in events.jsonl.",
    "",
    "## Individual server timing samples (ms)", "",
    stats.latenciesMs.length ? stats.latenciesMs.join(", ") : "No measurements",
    "", "---", "", transcript,
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
    JSON.stringify({ ...stats.summary, costMeasured: settings.engine !== "meta", counts: stats.counts, tokens: stats.tokens ?? null, latenciesMs: stats.latenciesMs, audio: tracks.map((t) => ({ label: t.label, file: basename(t.file), seconds: Number(t.seconds.toFixed(2)) })) }, null, 2),
    "utf8",
  );
}
