import { useEffect, useRef } from "react";
import type { LogEntry } from "../../shared/events";

const LABEL: Record<LogEntry["kind"], string> = {
  human: "", mc: "AI MC", backend: "백엔드", search: "웹 검색", note: "진행 지시", system: "시스템", error: "오류",
};

const time = (at: number): string => new Date(at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

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
        <p>아직 대화가 없습니다.</p>
        <p className="muted">마이크를 연결하고 세션을 시작하면 이곳에 전사와 백엔드 결과가 표시됩니다.</p>
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
        <li key={e.id} className={`log-item k-${e.kind}`}>
          <div className="log-head">
            <span className="log-n">{i + 1}</span>
            <span className="log-who">{e.speaker ?? LABEL[e.kind]}</span>
            <time>{time(e.at)}</time>
          </div>
          <p className="log-text">{e.text}</p>
        </li>
      ))}
    </ol>
  );
}
