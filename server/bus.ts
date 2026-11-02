import { EventEmitter } from "node:events";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LogEntry, LogKind, SessionSummary, StudioStatus } from "../shared/events.js";

interface BusEvents {
  log: [LogEntry];
  logUpdate: [LogEntry];
  status: [StudioStatus];
}

/** 로그·상태를 화면에 방송하고 세션별 JSONL로 저장한다. */
export class StudioBus extends EventEmitter<BusEvents> {
  private entries: LogEntry[] = [];
  private seq = 0;
  private logFile: string | null = null;
  private sessionDir: string | null = null;

  /** outputDir: 세션 폴더들이 만들어지는 곳 (예: output/) */
  constructor(private readonly outputDir: string) {
    super();
  }

  beginSession(sessionId: string): string {
    const dir = join(this.outputDir, sessionId);
    mkdirSync(dir, { recursive: true });
    this.sessionDir = dir;
    this.logFile = join(dir, "events.jsonl");
    return dir;
  }

  currentSessionDir(): string | null {
    return this.sessionDir;
  }

  sessionPath(sessionId: string): string | null {
    if (!/^[\w.-]{1,120}$/.test(sessionId)) return null;
    const dir = join(this.outputDir, sessionId);
    return existsSync(join(dir, "summary.json")) ? dir : null;
  }

  endSession(): void {
    this.logFile = null;
    this.sessionDir = null;
  }

  /** 최근 세션 요약 (엔진 비교용), 최신 순 */
  summaries(limit = 30): SessionSummary[] {
    const root = this.outputDir;
    if (!existsSync(root)) return [];
    const out: SessionSummary[] = [];
    for (const name of readdirSync(root).sort().reverse().slice(0, limit * 3)) {
      const file = join(root, name, "summary.json");
      if (!existsSync(file)) continue;
      try {
        out.push(JSON.parse(readFileSync(file, "utf8")) as SessionSummary);
      } catch {
        // 손상된 요약은 건너뛴다.
      }
    }
    // 폴더 이름은 분 단위라 같은 분에 끝난 세션끼리 순서가 섞이므로 시작 시각으로 정렬한다.
    return out.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
  }

  history(): LogEntry[] {
    return this.entries;
  }

  log(kind: LogKind, text: string, extra: Partial<Pick<LogEntry, "speaker" | "meta" | "id">> = {}): LogEntry {
    this.seq += 1;
    const entry: LogEntry = { id: extra.id ?? `log-${this.seq}`, kind, at: Date.now(), text, speaker: extra.speaker, meta: extra.meta };
    this.entries = [...this.entries, entry].slice(-500);
    this.persist(entry);
    this.emit("log", entry);
    return entry;
  }

  /** 같은 id의 항목 내용을 교체한다 (전사가 이어 붙을 때). */
  update(entry: LogEntry): void {
    this.entries = this.entries.map((e) => (e.id === entry.id ? entry : e));
    this.emit("logUpdate", entry);
  }

  /** 발화가 끝난 항목을 최종본으로 저장한다. */
  persist(entry: LogEntry): void {
    if (!this.logFile) return;
    try {
      appendFileSync(this.logFile, JSON.stringify(entry) + "\n", "utf8");
    } catch (err: unknown) {
      this.emit("log", { id: `log-err-${Date.now()}`, kind: "error", at: Date.now(), text: `로그 저장 실패: ${String(err)}` });
    }
  }

  status(s: StudioStatus): void {
    this.emit("status", s);
  }
}
