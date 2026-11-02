import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";

export interface VoiceRoomHandle {
  room: Room;
  setMuted: (muted: boolean) => Promise<void>;
  leave: () => Promise<void>;
}

/**
 * 브라우저에서 방에 들어가 마이크를 켜고, 다른 참가자(AI MC 포함)의 음성을 재생한다.
 * 브라우저의 에코 제거·잡음 억제를 켠다 (AI 음성이 마이크로 다시 들어가는 것을 줄임).
 */
export async function joinVoiceRoom(url: string, token: string, onDisconnected: () => void = () => undefined): Promise<VoiceRoomHandle> {
  const room = new Room({
    adaptiveStream: false,
    dynacast: false,
    audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const elements = new Map<string, HTMLMediaElement>();
  room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;
    const el = track.attach();
    el.style.display = "none";
    document.body.appendChild(el);
    elements.set(track.sid ?? String(elements.size), el);
  });
  room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    track.detach().forEach((el) => el.remove());
    if (track.sid) elements.delete(track.sid);
  });
  let leaving = false;
  room.on(RoomEvent.Disconnected, () => {
    elements.forEach((el) => el.remove());
    elements.clear();
    if (!leaving) onDisconnected();
  });
  try {
    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    await room.startAudio();
  } catch (err: unknown) {
    leaving = true;
    await room.disconnect().catch(() => undefined);
    elements.forEach(el => el.remove()); elements.clear();
    throw err;
  }
  return {
    room,
    setMuted: async (muted) => {
      await room.localParticipant.setMicrophoneEnabled(!muted);
    },
    leave: async () => {
      if (leaving) return;
      leaving = true;
      elements.forEach((el) => el.remove()); elements.clear();
      try { await room.disconnect(); } catch (error) { leaving = false; throw error; }
    },
  };
}
