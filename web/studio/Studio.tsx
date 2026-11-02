import { useEffect, useRef, useState } from "react";
import type { McState, StudioStatus } from "../../shared/events";
import { api } from "../lib/api";
import { joinVoiceRoom, type VoiceRoomHandle } from "../lib/voice-room";
import { ENGINE_LABEL } from "../../shared/settings";
import { openFolder } from "../lib/folders";
import { ComparePanel } from "./ComparePanel";
import { ControlBar } from "./ControlBar";
import { LogPanel } from "./LogPanel";
import { SettingsPanel } from "./SettingsPanel";
import { useStudio } from "./useStudio";

const MC_LABEL: Record<McState, string> = {
  offline: "대기", connecting: "연결 중", listening: "듣는 중", speaking: "말하는 중", held: "정지됨", error: "오류",
};

export function Studio() {
  const { settings, status, logs, socketOpen, setSettings, refresh } = useStudio();
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mic, setMic] = useState<VoiceRoomHandle | null>(null);
  const [muted, setMuted] = useState(false);
  const [invite, setInvite] = useState<{ link: string; local: boolean } | null>(null);
  const [guestName, setGuestName] = useState("");
  const errTimer = useRef<number | undefined>(undefined);

  const fail = (msg: string): void => {
    setError(msg);
    window.clearTimeout(errTimer.current);
    errTimer.current = window.setTimeout(() => setError(null), 8000);
  };

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    try {
      await fn();
    } catch (e: unknown) {
      fail(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  };

  useStudioShortcuts(status);
  useEffect(() => () => void mic?.leave(), [mic]);

  if (!settings || !status) return <div className="boot">스튜디오 서버에 연결하는 중…</div>;

  const connectMic = (): Promise<void> =>
    run(async () => {
      const { url, token } = await api<{ url: string; token: string }>("/api/host-token", { method: "POST", body: {} });
      setMic(await joinVoiceRoom(url, token, () => {
        setMic(null);
        fail("마이크 연결이 끊어졌습니다. 다시 연결해 주세요.");
      }));
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
          <h1>Meta Conversation Co-host</h1>
          {status.recording && <span className="rec" title="세션 종료 시 output 폴더에 정리됩니다">● REC <Elapsed sessionId={status.sessionId} /></span>}
        </div>
        <div className="badges">
          <Badge ok={socketOpen} label="서버" />
          <Badge ok={status.livekitConfigured} label="LiveKit" />
          <Badge ok={status.metaConfigured} label="Meta key configured" />
          <Badge ok={status.openaiConfigured} label="OpenAI TTS key" />
          <Badge ok={status.geminiConfigured} label="Gemini" />
          <Badge ok={Boolean(mic)} label="내 마이크" />
        </div>
        <div className="top-actions">
          <button className="btn ghost" onClick={() => setDemo(!demo)}>{demo ? "Studio controls" : "Judge view"}</button>
          {mic ? (
            <>
              <button className="btn ghost" onClick={() => void mic.setMuted(!muted).then(() => setMuted(!muted))}>{muted ? "음소거 해제" : "음소거"}</button>
              <button className="btn ghost" onClick={() => void mic.leave().then(() => setMic(null))}>마이크 연결 끊기</button>
            </>
          ) : (
            <button className="btn ghost" disabled={busy || !status.livekitConfigured || !consent} onClick={() => void connectMic()}>마이크 연결</button>
          )}
          <button className={`btn ${status.sessionActive ? "stop" : "primary"}`} disabled={busy || (!status.sessionActive && (!status.livekitConfigured || !engineReady || !consent))} onClick={() => void toggleSession()}>
            {status.sessionActive ? "세션 종료" : `세션 시작 · ${ENGINE_LABEL[settings.engine]}`}
          </button>
        </div>
      </header>

      {error && <div className="toast" role="alert">{error}</div>}

      <div className="cohost-notice">
        <strong>{status.sessionActive ? "LIVE SESSION" : "LOCAL LIVE SETUP"}</strong> · New microphone input uses actual providers when connected. This is not replay or a synthetic demo.
        {status.providerModels && <p>ASR: {status.providerModels.asr} · Director: {status.providerModels.director} · TTS: OpenAI {status.providerModels.tts} / {status.providerModels.voice}</p>}
        <p>Human-controlled co-host · Meta speech recognition and decisions · OpenAI speech synthesis. Key badges indicate configuration, not successful model access.</p>
        {!status.sessionActive && <label><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to local recording and transmission to LiveKit, Meta and the selected speech provider. Publication needs separate permission.</label>}
      </div>
      <main className={`stage ${demo ? "judge-view" : ""}`}>
        <section className="room">
          <div className="people">
            <PersonTile
              name="Meta Co-host"
              state={status.engine ? `${status.engine === "meta" ? status.metaState ?? MC_LABEL[status.mcState] : MC_LABEL[status.mcState]} · ${ENGINE_LABEL[status.engine]}${status.persona ? ` · ${status.persona}` : ""}` : MC_LABEL[status.mcState]}
              active={status.mcState === "speaking"}
              accent
            />
            {status.participants.map((p) => (
              <PersonTile key={p.identity} name={p.name} state={p.speaking ? "말하는 중" : `${p.levelDb} dB`} active={p.speaking} level={p.levelDb} />
            ))}
            <div className="invite">
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="게스트 이름" maxLength={40} />
              <button className="btn ghost" disabled={busy || !guestName.trim() || !status.livekitConfigured} onClick={() => void createInvite()}>초대 링크</button>
            </div>
          </div>
          {invite && (
            <div className="invite-result">
              <code>{invite.link}</code>
              <button className="btn ghost" onClick={() => void navigator.clipboard.writeText(invite.link)}>복사</button>
              {invite.local && <span className="muted">로컬 주소입니다. 외부 게스트용은 GUEST_PAGE_URL 설정 후 발급하세요.</span>}
              <button className="btn ghost" onClick={() => setInvite(null)}>닫기</button>
            </div>
          )}
          {!status.sessionActive && status.lastOutputDir && (
            <div className="saved">
              <span>지난 세션을 저장했습니다: <code>{status.lastOutputDir}</code> (대화록·리포트·오디오·사용량)</span>
              <button className="btn ghost" onClick={() => void openFolder(status.lastOutputDir!, fail)}>폴더 열기</button>
            </div>
          )}
          <Metrics status={status} selectedEngine={settings.engine} />
          {!demo && <ComparePanel refreshKey={`${status.sessionActive}-${status.sessionId ?? ""}`} />}
          <LogPanel logs={logs} />
          <ControlBar status={status} onError={fail} />
        </section>
        {!demo && <SettingsPanel settings={settings} locked={status.sessionActive} activeEngine={status.engine} onSaved={setSettings} onError={fail} />}
      </main>
    </div>
  );
}

function useStudioShortcuts(status: StudioStatus | null): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!status?.sessionActive || e.repeat) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable) return;
      const action = e.key === "Escape" ? "hold" : e.code === "Space" ? "handoff" : null;
      if (!action) return;
      e.preventDefault();
      void api("/api/control", { method: "POST", body: { action } }).catch(() => undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status?.sessionActive]);
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
  const extra = status.engine === "gemini-live" ? "검색 별도" : "백엔드 별도";
  return (
    <div className="metrics">
      <span>응답 지연 <b>{status.lastLatencyMs ?? "–"}</b> ms</span>
      <span>중앙값 <b>{status.latencyMedianMs ?? "–"}</b> ms</span>
      <span>사용 <b>{Math.round(status.usageSeconds)}</b>초 · 추정 <b>${status.costUsd.toFixed(3)}</b> ({extra})</span>
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
