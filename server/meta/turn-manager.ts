/** Cancellation and output permission are independent of provider cancellation support. */
export class TurnManager {
  revision = 0;
  generation = 0;
  held = false;
  closed = false;
  readonly speakers = new Set<string>();
  private controller = new AbortController();
  invalidate(): void { this.generation++; this.controller.abort(); this.controller = new AbortController(); }
  changed(): void { this.revision++; this.invalidate(); }
  human(identity: string, speaking: boolean): void {
    if (speaking && !this.speakers.has(identity)) { this.speakers.add(identity); this.changed(); }
    else if (!speaking) this.speakers.delete(identity);
  }
  hold(): void { this.held = true; this.invalidate(); }
  resume(): void { this.held = false; this.changed(); }
  close(): void { this.closed = true; this.invalidate(); }
  begin() { this.invalidate(); return { generation: this.generation, revision: this.revision, signal: this.controller.signal }; }
  permits(ticket: { generation: number; revision: number }): boolean {
    return !this.closed && !this.held && this.speakers.size === 0 && ticket.generation === this.generation && ticket.revision === this.revision;
  }
}
