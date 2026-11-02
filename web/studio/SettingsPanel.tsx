import { useEffect, useState } from "react";
import {
  ENGINE_LABEL, ENGINES, GEMINI_SENSITIVITY, GEMINI_THINKING_CHOICES, GEMINI_VOICES, GPT_LIVE_VOICES, REASONING_EFFORTS,
  type EngineId, type Settings,
} from "../../shared/settings";
import { api } from "../lib/api";
import { Field, Section } from "./fields";
import { PersonaSection } from "./PersonaSection";

interface Models {
  live: string[];
  backend: string[];
  gemini: string[];
  source: "api" | "fallback";
}

interface SettingsPanelProps {
  settings: Settings;
  locked: boolean;
  activeEngine: EngineId | null;
  onSaved: (s: Settings) => void;
  onError: (msg: string) => void;
}

const options = (list: readonly string[], current: string): string[] => (list.includes(current) ? [...list] : [current, ...list]);

/** MC 설정 창: 엔진 선택 + 두 엔진 공통 프롬프트 + 엔진별 설정 */
export function SettingsPanel({ settings, locked, activeEngine, onSaved, onError }: SettingsPanelProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [models, setModels] = useState<Models | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  useEffect(() => setDraft(settings), [settings]);
  useEffect(() => {
    api<Models>("/api/models").then(setModels).catch(() => setModels(null));
  }, []);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const r = await api<{ settings: Settings }>("/api/settings", { method: "PUT", body: draft });
      onSaved(r.settings);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const engine = draft.engine;

  return (
    <aside className="settings">
      <div className="settings-scroll">
        <section className="set-section">
          <h3>Engine{locked && <span className="lock">Locked during session</span>}</h3>
          <div className="segmented" role="radiogroup" aria-label="Voice engine">
            {ENGINES.map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={engine === id}
                className={engine === id ? "on" : ""}
                disabled={locked}
                onClick={() => setDraft((d) => ({ ...d, engine: id }))}
              >
                {ENGINE_LABEL[id]}
                {activeEngine === id && <i className="live-dot" title="Active" />}
              </button>
            ))}
          </div>
          <p className="hint">Meta is the submission co-host. Legacy engines remain available for development comparisons.</p>
        </section>

        {engine !== "meta" && <PersonaSection draft={draft} saved={settings} setDraft={setDraft} locked={locked} onSaved={onSaved} onError={onError} />}

        {engine === "meta" ? (
          <Section title="Meta co-host" hint="Human-controlled conversation. Optional spoken research requests. No fallback LLM.">
            <p className="style-lock">Fixed reference: SPNS TV / Shoes Off<br />Original English co-host · relaxed, candid and lightly playful.</p>
            <p>Muse Voice Transcribe listens. Muse Spark chooses WAIT, ASK, CLARIFY, SUMMARIZE or a requested LOOKUP. OpenAI TTS renders the response.</p>
            <label className="toggle research-opt-in">
              <input type="checkbox" checked={draft.researchEnabled ?? false} onChange={(e) => setDraft((d) => ({ ...d, researchEnabled: e.target.checked }))} />
              <span>Enable research PD</span>
            </label>
            <p className="hint">Off by default. When enabled, an explicit spoken request such as “Look that up” can start web research and release a spoken answer when the floor is clear, without another handoff. Normal questions still require Handoff. HOLD cancels pending work and speech.</p>
            <p className="hint">Save to apply. Changing this setting cancels pending AI work and speech, including during a session. Web research uses provider requests and may incur charges. Check the linked sources; an AI answer is not a verified fact.</p>
            <p className="hint">Models are configured on the server. Account access and live audio must be verified separately. HOLD cancels pending speech; handoff asks for a fresh decision.</p>
          </Section>
        ) : engine === "gpt-live" ? (
          <GptSection draft={draft} setDraft={setDraft} locked={locked} models={models} />
        ) : (
          <GeminiSection draft={draft} setDraft={setDraft} locked={locked} models={models} />
        )}

        <Section title="Session & speech detection">
          <Field label="Host name">
            <input disabled={locked} value={draft.show.hostName} onChange={(e) => setDraft((d) => ({ ...d, show: { ...d.show, hostName: e.target.value } }))} />
          </Field>
          <Field label="Room name" hint="Lowercase letters, numbers and hyphens">
            <input disabled={locked} value={draft.show.roomName} onChange={(e) => setDraft((d) => ({ ...d, show: { ...d.show, roomName: e.target.value } }))} />
          </Field>
          <Field label={`Speech threshold ${draft.floor.speechThresholdDb} dBFS`} hint="Lower values detect quieter speech. Use headphones to avoid false interruptions.">
            <input type="range" min={-70} max={-20} value={draft.floor.speechThresholdDb} onChange={(e) => setDraft((d) => ({ ...d, floor: { ...d.floor, speechThresholdDb: Number(e.target.value) } }))} />
          </Field>
          {engine !== "meta" && <label className="toggle">
            <input type="checkbox" checked={draft.floor.announceSpeakers} onChange={(e) => setDraft((d) => ({ ...d, floor: { ...d.floor, announceSpeakers: e.target.checked } }))} />
            <span>Announce speaker changes to legacy engines</span>
          </label>}
        </Section>
      </div>
      <footer className="settings-foot">
        {engine !== "meta" && models?.source === "fallback" && <span className="muted">Model list: documented defaults</span>}
        <button className="btn ghost" disabled={!dirty || saving} onClick={() => setDraft(settings)}>Revert</button>
        <button className="btn primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : locked ? "Apply live" : "Save"}</button>
      </footer>
    </aside>
  );
}

interface SectionProps {
  draft: Settings;
  setDraft: React.Dispatch<React.SetStateAction<Settings>>;
  locked: boolean;
}

function GptSection({ draft, setDraft, locked, models }: SectionProps & { models: Models | null }) {
  const g = draft.gptLive;
  const set = (patch: Partial<Settings["gptLive"]>): void => setDraft((d) => ({ ...d, gptLive: { ...d.gptLive, ...patch } }));
  const setDel = (patch: Partial<Settings["gptLive"]["delegation"]>): void =>
    setDraft((d) => ({ ...d, gptLive: { ...d.gptLive, delegation: { ...d.gptLive.delegation, ...patch } } }));
  return (
    <>
      <Section title="Voice model · GPT-Live" locked={locked}>
        <Field label="Model">
          <select disabled={locked} value={g.model} onChange={(e) => set({ model: e.target.value })}>
            {options(models?.live ?? ["gpt-live-1"], g.model).map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Voice" hint="Legacy voice settings; language and accent vary by voice.">
          <select disabled={locked} value={g.voice} onChange={(e) => set({ voice: e.target.value })}>
            {options(GPT_LIVE_VOICES, g.voice).map((v) => <option key={v} value={v}>{v === "noeul" ? "noeul (Korean)" : v}</option>)}
          </select>
        </Field>
      </Section>
      <Section title="Delegated model" hint="Can be changed during a session.">
        <Field label="Model">
          <input list="backend-models" value={g.delegation.model} onChange={(e) => setDel({ model: e.target.value })} />
          <datalist id="backend-models">
            {(models?.backend ?? []).map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>
        <Field label="Reasoning effort" hint="Low effort favors conversational response speed.">
          <select value={g.delegation.reasoningEffort} onChange={(e) => setDel({ reasoningEffort: e.target.value as Settings["gptLive"]["delegation"]["reasoningEffort"] })}>
            {REASONING_EFFORTS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <label className="toggle">
          <input type="checkbox" checked={g.delegation.webSearch} onChange={(e) => setDel({ webSearch: e.target.checked })} />
          <span>Web search</span>
        </label>
        <Field label="Prompt" hint="Instructions for the delegated model">
          <textarea className="mono" rows={7} value={g.delegation.prompt} onChange={(e) => setDel({ prompt: e.target.value })} />
        </Field>
      </Section>
    </>
  );
}

function GeminiSection({ draft, setDraft, locked, models }: SectionProps & { models: Models | null }) {
  const g = draft.geminiLive;
  const set = (patch: Partial<Settings["geminiLive"]>): void => setDraft((d) => ({ ...d, geminiLive: { ...d.geminiLive, ...patch } }));
  const setVad = (patch: Partial<Settings["geminiLive"]["vad"]>): void =>
    setDraft((d) => ({ ...d, geminiLive: { ...d.geminiLive, vad: { ...d.geminiLive.vad, ...patch } } }));
  const extended = g.model.includes("extended-thinking");
  return (
    <Section title="Voice model · Gemini Live" locked={locked} hint="Gemini settings apply to the next session.">
      <Field label="Model">
        <select disabled={locked} value={g.model} onChange={(e) => set({ model: e.target.value })}>
          {options(models?.gemini ?? ["gemini-3.8-live", "gemini-3.8-live-extended-thinking"], g.model).map((m) => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Voice" hint="Multilingual voices; language is selected by the model.">
        <select disabled={locked} value={g.voice} onChange={(e) => set({ voice: e.target.value })}>
          {options(GEMINI_VOICES, g.voice).map((v) => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <label className="toggle">
        <input type="checkbox" disabled={locked} checked={g.googleSearch} onChange={(e) => set({ googleSearch: e.target.checked })} />
        <span>Google Search (additional provider charges may apply)</span>
      </label>
      {extended && (
        <Field label="Thinking level" hint="Required by this model. Higher effort may increase response time.">
          <select disabled={locked} value={g.thinkingLevel === "off" ? "low" : g.thinkingLevel} onChange={(e) => set({ thinkingLevel: e.target.value as Settings["geminiLive"]["thinkingLevel"] })}>
            {GEMINI_THINKING_CHOICES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      )}
      <div className="grid-2">
        <Field label="Speech start sensitivity">
          <select disabled={locked} value={g.vad.startSensitivity} onChange={(e) => setVad({ startSensitivity: e.target.value as "HIGH" | "LOW" })}>
            {GEMINI_SENSITIVITY.map((v) => <option key={v} value={v}>{v === "HIGH" ? "Sensitive (HIGH)" : "Less sensitive (LOW)"}</option>)}
          </select>
        </Field>
        <Field label="Speech end sensitivity">
          <select disabled={locked} value={g.vad.endSensitivity} onChange={(e) => setVad({ endSensitivity: e.target.value as "HIGH" | "LOW" })}>
            {GEMINI_SENSITIVITY.map((v) => <option key={v} value={v}>{v === "HIGH" ? "Earlier (HIGH)" : "Later (LOW)"}</option>)}
          </select>
        </Field>
      </div>
      <Field label={`End-of-turn silence ${g.vad.silenceDurationMs}ms`} hint="Shorter silence may interrupt a thinking pause. Start at 500–800 ms.">
        <input type="range" min={300} max={2000} step={50} disabled={locked} value={g.vad.silenceDurationMs} onChange={(e) => setVad({ silenceDurationMs: Number(e.target.value) })} />
      </Field>
    </Section>
  );
}
