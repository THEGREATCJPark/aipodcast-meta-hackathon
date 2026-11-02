import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry, ServerMessage, StudioStatus } from "../../shared/events";
import type { Settings } from "../../shared/settings";
import { api } from "../lib/api";

interface StateResponse {
  settings: Settings;
  status: StudioStatus;
  history: LogEntry[];
  locked: boolean;
}

export interface StudioState {
  settings: Settings | null;
  status: StudioStatus | null;
  logs: LogEntry[];
  socketOpen: boolean;
  refresh: () => Promise<void>;
  setSettings: (s: Settings) => void;
}

/** 서버 상태 조회 + WebSocket으로 로그·상태를 실시간 수신 */
export function useStudio(): StudioState {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socketOpen, setSocketOpen] = useState(false);
  const retry = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    const s = await api<StateResponse>("/api/state");
    setSettings(s.settings);
    setStatus(s.status);
  }, []);

  useEffect(() => {
    void refresh();
    let ws: WebSocket | null = null;
    let closed = false;
    const connect = (): void => {
      ws = new WebSocket(`ws://${location.host}/ws`);
      ws.onopen = () => setSocketOpen(true);
      ws.onclose = () => {
        setSocketOpen(false);
        if (!closed) retry.current = window.setTimeout(connect, 1500);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data)) as ServerMessage;
        if (msg.type === "status") setStatus(msg.status);
        else if (msg.type === "history") setLogs(msg.entries);
        else if (msg.type === "log") setLogs((prev) => [...prev, msg.entry].slice(-500));
        else if (msg.type === "log-update") setLogs((prev) => prev.map((e) => (e.id === msg.entry.id ? msg.entry : e)));
      };
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retry.current);
      ws?.close();
    };
  }, [refresh]);

  return { settings, status, logs, socketOpen, refresh, setSettings };
}
