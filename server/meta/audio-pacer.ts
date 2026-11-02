/** Monotonic-clock pacing compensates timer drift without an unbounded catch-up burst. */
export class AudioPacer {
  private sentFrames = 0;
  constructor(private readonly startedAt: number, private readonly frameMs = 20, private readonly maxCatchupFrames = 5, private readonly maxDebtMs = 2000) {}
  takeDue(now: number): number {
    const expected = Math.floor(Math.max(0, now - this.startedAt) / this.frameMs);
    const debt = Math.max(0, expected - this.sentFrames);
    if (debt * this.frameMs > this.maxDebtMs) throw new Error("ASR pacing stalled beyond 2 seconds");
    const count = Math.min(debt, this.maxCatchupFrames);
    this.sentFrames += count;
    return count;
  }
}
