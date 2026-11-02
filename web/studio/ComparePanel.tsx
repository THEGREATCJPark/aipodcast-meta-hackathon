import { useEffect, useState } from "react";
import type { SessionSummary } from "../../shared/events";
import { api } from "../lib/api";
import { openFolder } from "../lib/folders";

const fmtTime = (ms: number): string =>
  new Date(ms).toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDur = (s: number): string => `${Math.floor(s / 60)}m ${s % 60}s`;
const ms = (v: number | null): string => (v === null ? "–" : `${v.toLocaleString()}ms`);

/** Session history: 세션마다 Response timing·비용을 나란히 본다. refreshKey가 바뀌면 다시 불러온다. */
export function ComparePanel({ refreshKey }: { refreshKey: string }) {
  const [rows, setRows] = useState<SessionSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<SessionSummary[]>("/api/sessions").then(setRows).catch(() => setRows([]));
  }, [refreshKey]);

  if (rows.length === 0) return null;

  return (
    <details className="compare" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Session history <span className="muted">({rows.length} sessions)</span></summary>
      <div className="compare-scroll">
        <table>
          <thead>
            <tr>
              <th>Started</th><th>Engine</th><th>Style</th><th>Duration</th><th>Responses</th><th>Median timing</th><th>p95 timing</th><th>Estimated cost</th><th></th>
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
                <td>{r.sessionId && <button className="btn ghost tiny" onClick={() => void openFolder(r.sessionId!, () => undefined)}>Folder</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">Timing is measured at the server, not at the listener. Small-sample statistics are descriptive only. Meta cost is not measured; legacy estimates exclude delegated and search costs.</p>
    </details>
  );
}
