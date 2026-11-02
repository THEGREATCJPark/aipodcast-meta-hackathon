import { AudioFrame, type AudioSource } from "@livekit/rtc-node";
import { rmsDb } from "../audio/mixer.js";

/**
 * 모델이 보낸 PCM을 20ms 프레임으로 잘라 LiveKit AudioSource에 순서대로 넣는다.
 * flush()는 아직 재생하지 않은 음성을 즉시 버린다 (AI 정지).
 */
export class Playout {
  private queue: Int16Array[] = [];
  private pending = new Int16Array(0);
  private running = false;
  private generation = 0;
  private lastLoudAt = 0;

  constructor(
    private readonly source: AudioSource,
    private readonly sampleRate: number,
    private readonly frameMs = 20,
    private readonly onLoudFrame: () => void = () => undefined,
    /** 실제로 송출 큐에 넣은 프레임 (녹음용). flush로 버린 음성은 오지 않는다. */
    private readonly onSent: (frame: Int16Array) => void = () => undefined,
    private readonly onError: () => void = () => undefined,
  ) {}

  get active(): boolean { return this.running || this.queue.length > 0 || this.pending.length > 0 || this.speaking; }

  /** 최근 400ms 안에 소리가 나간 적이 있으면 말하는 중으로 본다. */
  get speaking(): boolean {
    return Date.now() - this.lastLoudAt < 400;
  }

  enqueue(pcm: Int16Array): void {
    // Limit queued PCM to 30 seconds; provider output is independently capped.
    if (this.queue.length * this.frameMs + pcm.length / this.sampleRate * 1000 > 30000) { this.flush(); return; }
    const frameSamples = (this.sampleRate * this.frameMs) / 1000;
    const joined = new Int16Array(this.pending.length + pcm.length);
    joined.set(this.pending);
    joined.set(pcm, this.pending.length);
    let offset = 0;
    const frames: Int16Array[] = [];
    while (joined.length - offset >= frameSamples) {
      frames.push(joined.slice(offset, offset + frameSamples));
      offset += frameSamples;
    }
    this.pending = joined.slice(offset);
    this.queue = [...this.queue, ...frames];
    if (!this.running) void this.drain();
  }

  flush(): void {
    this.generation += 1;
    this.queue = [];
    this.pending = new Int16Array(0);
    this.source.clearQueue();
    this.lastLoudAt = 0;
  }

  private async drain(): Promise<void> {
    this.running = true;
    const gen = this.generation;
    try {
      while (this.queue.length > 0 && gen === this.generation) {
        const [frame, ...rest] = this.queue;
        this.queue = rest;
        if (rmsDb(frame) > -50) {
          this.lastLoudAt = Date.now();
          this.onLoudFrame();
        }
        await this.source.captureFrame(new AudioFrame(frame, this.sampleRate, 1, frame.length));
        if (gen === this.generation) this.onSent(frame);
      }
    } catch {
      this.flush();
      this.onError();
    } finally {
      this.running = false;
      if (gen === this.generation && this.queue.length === 0 && this.pending.length > 0) {
        // 응답 끝의 20ms 미만 조각은 0으로 채워 내보낸다 (다음 응답 앞에 붙지 않게).
        const tail = new Int16Array((this.sampleRate * this.frameMs) / 1000);
        tail.set(this.pending);
        this.pending = new Int16Array(0);
        this.queue = [tail];
      }
      if (this.queue.length > 0) void this.drain();
    }
  }
}
