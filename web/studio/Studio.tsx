import { useEffect, useRef, useState } from "react";
import type { McState, StudioStatus } from "../../shared/events";
import { api } from "../lib/api";
import { joinVoiceRoom, type VoiceRoomHandle } from "../lib/voice-room";
import { ENGINE_LABEL } from "../../shared/settings";
import { openFolder } from "../lib/folders";
import { CapturePanel } from "./CapturePanel";
import { ComparePanel } from "./ComparePanel";
import { ControlBar } from "./ControlBar";
import { JudgeSummary } from "./JudgeSummary";
import { LogPanel } from "./LogPanel";
import { SettingsPanel } from "./SettingsPanel";
import { useStudio } from "./useStudio";

const MC_LABEL: Record<McState, string> = {
  offline: "Idle", connecting: "Connecting", listening: "Listening", speaking: "Speaking", held: "Held", error: "Error",
};

export function Studio() {
  const { settings, status, logs, socketOpen, connectionError, setSettings, refresh } = useStudio();
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(() => new URLSearchParams(window.location.search).get("view") !== "studio");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mic, setMic] = useState<VoiceRoomHandle | null>(null);
  const [muted, setMuted] = useState(false);
  const [invite, setInvite] = useState<{ link: string; local: boolean } | null>(null);
  const [guestName, setGuestName] = useState("");
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const errTimer = useRef<number | undefined>(undefined);

  const fail = (msg: string): void => {
    setError(msg);
    window.clearTimeout(errTimer.current);
    errTimer.current = window.setTimeout(() => setError(null), 8000);
  };

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e: unknown) {
      fail(e instanceof Error ? e.message : "Failed");
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  useStudioShortcuts(status, socketOpen, fail);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; window.clearTimeout(errTimer.current); }; }, []);
  useEffect(() => () => { void mic?.leave().catch(() => undefined); }, [mic]);

  if (!settings || !status) return <div className="boot"><div><p role={connectionError ? "alert" : undefined}>{connectionError ?? "Connecting to the studio…"}</p>{connectionError && <button className="btn" onClick={() => void refresh().catch(() => undefined)}>Retry connection</button>}</div></div>;

  const connectMic = (): Promise<void> =>
    run(async () => {
      const { url, token } = await api<{ url: string; token: string }>("/api/host-token", { method: "POST", body: {} });
      const joined = await joinVoiceRoom(url, token, () => {
        setMic(null);
        fail("Microphone disconnected. Please reconnect.");
      });
      if (!mounted.current) { await joined.leave(); return; }
      setMuted(false); setMic(joined);
    });

  const toggleSession = (): Promise<void> =>
    run(async () => {
      await api(status.sessionActive ? "/api/session/stop" : "/api/session/start", { method: "POST", body: {} });
      await refresh();
    });

  const engineReady = settings.engine === "meta" ? status.metaConfigured && status.openaiConfigured : settings.engine === "gemini-live" ? status.geminiConfigured : status.openaiConfigured;

  const createInvite = (): Promise<void> =>
    run(async () => {
      const r = await api<{ link: string; local: boolean }>("/api/invites", { method: "POST", body: { name: guestName.trim(), ttlHours: 1 } });
      setInvite(r);
    });

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <span className={`onair ${status.sessionActive ? "live" : ""}`}>{status.sessionActive ? "ON AIR" : "IDLE"}</span>
          <h1>AI MC <span>/ Studio</span></h1>
          {status.recording && <span className="rec" title="Saved locally when the session ends">● REC <Elapsed key={status.sessionId} sessionId={status.sessionId} /></span>}
        </div>
        <div className="top-actions">
          <button className="btn ghost" onClick={() => setDemo(!demo)}>{demo ? "Settings & tools" : "Back to conversation"}</button>
          {mic ? (
            <>
              <button className="btn ghost" disabled={busy} onClick={() => void run(async () => { await mic.setMuted(!muted); setMuted(!muted); })}>{muted ? "Unmute" : "Mute"}</button>
              <button className="btn ghost" disabled={busy} onClick={() => void run(async () => { await mic.leave(); setMic(null); setMuted(false); })}>Disconnect mic</button>
            </>
          ) : (
            <button className="btn ghost" disabled={busy || !socketOpen || !status.livekitConfigured || !consent} onClick={() => void connectMic()}>Connect mic</button>
          )}
          <button className={`btn ${status.sessionActive ? "stop" : "primary"}`} disabled={busy || !socketOpen || (!status.sessionActive && (!status.livekitConfigured || !engineReady || !consent))} onClick={() => void toggleSession()}>
            {status.sessionActive ? "End session" : `Start session · ${ENGINE_LABEL[settings.engine]}`}
          </button>
        </div>
      </header>

      {connectionError && <div className="connection-warning" role="alert">{connectionError} <button className="btn tiny" onClick={() => void refresh().catch(() => undefined)}>Refresh state</button></div>}
      {error && <div className="toast" role="alert">{error}</div>}

      <details className="setup-details"><summary>{consent ? "Connection & recording details" : "Before you start · review recording consent"}</summary>        <div className="badges">
          <Badge ok={socketOpen} label="Studio" />
          <Badge ok={status.livekitConfigured} label="LiveKit" />
          <Badge ok={status.metaConfigured} label="Meta key" />
          <Badge ok={status.openaiConfigured} label="OpenAI TTS" />
          {settings.engine !== "meta" && <Badge ok={status.geminiConfigured} label="Gemini" />}
          <Badge ok={Boolean(mic)} label="Microphone" />
        </div>
<div className="cohost-notice">
        <strong>{status.sessionActive ? "LIVE SESSION" : "LOCAL LIVE SETUP"}</strong> · Connected input uses real providers. Participant labels identify synthetic test sources; recordings are not live human trials.
        {status.providerModels && <p>ASR: {status.providerModels.asr} · Director: {status.providerModels.director} · TTS: OpenAI {status.providerModels.tts} / {status.providerModels.voice}</p>}
        <p>Human-controlled co-host · Meta speech recognition and decisions · OpenAI speech synthesis. Key badges indicate configuration, not successful model access.</p>
        {settings.engine === "meta" && <p className="research-mode"><strong>Research PD: {settings.researchEnabled ? "ON" : "OFF"}</strong> · {settings.researchEnabled ? "Explicit spoken lookup requests can trigger a researched, spoken answer. HOLD cancels it." : "Web research is disabled. Use Handoff for ordinary co-host questions."}</p>}
        {(!status.sessionActive || !mic) && <label><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to local recording and transmission to LiveKit, Meta and the selected speech provider. Publication needs separate permission.</label>}
      </div></details>
      <div className="lounge-heading"><div><span>Podcast studio / {demo ? "Conversation" : "Production"}</span><h2>{demo ? "Keep talking." : "Set the room."}</h2><p>{demo ? "Your conversation. A producer on call." : "Session settings, guests and execution records."}</p></div><div className="desk-status"><i className={status.mcState === "speaking" ? "is-speaking" : ""} /><span>CO-HOST<strong>{MC_LABEL[status.mcState]}</strong></span></div></div>
      <main className={`stage ${demo ? "judge-view" : ""}`}>
        <section className="room">
          {demo ? <JudgeSummary logs={logs} status={status} /> : <><div className="people">
            <PersonTile
              name="Co-host"
              state={status.engine ? `${status.engine === "meta" ? status.metaState ?? MC_LABEL[status.mcState] : MC_LABEL[status.mcState]} · ${ENGINE_LABEL[status.engine]}${status.persona ? ` · ${status.persona}` : ""}` : MC_LABEL[status.mcState]}
              active={status.mcState === "speaking"}
              accent
            />
            {status.participants.map((p) => (
              <PersonTile key={p.identity} name={p.name} state={p.speaking ? "Speaking" : `${p.levelDb} dB`} active={p.speaking} level={p.levelDb} />
            ))}
            {!demo && <div className="invite">
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" maxLength={40} />
              <button className="btn ghost" disabled={busy || !socketOpen || !guestName.trim() || !status.livekitConfigured} onClick={() => void createInvite()}>Invite link</button>
            </div>}
          </div>
          {invite && !demo && (
            <div className="invite-result">
              <code>{invite.link}</code>
              <button className="btn ghost" onClick={() => void run(async () => { if (!navigator.clipboard) throw new Error("Clipboard unavailable. Copy the invitation text manually."); await navigator.clipboard.writeText(invite.link); })}>Copy</button>
              {invite.local && <span className="muted">Local-only link. Remote guests need a separately hosted guest page.</span>}
              <button className="btn ghost" onClick={() => setInvite(null)}>Close</button>
            </div>
          )}
          {!status.sessionActive && status.lastOutputDir && (
            <div className="saved">
              <span>Session saved: <code>{status.lastOutputDir}</code> (transcript, report and audio)</span>
              <button className="btn ghost" onClick={() => void openFolder(status.lastOutputDir!, fail)}>Open folder</button>
            </div>
          )}
          <Metrics status={status} selectedEngine={settings.engine} />
          <div hidden={demo}><CapturePanel mic={mic} /></div>
          {!demo && <ComparePanel refreshKey={`${status.sessionActive}-${status.sessionId ?? ""}`} />}
          <LogPanel logs={logs} /></>}
          {demo && <details className="judge-logs"><summary>Execution details · full transcript and timing</summary><Metrics status={status} selectedEngine={settings.engine} /><LogPanel logs={logs} /></details>}
          <ControlBar status={status} selectedEngine={settings.engine} researchEnabled={settings.researchEnabled} available={socketOpen} onError={fail} />
        </section>
        {!demo && <SettingsPanel settings={settings} locked={status.sessionActive} activeEngine={status.engine} onSaved={setSettings} onError={fail} />}
      </main>
    </div>
  );
}

function useStudioShortcuts(status: StudioStatus | null, available: boolean, onError: (message: string) => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!status?.sessionActive || !available || e.repeat) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable) return;
      const action = e.key === "Escape" ? "hold" : e.code === "Space" ? "handoff" : null;
      if (!action) return;
      e.preventDefault();
      void api("/api/control", { method: "POST", body: { action } }).catch(() => onError("Control request failed. Check the studio connection."));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status?.sessionActive, available, onError]);
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`badge ${ok ? "ok" : "off"}`}>{label}</span>;
}

function PersonTile({ name, state, active, accent, level }: { name: string; state: string; active: boolean; accent?: boolean; level?: number }) {
  const pct = level === undefined ? 0 : Math.max(0, Math.min(100, ((level + 70) / 50) * 100));
  return (
    <div className={`person ${active ? "active" : ""} ${accent ? "mc" : ""}`}>
      <div className="avatar">{name.slice(0, 2)}</div>
      <div className="person-meta">
        <strong>{name}</strong>
        <span>{state}</span>
        {level !== undefined && <div className="meter"><i style={{ width: `${pct}%` }} /></div>}
      </div>
    </div>
  );
}

function Metrics({ status, selectedEngine }: { status: StudioStatus; selectedEngine: string }) {
  if ((status.engine ?? selectedEngine) === "meta") return <div className="metrics"><span>Timing: turn end / handoff → server first audio <b>{status.lastLatencyMs ?? "–"}</b> ms</span><span>Listener latency not measured · Cost not measured / provider limits only</span></div>;
  const extra = status.engine === "gemini-live" ? "search excluded" : "backend excluded";
  return (
    <div className="metrics">
      <span>Response timing <b>{status.lastLatencyMs ?? "–"}</b> ms</span>
      <span>Median <b>{status.latencyMedianMs ?? "–"}</b> ms</span>
      <span>Usage <b>{Math.round(status.usageSeconds)}</b>s · estimated <b>${status.costUsd.toFixed(3)}</b> ({extra})</span>
    </div>
  );
}

/** 녹음 경과 시간 (세션이 바뀌면 0부터) */
function Elapsed({ sessionId }: { sessionId: string | null }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.floor((now - start) / 1000);
  return <b key={sessionId ?? ""}>{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</b>;
}
