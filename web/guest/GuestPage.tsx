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
  return { url, token, name: p.get("n") ?? "Guest" };
}

// 페이지를 열 때 한 번만 읽고, 토큰이 주소창·방문 기록에 남지 않게 지운다.
const INITIAL_INVITE = location.pathname.startsWith("/join") ? readInvite() : null;
if (INITIAL_INVITE) history.replaceState(null, "", location.pathname);

/** Guest 입장 페이지: 링크 클릭 → 마이크 허용 → 입장. 계정·설치 불필요. */
export function GuestPage() {
  const invite = INITIAL_INVITE;
  const [handle, setHandle] = useState<VoiceRoomHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
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

  if (!invite) return <div className="guest"><div className="guest-card"><h1>Invalid invitation</h1><p className="muted">Ask your host for a fresh invitation.</p></div></div>;

  const join = async (): Promise<void> => {
    if (!consent) return;
    setJoining(true);
    setError(null);
    try {
      setHandle(await joinVoiceRoom(invite.url, invite.token, () => {
        setHandle(null);
        setError("Disconnected. Please rejoin.");
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(/permission|denied|NotAllowed/i.test(msg) ? "Microphone permission is required. Allow it in your browser." : `Unable to join. Your invitation may have expired. (${msg})`);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="guest">
      <div className="guest-card">
        <span className={`onair ${handle ? "live" : ""}`}>{handle ? "CONNECTED" : "INVITED"}</span>
        <h1>Welcome, {invite.name}</h1>
        {!handle ? (
          <>
            <p>You are invited to a conversation with an AI co-host. Wear <b>headphones</b> before joining.</p>
            <p>Audio and transcripts may be recorded locally by the host. Audio is carried by LiveKit and sent to Meta for transcription and co-host decisions. Generated speech uses OpenAI TTS. Ask the host about retention and deletion. Joining does not grant permission to publish your voice or face.</p>
            <label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to recording and provider processing</label>
            <button className="btn primary big" disabled={joining || !consent} onClick={() => void join()}>{joining ? "Joining…" : "Enable microphone & join"}</button>
          </>
        ) : (
          <>
            <p className="muted">Connected. Make yourself comfortable and join the conversation.</p>
            <ul className="guest-people">
              {people.map((n) => <li key={n} className={speakers.includes(n) ? "active" : ""}>{n}</li>)}
            </ul>
            <div className="row">
              <button className="btn ghost" onClick={() => void handle.setMuted(!muted).then(() => setMuted(!muted))}>{muted ? "Unmute" : "Mute"}</button>
              <button className="btn stop" onClick={() => void handle.leave().then(() => setHandle(null))}>Leave</button>
            </div>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
