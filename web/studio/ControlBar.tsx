import { useState } from "react";
import type { ControlCommand, StudioStatus } from "../../shared/events";
import { api } from "../lib/api";

interface ControlBarProps {
  status: StudioStatus;
  onError: (msg: string) => void;
}

/** 방송 중 CJ가 쓰는 버튼: 넘기기 · 정지/재개 · 진행 지시 */
export function ControlBar({ status, onError }: ControlBarProps) {
  const [note, setNote] = useState("");
  const [speak, setSpeak] = useState(false);
  const live = status.sessionActive;
  const held = status.mcState === "held";

  const send = async (cmd: ControlCommand): Promise<boolean> => {
    try {
      await api("/api/control", { method: "POST", body: cmd });
      return true;
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "제어 실패");
      return false;
    }
  };

  return (
    <div className="controls">
      <div className="control-buttons">
        <button className="btn handoff" disabled={!live} onClick={() => void send({ action: "handoff" })} title="단축키 Space (입력창 밖)">
          Handoff · MC에게 넘기기
        </button>
        {held ? (
          <button className="btn resume" disabled={!live} onClick={() => void send({ action: "resume" })}>Resume listening · 듣기 재개</button>
        ) : (
          <button className="btn stop" disabled={!live} onClick={() => void send({ action: "hold" })} title="단축키 Esc">HOLD · AI 즉시 정지</button>
        )}
      </div>
      <form
        className="note"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          void send({ action: "note", text: note, speak }).then((ok) => ok && setNote(""));
        }}
      >
        <input disabled={!live} value={note} onChange={(e) => setNote(e.target.value)} placeholder="MC에게 귓속말 (예: 다음엔 일자리 이야기로 넘어가 주세요)" />
        <label className="toggle small">
          <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} />
          <span>바로 말하게</span>
        </label>
        <button className="btn ghost" disabled={!live || !note.trim()}>보내기</button>
      </form>
    </div>
  );
}
