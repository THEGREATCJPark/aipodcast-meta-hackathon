import type { TranscriptDelta } from "../engines/types.js";

/**
 * 전사 조각(delta)을 발화 단위로 묶는다.
 * 앞 조각과의 간격이 gapMs보다 크면 새 발화로 본다.
 */
export interface Utterance {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface AssembleResult {
  utterance: Utterance;
  isNew: boolean;
}

export class TranscriptAssembler {
  private current: Utterance | null = null;
  private count = 0;

  constructor(private readonly prefix: string, private readonly gapMs = 1200) {}

  add(d: TranscriptDelta): AssembleResult | null {
    if (!d.delta) return null;
    const cur = this.current;
    if (cur && d.startMs - cur.endMs <= this.gapMs) {
      this.current = { ...cur, text: cur.text + d.delta, endMs: Math.max(cur.endMs, d.endMs) };
      return { utterance: this.current, isNew: false };
    }
    this.count += 1;
    this.current = { id: `${this.prefix}-${this.count}`, text: d.delta.trimStart(), startMs: d.startMs, endMs: d.endMs };
    return { utterance: this.current, isNew: true };
  }

  /** 다음 조각이 이어 붙지 않도록 현재 발화를 닫는다. */
  close(): void {
    this.current = null;
  }
}
