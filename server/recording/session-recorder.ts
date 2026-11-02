import { join } from "node:path";
import { WavTrack, mixWavFiles } from "./wav-track.js";

export interface RecordedTrack {
  file: string;
  label: string;
  seconds: number;
}

const safeFile = (s: string): string => s.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "track";

/**
 * 한 세션의 오디오를 사람별 트랙 + MC 트랙으로 기록하고, 종료 시 전체 믹스를 만든다.
 * 모든 트랙은 세션 시작(start 호출) 시각을 0으로 하는 같은 시간축을 쓴다.
 */
export class SessionRecorder {
  private readonly tracks = new Map<string, { track: WavTrack; label: string }>();
  private readonly startedAt = performance.now();
  private stopped = false;

  constructor(private readonly dir: string, private readonly sampleRate: number) {}

  private elapsedMs(): number {
    return performance.now() - this.startedAt;
  }

  /** 사람 음성 (참가자 identity별 트랙) */
  human(identity: string, name: string, pcm: Int16Array): void {
    this.write(`human:${identity}`, `${name}`, `guest-${safeFile(name)}-${identity.slice(-4)}.wav`, pcm);
  }

  /** 실제로 방에 송출한 MC 음성 */
  mc(pcm: Int16Array): void {
    this.write("mc", "AI MC", "mc.wav", pcm);
  }

  /** 모든 트랙을 같은 길이로 맞추고 닫은 뒤 mix.wav를 만든다. */
  stop(): RecordedTrack[] {
    if (this.stopped) return [];
    this.stopped = true;
    const total = Math.round((this.elapsedMs() * this.sampleRate) / 1000);
    const out: RecordedTrack[] = [];
    for (const { track, label } of this.tracks.values()) {
      track.padTo(total);
      track.finalize();
      out.push({ file: track.path, label, seconds: track.samples / this.sampleRate });
    }
    if (out.length > 0) {
      const mixPath = join(this.dir, "mix.wav");
      const samples = mixWavFiles(out.map((t) => t.file), mixPath, this.sampleRate);
      out.push({ file: mixPath, label: "Session mix", seconds: samples / this.sampleRate });
    }
    return out;
  }

  private write(key: string, label: string, fileName: string, pcm: Int16Array): void {
    if (this.stopped) return;
    let entry = this.tracks.get(key);
    if (!entry) {
      // 사람 트랙 파일 이름이 실제 이름과 맞도록 첫 프레임 때 만든다.
      const name = key === "mc" ? fileName : fileName.replace(/^guest-/, key.startsWith("human:host") ? "host-" : "guest-");
      entry = { track: new WavTrack(join(this.dir, name), this.sampleRate), label };
      this.tracks.set(key, entry);
    }
    entry.track.writeAt(pcm, this.elapsedMs());
  }
}
