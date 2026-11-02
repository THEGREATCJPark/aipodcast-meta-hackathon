import { useState } from "react";
import type { ControlCommand, StudioStatus } from "../../shared/events";
import { api } from "../lib/api";

interface ControlBarProps {
  status: StudioStatus;
  selectedEngine: string;
  researchEnabled?: boolean;
  onError: (msg: string) => void;
}

/** 방송 중 CJ가 쓰는 버튼: 넘기기 · 정지/재개 · Host direction */
export function ControlBar({ status, selectedEngine, researchEnabled, onError }: ControlBarProps) {
  const [note, setNote] = useState("");
  const [speak, setSpeak] = useState(false);
  const live = status.sessionActive;
  const meta = (status.engine ?? selectedEngine) === "meta";
  const held = status.mcState === "held";

  const send = async (cmd: ControlCommand): Promise<boolean> => {
    try {
      await api("/api/control", { method: "POST", body: cmd });
      return true;
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Control failed");
      return false;
    }
  };

  return (
    <div className="controls">
      <div className="control-buttons">
        <button className="btn handoff" disabled={!live} onClick={() => void send({ action: "handoff" })} title="Space outside text fields">
          Handoff · Ask the co-host
        </button>
        {held ? (
          <button className="btn resume" disabled={!live} onClick={() => void send({ action: "resume" })}>Resume listening</button>
        ) : (
          <button className="btn stop" disabled={!live} onClick={() => void send({ action: "hold" })} title="Escape">HOLD · Stop AI</button>
        )}
      </div>
      {meta && <p className="control-hint">Space: handoff · Esc: hold. {researchEnabled ? "Explicit lookup requests may release a researched answer." : "Humans keep the floor until you hand it over."}</p>}
      {!meta && <form
        className="note"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          void send({ action: "note", text: note, speak }).then((ok) => ok && setNote(""));
        }}
      >
        <input disabled={!live} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private direction for the co-host" />
        <label className="toggle small">
          <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} />
          <span>Speak now</span>
        </label>
        <button className="btn ghost" disabled={!live || !note.trim()}>Send</button>
      </form>}
    </div>
  );
}
