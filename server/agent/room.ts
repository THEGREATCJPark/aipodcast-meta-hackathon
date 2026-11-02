import { EventEmitter } from "node:events";
import {
  type AudioFrame, AudioSource, AudioStream, LocalAudioTrack, Room, RoomEvent, TrackKind, TrackPublishOptions, TrackSource,
  type RemoteParticipant, type RemoteTrack,
} from "@livekit/rtc-node";

export const ROOM_SAMPLE_RATE = 24000;
export const FRAME_MS = 20;

export interface RoomFrame {
  identity: string;
  name: string;
  pcm: Int16Array;
}

interface AgentRoomEvents {
  frame: [RoomFrame];
  participantJoined: [identity: string, name: string];
  participantLeft: [identity: string];
  disconnected: [reason: string];
}

/** AI MC가 LiveKit 방에 참가자로 들어가 사람들의 음성을 받고 자기 음성을 내보낸다. */
export class AgentRoom extends EventEmitter<AgentRoomEvents> {
  private room: Room | null = null;
  readonly source = new AudioSource(ROOM_SAMPLE_RATE, 1, 200);
  private readonly streams = new Map<string, ReadableStreamDefaultReader<AudioFrame>>();

  get connected(): boolean {
    return this.room !== null;
  }

  async join(url: string, token: string): Promise<void> {
    const room = new Room();
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => this.onTrack(track, participant));
    room.on(RoomEvent.TrackUnsubscribed, (_track, _pub, participant) => this.dropStream(participant.identity));
    room.on(RoomEvent.ParticipantConnected, (p) => this.emit("participantJoined", p.identity, p.name ?? p.identity));
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      this.dropStream(p.identity);
      this.emit("participantLeft", p.identity);
    });
    room.on(RoomEvent.Disconnected, (reason) => {
      // leave()로 직접 나간 경우는 이미 this.room이 비어 있으므로 장애로 알리지 않는다.
      if (this.room !== room) return;
      this.room = null;
      this.emit("disconnected", String(reason));
    });
    await room.connect(url, token, { autoSubscribe: true, dynacast: false });
    this.room = room;
    const track = LocalAudioTrack.createAudioTrack("ai-mc-voice", this.source);
    await room.localParticipant?.publishTrack(track, new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }));
    for (const p of room.remoteParticipants.values()) this.emit("participantJoined", p.identity, p.name ?? p.identity);
  }

  async leave(): Promise<void> {
    for (const id of [...this.streams.keys()]) this.dropStream(id);
    const room = this.room;
    this.room = null;
    await room?.disconnect();
  }

  private onTrack(track: RemoteTrack, participant: RemoteParticipant): void {
    if (track.kind !== TrackKind.KIND_AUDIO) return;
    const identity = participant.identity;
    this.dropStream(identity);
    const stream = new AudioStream(track, { sampleRate: ROOM_SAMPLE_RATE, numChannels: 1, frameSizeMs: FRAME_MS });
    const reader = stream.getReader();
    this.streams.set(identity, reader);
    void this.readStream(reader, identity, participant.name ?? identity);
  }

  private async readStream(reader: ReadableStreamDefaultReader<AudioFrame>, identity: string, name: string): Promise<void> {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done || this.streams.get(identity) !== reader) break;
        this.emit("frame", { identity, name, pcm: value.data });
      }
    } catch {
      // 트랙이 끊기면 스트림이 종료된다. 재구독 시 새 스트림이 만들어진다.
    }
  }

  private dropStream(identity: string): void {
    const reader = this.streams.get(identity);
    this.streams.delete(identity);
    if (reader) void reader.cancel().catch(() => undefined);
  }
}
