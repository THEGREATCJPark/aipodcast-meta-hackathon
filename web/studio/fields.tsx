import type { ReactNode } from "react";

export function Section({ title, hint, locked, children }: { title: string; hint?: string; locked?: boolean; children: ReactNode }) {
  return (
    <section className="set-section">
      <h3>{title}{locked && <span className="lock" title="세션 중에는 바꿀 수 없습니다">세션 중 잠김</span>}</h3>
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
