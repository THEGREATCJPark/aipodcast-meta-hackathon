import { useEffect, useState } from "react";
import { RoomEvent, type Participant } from "livekit-client";
import { joinVoiceRoom, type VoiceRoomHandle } from "../lib/voice-room";

interface Invite {
  url: string;
  token: string;
  name: string;
}

function readInvite(): Invite | null {
  const p = new URLSearchParams(location.hash.slice(1));
  const url = p.get("u");
  const token = p.get("t");
  if (!url || !token || !/^wss?:\/\//.test(url)) return null;
  return { url, token, name: p.get("n") ?? "게스트" };
}

// 페이지를 열 때 한 번만 읽고, 토큰이 주소창·방문 기록에 남지 않게 지운다.
const INITIAL_INVITE = location.pathname.startsWith("/join") ? readInvite() : null;
if (INITIAL_INVITE) history.replaceState(null, "", location.pathname);

/** 게스트 입장 페이지: 링크 클릭 → 마이크 허용 → 입장. 계정·설치 불필요. */
export function GuestPage() {
  const invite = INITIAL_INVITE;
  const [handle, setHandle] = useState<VoiceRoomHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);

  useEffect(() => {
    if (!handle) return;
    const room = handle.room;
    const update = (): void => setPeople([...room.remoteParticipants.values()].map((p) => p.name ?? p.identity));
    const onSpeakers = (list: Participant[]): void => setSpeakers(list.map((p) => p.name ?? p.identity));
    update();
    room.on(RoomEvent.ParticipantConnected, update).on(RoomEvent.ParticipantDisconnected, update).on(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    return () => {
      room.off(RoomEvent.ParticipantConnected, update).off(RoomEvent.ParticipantDisconnected, update).off(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    };
  }, [handle]);

  if (!invite) return <div className="guest"><div className="guest-card"><h1>초대 링크가 올바르지 않습니다</h1><p className="muted">진행자에게 새 링크를 요청해 주세요.</p></div></div>;

  const join = async (): Promise<void> => {
    setJoining(true);
    setError(null);
    try {
      setHandle(await joinVoiceRoom(invite.url, invite.token, () => {
        setHandle(null);
        setError("연결이 끊어졌습니다. 다시 입장해 주세요.");
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(/permission|denied|NotAllowed/i.test(msg) ? "마이크 권한이 필요합니다. 주소창의 마이크 아이콘에서 허용해 주세요." : `입장하지 못했습니다. 링크가 만료됐을 수 있습니다. (${msg})`);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="guest">
      <div className="guest-card">
        <span className={`onair ${handle ? "live" : ""}`}>ON AIR</span>
        <h1>{invite.name}님, 환영합니다</h1>
        {!handle ? (
          <>
            <p>AI MC가 진행하는 팟캐스트 녹음에 초대되었습니다. <b>이어폰이나 헤드셋</b>을 착용한 뒤 입장해 주세요.</p>
            <button className="btn primary big" disabled={joining} onClick={() => void join()}>{joining ? "입장 중…" : "마이크 허용하고 입장"}</button>
          </>
        ) : (
          <>
            <p className="muted">연결되었습니다. 편하게 대화하시면 됩니다.</p>
            <ul className="guest-people">
              {people.map((n) => <li key={n} className={speakers.includes(n) ? "active" : ""}>{n}</li>)}
            </ul>
            <div className="row">
              <button className="btn ghost" onClick={() => void handle.setMuted(!muted).then(() => setMuted(!muted))}>{muted ? "음소거 해제" : "음소거"}</button>
              <button className="btn stop" onClick={() => void handle.leave().then(() => setHandle(null))}>나가기</button>
            </div>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
