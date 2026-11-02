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
      onError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const engine = draft.engine;

  return (
    <aside className="settings">
      <div className="settings-scroll">
        <section className="set-section">
          <h3>엔진{locked && <span className="lock">세션 중 잠김</span>}</h3>
          <div className="segmented" role="radiogroup" aria-label="음성 엔진">
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
                {activeEngine === id && <i className="live-dot" title="진행 중" />}
              </button>
            ))}
          </div>
          <p className="hint">Meta is the submission co-host. Legacy engines remain available for development comparisons.</p>
        </section>

        {engine !== "meta" && <PersonaSection draft={draft} saved={settings} setDraft={setDraft} locked={locked} onSaved={onSaved} onError={onError} />}

        {engine === "meta" ? (
          <Section title="Meta co-host" hint="Human-controlled handoff. No fallback LLM.">
            <p>Muse Voice Transcribe listens. Muse Spark chooses WAIT, ASK, CLARIFY or SUMMARIZE. OpenAI TTS voices only the approved text.</p>
            <p className="hint">Models are configured on the server. Account access and live audio must be verified separately. HOLD cancels pending speech; handoff asks for a fresh decision.</p>
          </Section>
        ) : engine === "gpt-live" ? (
          <GptSection draft={draft} setDraft={setDraft} locked={locked} models={models} />
        ) : (
          <GeminiSection draft={draft} setDraft={setDraft} locked={locked} models={models} />
        )}

        <Section title="방송 · 발화 감지">
          <Field label="진행자 이름">
            <input disabled={locked} value={draft.show.hostName} onChange={(e) => setDraft((d) => ({ ...d, show: { ...d.show, hostName: e.target.value } }))} />
          </Field>
          <Field label="방 이름" hint="영문 소문자·숫자·하이픈">
            <input disabled={locked} value={draft.show.roomName} onChange={(e) => setDraft((d) => ({ ...d, show: { ...d.show, roomName: e.target.value } }))} />
          </Field>
          <Field label={`발화 감지 기준 ${draft.floor.speechThresholdDb} dBFS`} hint="낮을수록 작은 소리도 말로 판단 (화자 표시·지연 측정용)">
            <input type="range" min={-70} max={-20} value={draft.floor.speechThresholdDb} onChange={(e) => setDraft((d) => ({ ...d, floor: { ...d.floor, speechThresholdDb: Number(e.target.value) } }))} />
          </Field>
          <label className="toggle">
            <input type="checkbox" checked={draft.floor.announceSpeakers} onChange={(e) => setDraft((d) => ({ ...d, floor: { ...d.floor, announceSpeakers: e.target.checked } }))} />
            <span>화자가 바뀌면 MC에게 이름 알려주기</span>
          </label>
        </Section>
      </div>
      <footer className="settings-foot">
        {models?.source === "fallback" && <span className="muted">모델 목록: 문서 기본값</span>}
        <button className="btn ghost" disabled={!dirty || saving} onClick={() => setDraft(settings)}>되돌리기</button>
        <button className="btn primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "저장 중…" : locked ? "세션에 반영" : "저장"}</button>
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
        <Field label="Voice" hint="한국어 전용 음성은 noeul. 나머지는 다국어 음성이라 억양 차이가 있을 수 있습니다.">
          <select disabled={locked} value={g.voice} onChange={(e) => set({ voice: e.target.value })}>
            {options(GPT_LIVE_VOICES, g.voice).map((v) => <option key={v} value={v}>{v === "noeul" ? "noeul (한국어)" : v}</option>)}
          </select>
        </Field>
      </Section>
      <Section title="Delegated model" hint="세션 중에도 바꿀 수 있습니다.">
        <Field label="Model">
          <input list="backend-models" value={g.delegation.model} onChange={(e) => setDel({ model: e.target.value })} />
          <datalist id="backend-models">
            {(models?.backend ?? []).map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>
        <Field label="Reasoning effort" hint="팟캐스트는 속도가 중요해서 low를 권합니다.">
          <select value={g.delegation.reasoningEffort} onChange={(e) => setDel({ reasoningEffort: e.target.value as Settings["gptLive"]["delegation"]["reasoningEffort"] })}>
            {REASONING_EFFORTS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <label className="toggle">
          <input type="checkbox" checked={g.delegation.webSearch} onChange={(e) => setDel({ webSearch: e.target.checked })} />
          <span>Web search</span>
        </label>
        <Field label="Prompt" hint="백엔드(방송 작가)의 작업 지시">
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
    <Section title="Voice model · Gemini Live" locked={locked} hint="Gemini는 세션 중 설정을 바꿀 수 없습니다. 바꾼 값은 다음 세션부터 적용됩니다.">
      <Field label="Model">
        <select disabled={locked} value={g.model} onChange={(e) => set({ model: e.target.value })}>
          {options(models?.gemini ?? ["gemini-3.8-live", "gemini-3.8-live-extended-thinking"], g.model).map((m) => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Voice" hint="한국어 전용 음성은 없습니다. 모든 음성이 다국어이며 언어는 모델이 자동으로 고릅니다.">
        <select disabled={locked} value={g.voice} onChange={(e) => set({ voice: e.target.value })}>
          {options(GEMINI_VOICES, g.voice).map((v) => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <label className="toggle">
        <input type="checkbox" disabled={locked} checked={g.googleSearch} onChange={(e) => set({ googleSearch: e.target.checked })} />
        <span>Google 검색 (월 5,000회 무료, 이후 1,000회당 $14)</span>
      </label>
      {extended && (
        <Field label="Thinking level" hint="이 모델은 필수입니다. 깊게 할수록 응답이 늦어집니다.">
          <select disabled={locked} value={g.thinkingLevel === "off" ? "low" : g.thinkingLevel} onChange={(e) => set({ thinkingLevel: e.target.value as Settings["geminiLive"]["thinkingLevel"] })}>
            {GEMINI_THINKING_CHOICES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      )}
      <div className="grid-2">
        <Field label="말 시작 감지">
          <select disabled={locked} value={g.vad.startSensitivity} onChange={(e) => setVad({ startSensitivity: e.target.value as "HIGH" | "LOW" })}>
            {GEMINI_SENSITIVITY.map((v) => <option key={v} value={v}>{v === "HIGH" ? "민감 (HIGH)" : "둔감 (LOW)"}</option>)}
          </select>
        </Field>
        <Field label="말 끝 감지">
          <select disabled={locked} value={g.vad.endSensitivity} onChange={(e) => setVad({ endSensitivity: e.target.value as "HIGH" | "LOW" })}>
            {GEMINI_SENSITIVITY.map((v) => <option key={v} value={v}>{v === "HIGH" ? "빨리 끝냄 (HIGH)" : "천천히 (LOW)"}</option>)}
          </select>
        </Field>
      </div>
      <Field label={`말 끝으로 볼 침묵 ${g.vad.silenceDurationMs}ms`} hint="짧을수록 빨리 대답하지만 생각 중인 침묵에 끼어들 수 있습니다. 권장 500~800ms">
        <input type="range" min={300} max={2000} step={50} disabled={locked} value={g.vad.silenceDurationMs} onChange={(e) => setVad({ silenceDurationMs: Number(e.target.value) })} />
      </Field>
    </Section>
  );
}
