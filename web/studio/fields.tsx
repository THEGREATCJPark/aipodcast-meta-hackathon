import type { ReactNode } from "react";

export function Section({ title, hint, locked, children }: { title: string; hint?: string; locked?: boolean; children: ReactNode }) {
  return (
    <section className="set-section">
      <h3>{title}{locked && <span className="lock" title="Cannot change during an active session">Locked during session</span>}</h3>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}
