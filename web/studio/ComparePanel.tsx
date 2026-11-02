import { useEffect, useState } from "react";
import type { SessionSummary } from "../../shared/events";
import { api } from "../lib/api";
import { openFolder } from "../lib/folders";

const fmtTime = (ms: number): string =>
  new Date(ms).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDur = (s: number): string => `${Math.floor(s / 60)}분 ${s % 60}초`;
const ms = (v: number | null): string => (v === null ? "–" : `${v.toLocaleString()}ms`);

/** 엔진 비교 기록: 세션마다 응답 지연·비용을 나란히 본다. refreshKey가 바뀌면 다시 불러온다. */
export function ComparePanel({ refreshKey }: { refreshKey: string }) {
  const [rows, setRows] = useState<SessionSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<SessionSummary[]>("/api/sessions").then(setRows).catch(() => setRows([]));
  }, [refreshKey]);

  if (rows.length === 0) return null;

  return (
    <details className="compare" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>엔진 비교 기록 <span className="muted">({rows.length}개 세션)</span></summary>
      <div className="compare-scroll">
        <table>
          <thead>
            <tr>
              <th>시작</th><th>엔진</th><th>MC 트랙</th><th>길이</th><th>응답 수</th><th>지연 중앙값</th><th>지연 p95</th><th>추정 비용</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sessionId ?? r.startedAt}>
                <td>{fmtTime(r.startedAt)}</td>
                <td title={r.description}><span className={`eng eng-${r.engine}`}>{r.engineLabel}</span></td>
                <td>{r.persona ?? "–"}</td>
                <td>{fmtDur(r.durationSec)}</td>
                <td>{r.turns}</td>
                <td>{ms(r.latencyMedianMs)}</td>
                <td>{ms(r.latencyP95Ms)}</td>
                <td>{r.engine === "meta" ? "Not measured" : `$${r.costUsd.toFixed(3)}`}</td>
                <td>{r.sessionId && <button className="btn ghost tiny" onClick={() => void openFolder(r.sessionId!, () => undefined)}>폴더</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">응답 지연 = 사람 말이 끝난 뒤 MC 첫 소리까지. 비용은 공개 요금 기준 추정이며 GPT 백엔드·Google 검색 요금은 빠져 있습니다.</p>
    </details>
  );
}
