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
