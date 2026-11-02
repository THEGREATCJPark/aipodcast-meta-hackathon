import { useState } from "react";
import { COMMON_PODCAST_RULES, PERSONA_TRACKS, TRACK_IDS, type PersonaChoice } from "../../shared/personas";
import { composeInstructions, ENGINE_LABEL, openingInstruction, type Settings } from "../../shared/settings";
import { api } from "../lib/api";
import { Field, Section } from "./fields";

interface PersonaSectionProps {
  draft: Settings;
  saved: Settings;
  setDraft: React.Dispatch<React.SetStateAction<Settings>>;
  locked: boolean;
  onSaved: (s: Settings) => void;
  onError: (m: string) => void;
}

const CHOICE_LABEL = (c: PersonaChoice): string => (c === "custom" ? "직접 작성" : PERSONA_TRACKS[c].label);

/** MC 캐릭터: 벤치마킹 3트랙 + 직접 작성. 방송 중에도 트랙을 바꿔 바로 다시 시작할 수 있다. */
export function PersonaSection({ draft, saved, setDraft, locked, onSaved, onError }: PersonaSectionProps) {
  const [restarting, setRestarting] = useState(false);
  const track = draft.persona.track;
  const personaChanged = draft.persona.track !== saved.persona.track || draft.persona.openingMode !== saved.persona.openingMode;
  const setPersona = (patch: Partial<Settings["persona"]>): void => setDraft((d) => ({ ...d, persona: { ...d.persona, ...patch } }));

  /** 세션 중 트랙 변경: 설정을 저장하고 지금 세션을 정리한 뒤 새 트랙으로 다시 연다 */
  const restartWithTrack = async (): Promise<void> => {
    setRestarting(true);
    try {
      const next = { ...saved, persona: draft.persona };
      const r = await api<{ settings: Settings }>("/api/settings", { method: "PUT", body: next });
      onSaved(r.settings);
      await api("/api/session/restart", { method: "POST", body: {} });
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "다시 시작하지 못했습니다");
    } finally {
      setRestarting(false);
    }
  };

  const copyToCustom = (): void => {
    if (track === "custom") return;
    setDraft((d) => ({
      ...d,
      persona: { ...d.persona, track: "custom" },
      prompt: { opening: PERSONA_TRACKS[track].opening, instructions: `${COMMON_PODCAST_RULES}\n\n${PERSONA_TRACKS[track].prompt}` },
    }));
  };

  return (
    <Section title="MC 캐릭터 · 두 엔진 공통">
      <div className="tracks" role="radiogroup" aria-label="MC 캐릭터 트랙">
        {TRACK_IDS.map((id, i) => {
          const t = PERSONA_TRACKS[id];
          return (
            <button key={id} role="radio" aria-checked={track === id} className={`track t${i + 1} ${track === id ? "on" : ""}`} onClick={() => setPersona({ track: id })}>
              <span className="track-head">
                <b>{t.label}</b>
                <span className="track-bench">{t.benchmark}</span>
              </span>
              <span className="track-tag">{t.tagline}</span>
              <q>{t.sample}</q>
            </button>
          );
        })}
        <button role="radio" aria-checked={track === "custom"} className={`track custom ${track === "custom" ? "on" : ""}`} onClick={() => setPersona({ track: "custom" })}>
          <span className="track-head"><b>직접 작성</b></span>
          <span className="track-tag">공통 규칙 없이 내 프롬프트만 사용</span>
        </button>
      </div>

      <div className="segmented small" role="radiogroup" aria-label="오프닝 방식">
        {(["smalltalk", "wait"] as const).map((m) => (
          <button key={m} role="radio" aria-checked={draft.persona.openingMode === m} className={draft.persona.openingMode === m ? "on" : ""} onClick={() => setPersona({ openingMode: m })}>
            {m === "smalltalk" ? "스몰토크로 먼저 시작" : "CJ 첫마디 듣고 받아치기"}
          </button>
        ))}
      </div>

      {locked && personaChanged && (
        <div className="restart">
          <span>방송 중에는 프롬프트를 바꿀 수 없어서, 지금 세션을 저장·종료하고 <b>{CHOICE_LABEL(track)}</b>로 바로 다시 시작합니다.</span>
          <button className="btn primary" disabled={restarting} onClick={() => void restartWithTrack()}>{restarting ? "다시 시작하는 중…" : "이 트랙으로 다시 시작"}</button>
        </div>
      )}

      {track === "custom" ? (
        <CustomPrompt draft={draft} setDraft={setDraft} locked={locked} onError={onError} />
      ) : (
        <details className="preview">
          <summary>{ENGINE_LABEL[draft.engine]}에 보낼 전체 프롬프트 보기</summary>
          <p className="hint">발화 길이 → 공통 규칙 → 트랙 → 방송 운영 규칙 → 검색 규칙 → 발화 길이 순서로 조립됩니다.</p>
          <pre>{composeInstructions(draft, draft.engine)}</pre>
          <span className="field-label">오프닝 지시</span>
          <pre>{openingInstruction(draft) ?? "(먼저 말하지 않고 CJ님의 첫마디를 기다립니다)"}</pre>
          <button className="btn ghost" disabled={locked} onClick={copyToCustom}>이 트랙을 복사해서 직접 편집</button>
        </details>
      )}
    </Section>
  );
}

function CustomPrompt({ draft, setDraft, locked, onError }: Pick<PersonaSectionProps, "draft" | "setDraft" | "locked" | "onError">) {
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const setPrompt = (patch: Partial<Settings["prompt"]>): void => setDraft((d) => ({ ...d, prompt: { ...d.prompt, ...patch } }));

  const generate = async (): Promise<void> => {
    setGenerating(true);
    try {
      const r = await api<{ voicePrompt: string; backendPrompt: string; opening: string }>("/api/prompt-gen", { method: "POST", body: { description: idea } });
      setDraft((d) => ({
        ...d,
        prompt: { opening: r.opening, instructions: r.voicePrompt },
        gptLive: { ...d.gptLive, delegation: { ...d.gptLive.delegation, prompt: r.backendPrompt } },
      }));
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <details className="gen">
        <summary>프롬프트로 시작하기</summary>
        <p className="hint">쇼 컨셉을 적으면 MC 프롬프트·오프닝·GPT 백엔드 프롬프트를 함께 만듭니다. 저장 전에 검토하세요. (OpenAI Responses API 과금)</p>
        <textarea className="mono" rows={3} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="예: 특이점을 주제로 한 한국어 팟캐스트. 진행자는 차분하고 호기심 많은 AI…" />
        <button className="btn ghost" disabled={generating || idea.trim().length < 5 || locked} onClick={() => void generate()}>
          {generating ? "생성 중…" : "프롬프트 생성"}
        </button>
      </details>
      <Field label="Opening" hint="스몰토크로 시작할 때 MC에게 주는 지시. 그대로 읽지 않고 자연스럽게 바꿔 말합니다.">
        <textarea disabled={locked} rows={3} value={draft.prompt.opening} onChange={(e) => setPrompt({ opening: e.target.value })} />
      </Field>
      <Field label="Prompt" hint={`캐릭터와 말투. 방송 운영 규칙·검색 규칙·발화 길이 규칙은 자동으로 붙습니다. ${draft.prompt.instructions.length.toLocaleString()} / 32,000자`}>
        <textarea className="mono tall" disabled={locked} value={draft.prompt.instructions} onChange={(e) => setPrompt({ instructions: e.target.value })} />
      </Field>
    </>
  );
}
