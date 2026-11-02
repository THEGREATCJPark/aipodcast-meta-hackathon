import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry, ServerMessage, StudioStatus } from "../../shared/events";
import type { Settings } from "../../shared/settings";
import { api } from "../lib/api";

interface StateResponse { settings: Settings; status: StudioStatus; history: LogEntry[]; locked: boolean }
export interface StudioState {
  settings: Settings | null; status: StudioStatus | null; logs: LogEntry[]; socketOpen: boolean;
  connectionError: string | null; refresh: () => Promise<void>; setSettings: (s: Settings) => void;
}
const isLog = (entry: unknown): entry is LogEntry => Boolean(entry && typeof entry === "object" && typeof (entry as LogEntry).id === "string" && typeof (entry as LogEntry).text === "string" && typeof (entry as LogEntry).at === "number");

export function useStudio(): StudioState {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socketOpen, setSocketOpen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const mounted = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    try {
      const s = await api<StateResponse>("/api/state");
      if (!s?.settings || !s.status || typeof s.status.sessionActive !== "boolean" || !Array.isArray(s.history)) throw new Error("Invalid studio state response");
      if (!mounted.current || version !== request.current) return;
      setSettings(s.settings); setStatus(s.status); setLogs(s.history.filter(isLog).slice(-500)); setConnectionError(null);
    } catch (error) {
      if (mounted.current && version === request.current) setConnectionError("Studio connection failed. Check that the local server is running, then retry.");
      throw error;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: number | undefined;
    void refresh().catch(() => undefined);
    const connect = (): void => {
      if (closed) return;
      const socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`);
      ws = socket;
      socket.onopen = () => {
        if (closed || ws !== socket) return;
        setSocketOpen(true);
        void refresh().catch(() => undefined);
      };
      socket.onclose = () => {
        if (closed || ws !== socket) return;
        setSocketOpen(false); setConnectionError("Studio updates disconnected. Reconnecting… Controls are unavailable until connected.");
        retry = window.setTimeout(connect, 1500);
      };
      socket.onerror = () => { if (!closed) setConnectionError("Studio connection interrupted. Retrying automatically…"); };
      socket.onmessage = (ev) => {
        if (closed || ws !== socket) return;
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMessage;
          if (msg.type === "status" && msg.status && typeof msg.status.sessionActive === "boolean") setStatus(msg.status);
          else if (msg.type === "history" && Array.isArray(msg.entries)) setLogs(msg.entries.filter(isLog).slice(-500));
          else if (msg.type === "log" && isLog(msg.entry)) setLogs(prev => [...prev.filter(e => e.id !== msg.entry.id), msg.entry].slice(-500));
          else if (msg.type === "log-update" && isLog(msg.entry)) setLogs(prev => prev.map(e => e.id === msg.entry.id ? msg.entry : e));
        } catch { setConnectionError("An unreadable studio update was ignored. Retry to refresh the session state."); }
      };
    };
    connect();
    return () => {
      mounted.current = false; closed = true; request.current++;
      window.clearTimeout(retry);
      if (ws) { ws.onopen = null; ws.onclose = null; ws.onerror = null; ws.onmessage = null; ws.close(); }
    };
  }, [refresh]);
  return { settings, status, logs, socketOpen, connectionError, refresh, setSettings };
}
