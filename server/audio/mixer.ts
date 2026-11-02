/**
 * 여러 참가자의 PCM16 모노 입력을 한 개의 연속 스트림으로 섞는다.
 * GPT-Live는 침묵을 포함해 끊김 없는 입력을 요구하므로, 입력이 없는 참가자는 0으로 채운다.
 * 참가자별 버퍼가 maxBufferMs를 넘으면 오래된 샘플을 버려 지연이 쌓이지 않게 한다.
 */
export interface MixerOptions {
  sampleRate: number;
  chunkMs: number;
  maxBufferMs: number;
  /** 참가자별로 이만큼 쌓인 뒤 섞기 시작한다 (네트워크 흔들림 흡수). 0이면 바로 섞는다. */
  prebufferMs?: number;
}

export class PcmMixer {
  private readonly buffers = new Map<string, Int16Array[]>();
  private readonly lengths = new Map<string, number>();
  private readonly primed = new Set<string>();
  readonly chunkSamples: number;
  private readonly maxSamples: number;
  private readonly prebufferSamples: number;

  constructor(private readonly opts: MixerOptions) {
    this.chunkSamples = Math.round((opts.sampleRate * opts.chunkMs) / 1000);
    this.maxSamples = Math.round((opts.sampleRate * opts.maxBufferMs) / 1000);
    this.prebufferSamples = Math.round((opts.sampleRate * (opts.prebufferMs ?? 0)) / 1000);
  }

  push(sourceId: string, samples: Int16Array): void {
    const list = this.buffers.get(sourceId) ?? [];
    list.push(samples);
    this.buffers.set(sourceId, list);
    this.lengths.set(sourceId, (this.lengths.get(sourceId) ?? 0) + samples.length);
    this.trim(sourceId);
  }

  remove(sourceId: string): void {
    this.buffers.delete(sourceId);
    this.lengths.delete(sourceId);
    this.primed.delete(sourceId);
  }

  clear(): void {
    for (const id of [...this.buffers.keys()]) this.remove(id);
  }

  bufferedSamples(sourceId: string): number {
    return this.lengths.get(sourceId) ?? 0;
  }

  /** 다음 chunk를 꺼낸다. 입력이 모자란 참가자는 침묵으로 처리한다. */
  pull(): Int16Array {
    const acc = new Int32Array(this.chunkSamples);
    for (const id of this.buffers.keys()) {
      const buffered = this.lengths.get(id) ?? 0;
      if (this.prebufferSamples > 0) {
        if (!this.primed.has(id)) {
          if (buffered < this.prebufferSamples) continue;
          this.primed.add(id);
        }
        // 버퍼가 바닥나면 다시 쌓일 때까지 기다린다 (말 중간에 구멍이 반복되는 것을 줄임).
        if (buffered < this.chunkSamples) this.primed.delete(id);
      }
      const taken = this.take(id, this.chunkSamples);
      for (let i = 0; i < taken.length; i++) acc[i] += taken[i];
    }
    const out = new Int16Array(this.chunkSamples);
    for (let i = 0; i < acc.length; i++) out[i] = Math.max(-32768, Math.min(32767, acc[i]));
    return out;
  }

  private trim(id: string): void {
    const excess = (this.lengths.get(id) ?? 0) - this.maxSamples;
    if (excess > 0) this.take(id, excess);
  }

  private take(id: string, count: number): Int16Array {
    const list = this.buffers.get(id) ?? [];
    const out = new Int16Array(count);
    let filled = 0;
    while (filled < count && list.length > 0) {
      const head = list[0];
      const n = Math.min(head.length, count - filled);
      out.set(head.subarray(0, n), filled);
      filled += n;
      if (n === head.length) list.shift();
      else list[0] = head.subarray(n);
    }
    this.lengths.set(id, Math.max(0, (this.lengths.get(id) ?? 0) - filled));
    return filled === count ? out : out.subarray(0, filled);
  }
}

/** PCM16 구간의 RMS를 dBFS로 계산한다. 무음은 -100. */
export function rmsDb(samples: Int16Array): number {
  if (samples.length === 0) return -100;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length) / 32768;
  return rms <= 0 ? -100 : Math.max(-100, 20 * Math.log10(rms));
}

export const pcmToBase64 = (pcm: Int16Array): string =>
  Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).toString("base64");

export function base64ToPcm(b64: string): Int16Array {
  const buf = Buffer.from(b64, "base64");
  const copy = new Uint8Array(buf.length - (buf.length % 2));
  copy.set(buf.subarray(0, copy.length));
  return new Int16Array(copy.buffer);
}
