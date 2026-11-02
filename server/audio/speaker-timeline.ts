/**
 * 입력 스트림 시각(ms) 기준으로 누가 언제 말했는지 기록하고,
 * 전사 구간(start_ms~end_ms)에 가장 많이 겹치는 화자를 찾는다.
 */
interface Span {
  speaker: string;
  startMs: number;
  endMs: number | null;
}

export class SpeakerTimeline {
  private spans: Span[] = [];
  private readonly maxSpans = 2000;

  start(speaker: string, atMs: number): void {
    this.spans = [...this.spans, { speaker, startMs: atMs, endMs: null }].slice(-this.maxSpans);
  }

  end(speaker: string, atMs: number): void {
    const idx = this.findOpen(speaker);
    if (idx < 0) return;
    this.spans = this.spans.map((s, i) => (i === idx ? { ...s, endMs: atMs } : s));
  }

  /** 겹침이 가장 큰 화자. 겹침이 없으면 null. */
  attribute(startMs: number, endMs: number, nowMs: number): string | null {
    const totals = new Map<string, number>();
    for (const s of this.spans) {
      const sEnd = s.endMs ?? nowMs;
      const overlap = Math.min(endMs, sEnd) - Math.max(startMs, s.startMs);
      if (overlap > 0) totals.set(s.speaker, (totals.get(s.speaker) ?? 0) + overlap);
    }
    let best: string | null = null;
    let bestMs = 0;
    for (const [speaker, ms] of totals) {
      if (ms > bestMs) {
        best = speaker;
        bestMs = ms;
      }
    }
    return best;
  }

  private findOpen(speaker: string): number {
    for (let i = this.spans.length - 1; i >= 0; i--) {
      if (this.spans[i].speaker === speaker && this.spans[i].endMs === null) return i;
    }
    return -1;
  }
}
