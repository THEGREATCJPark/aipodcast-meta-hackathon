import { useEffect, useRef } from "react";
import type { LogEntry } from "../../shared/events";

const LABEL: Record<LogEntry["kind"], string> = {
  human: "", mc: "AI MC", backend: "Backend", search: "Web search", note: "Host direction", system: "System", error: "Error",
};

const time = (at: number): string => new Date(at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** 대화·진행 로그. 아래에 붙어 있으면 새 항목을 따라 스크롤한다. */
export function LogPanel({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="log-empty">
        <p>The floor is yours.</p>
        <p className="muted">Connect your microphone, start a session, and speak. Your conversation and the co-host’s decisions will appear here.</p>
      </div>
    );
  }

  return (
    <ol
      className="log"
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      }}
    >
      {logs.map((e, i) => (
        <li id={`utterance-${e.id}`} key={e.id} className={`log-item k-${e.kind}`}>
          <div className="log-head">
            <span className="log-n">{i + 1}</span>
            <span className="log-who">{e.speaker ?? LABEL[e.kind]}</span>
            <time>{time(e.at)}</time>
          </div>
          <p className="log-text">{e.text}</p>
          <ResearchEvidence meta={e.meta} />
          {Array.isArray(e.meta?.sourceUtteranceIds) && <div className="evidence">
            <span>Evidence: </span>
            {e.meta.sourceUtteranceIds.filter((id): id is string => typeof id === "string").map((id) => (
              <a key={id} href={`#utterance-${id}`}>{logs.find((entry) => entry.id === id)?.speaker ?? "Source"} · view utterance</a>
            ))}
            {typeof e.meta.speakText === "string" && e.meta.speakText && <blockquote className="proposed-speech">{e.meta.speakText}<small>Meta-generated wording · not a receipt of playback</small></blockquote>}
          </div>}
        </li>
      ))}
    </ol>
  );
}


function ResearchEvidence({ meta }: { meta: LogEntry["meta"] }) {
  if (!meta) return null;
  const stage = typeof meta.stage === "string" ? meta.stage : "";
  const isResearch = stage.startsWith("research-");
  const candidates = Array.isArray(meta.sources) ? meta.sources : [];
  const sources = candidates.flatMap((raw): { title: string; url: string; hostname: string; kind: string }[] => {
    if (!raw || typeof raw !== "object") return [];
    const source = raw as Record<string, unknown>;
    if (typeof source.url !== "string") return [];
    try {
      const url = new URL(source.url);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return [];
      return [{ title: typeof source.title === "string" && source.title.trim() ? source.title : url.hostname, url: url.href, hostname: url.hostname, kind: source.kind === "provider-annotation" ? "Meta citation" : source.kind === "model-linked-search-result" ? "Meta-selected search result link" : "Source link" }];
    } catch { return []; }
  }).filter((source, index, all) => all.findIndex(other => other.url === source.url) === index).slice(0, 10);
  if (!isResearch && !sources.length) return null;
  const labels: Record<string, string> = { "research-started": "Research requested", "research-request": "Research requested", "research-completed": "Research result", "research-complete": "Research result", "research-blocked": "Research not run", "research-permission": "Research setting", "research-failed": "Research failed", "research-cancelled": "Research cancelled" };
  const measuredElapsed = typeof meta.completedAt === "number" && typeof meta.requestedAt === "number" ? meta.completedAt - meta.requestedAt : meta.elapsedMs;
  const elapsed = typeof measuredElapsed === "number" && Number.isFinite(measuredElapsed) && measuredElapsed >= 0 ? measuredElapsed : null;
  return <section className="research-evidence" aria-label="Research evidence">
    <div className="research-heading"><strong>{labels[stage] ?? "Web research"}</strong>{elapsed !== null && <span>Research request: {(elapsed / 1000).toFixed(1)} s</span>}</div>
    {typeof meta.completedAt === "number" && Number.isFinite(meta.completedAt) && !Number.isNaN(new Date(meta.completedAt).getTime()) && <p className="hint">Retrieved: {new Date(meta.completedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} (your local time)</p>}
    {typeof meta.query === "string" && <p className="research-query">{meta.query}</p>}
    {typeof meta.text === "string" && <p className="research-answer">{meta.text}</p>}
    {typeof meta.reason === "string" && <p className="hint">{meta.reason}</p>}
    {(typeof meta.provider === "string" || typeof meta.model === "string") && <p className="hint">{[meta.provider, meta.model].filter(value => typeof value === "string").join(" · ")}</p>}
    {sources.length > 0 && <ul className="source-cards">{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer"><strong>{source.title}</strong><span>{source.hostname} ↗</span><small>{source.kind}</small></a></li>)}</ul>}
    {(stage === "research-completed" || stage === "research-complete") && !sources.length && <p className="hint">No usable source links were returned.</p>}
    <p className="hint">Sources support review, not a guarantee of accuracy. Research completion does not confirm audio playback or listener receipt.</p>
  </section>;
}
