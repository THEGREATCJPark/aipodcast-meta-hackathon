/**
 * 참가자 한 명의 음량 기반 발화 감지기.
 * 임계값을 startMs 이상 넘으면 발화 시작, endMs 이상 밑돌면 발화 종료로 판정한다 (hysteresis).
 * 시간은 호출자가 넘기는 스트림 시각(ms)을 기준으로 한다.
 */
export interface VadOptions {
  thresholdDb: number;
  startMs: number;
  endMs: number;
}

export type VadEvent = { type: "start" | "end"; atMs: number };

export class EnergyVad {
  private speaking = false;
  private aboveSince: number | null = null;
  private belowSince: number | null = null;
  private lastVoiceMs = 0;

  constructor(private opts: VadOptions) {}

  setThreshold(db: number): void {
    this.opts = { ...this.opts, thresholdDb: db };
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  /** frameDb: 이 프레임의 dBFS, atMs: 프레임 시작 시각, frameMs: 프레임 길이 */
  process(frameDb: number, atMs: number, frameMs: number): VadEvent | null {
    const loud = frameDb >= this.opts.thresholdDb;
    if (loud) {
      this.belowSince = null;
      this.lastVoiceMs = atMs + frameMs;
      this.aboveSince ??= atMs;
      if (!this.speaking && atMs + frameMs - this.aboveSince >= this.opts.startMs) {
        this.speaking = true;
        return { type: "start", atMs: this.aboveSince };
      }
      return null;
    }
    this.aboveSince = null;
    if (!this.speaking) return null;
    this.belowSince ??= atMs;
    if (atMs + frameMs - this.belowSince >= this.opts.endMs) {
      this.speaking = false;
      this.belowSince = null;
      return { type: "end", atMs: this.lastVoiceMs };
    }
    return null;
  }
}
