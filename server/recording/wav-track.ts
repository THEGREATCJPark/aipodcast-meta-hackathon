import { closeSync, openSync, readSync, writeSync } from "node:fs";

const HEADER_BYTES = 44;

/** PCM16 모노 WAV 헤더 */
export function wavHeader(dataBytes: number, sampleRate: number): Buffer {
  const h = Buffer.alloc(HEADER_BYTES);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36 + dataBytes, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(dataBytes, 40);
  return h;
}

/**
 * 세션 시작 기준 시간축에 맞춰 PCM을 기록하는 트랙.
 * 들어온 시각보다 기록이 뒤처지면(입장 전, 끊김, 침묵 송출 없음) 그만큼 무음을 채워 다른 트랙과 위치를 맞춘다.
 */
export class WavTrack {
  private fd: number | null;
  private written = 0; // 샘플 수
  private readonly toleranceSamples: number;

  constructor(readonly path: string, readonly sampleRate: number, toleranceMs = 120) {
    this.fd = openSync(path, "w");
    writeSync(this.fd, wavHeader(0, sampleRate), 0, HEADER_BYTES, 0);
    this.toleranceSamples = Math.round((sampleRate * toleranceMs) / 1000);
  }

  get samples(): number {
    return this.written;
  }

  /** atMs: 이 조각이 재생·수신된 시각 (세션 시작 기준, 조각의 끝 시각) */
  writeAt(pcm: Int16Array, atMs: number): void {
    if (this.fd === null || pcm.length === 0) return;
    const startSample = Math.round((atMs * this.sampleRate) / 1000) - pcm.length;
    const gap = startSample - this.written;
    if (gap > this.toleranceSamples) this.writeSilence(gap);
    this.writeRaw(pcm);
  }

  /** 길이를 맞추기 위해 끝까지 무음으로 채운다 */
  padTo(totalSamples: number): void {
    if (totalSamples > this.written) this.writeSilence(totalSamples - this.written);
  }

  finalize(): void {
    if (this.fd === null) return;
    writeSync(this.fd, wavHeader(this.written * 2, this.sampleRate), 0, HEADER_BYTES, 0);
    closeSync(this.fd);
    this.fd = null;
  }

  private writeSilence(samples: number): void {
    const chunk = Math.min(samples, this.sampleRate); // 최대 1초씩
    const zeros = Buffer.alloc(chunk * 2);
    let left = samples;
    while (left > 0) {
      const n = Math.min(left, chunk);
      writeSync(this.fd!, zeros, 0, n * 2, HEADER_BYTES + this.written * 2);
      this.written += n;
      left -= n;
    }
  }

  private writeRaw(pcm: Int16Array): void {
    const buf = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    writeSync(this.fd!, buf, 0, buf.length, HEADER_BYTES + this.written * 2);
    this.written += pcm.length;
  }
}

/** 같은 샘플레이트의 WAV 트랙들을 더해 하나로 섞는다. 메모리에 전부 올리지 않고 1초씩 처리한다. */
export function mixWavFiles(inputs: string[], output: string, sampleRate: number): number {
  const fds = inputs.map((p) => openSync(p, "r"));
  const sizes = fds.map((fd) => {
    const h = Buffer.alloc(HEADER_BYTES);
    readSync(fd, h, 0, HEADER_BYTES, 0);
    return h.readUInt32LE(40) / 2;
  });
  const total = Math.max(0, ...sizes);
  const out = openSync(output, "w");
  writeSync(out, wavHeader(total * 2, sampleRate), 0, HEADER_BYTES, 0);
  const block = sampleRate;
  const buf = Buffer.alloc(block * 2);
  for (let pos = 0; pos < total; pos += block) {
    const n = Math.min(block, total - pos);
    const acc = new Int32Array(n);
    fds.forEach((fd, i) => {
      const avail = Math.max(0, Math.min(n, sizes[i] - pos));
      if (avail === 0) return;
      readSync(fd, buf, 0, avail * 2, HEADER_BYTES + pos * 2);
      for (let k = 0; k < avail; k++) acc[k] += buf.readInt16LE(k * 2);
    });
    const outBuf = Buffer.alloc(n * 2);
    for (let k = 0; k < n; k++) outBuf.writeInt16LE(Math.max(-32768, Math.min(32767, acc[k])), k * 2);
    writeSync(out, outBuf, 0, outBuf.length, HEADER_BYTES + pos * 2);
  }
  fds.forEach((fd) => closeSync(fd));
  closeSync(out);
  return total;
}
