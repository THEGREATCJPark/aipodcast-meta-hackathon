> November 4 update: the selected v11 film uses a completed Gemini-speech app session (`2026-11-04_1206_meta_7fa3`). The failed attempt recorded below is historical. See [current film evidence](VIDEO_V11.md).

# Gemini 3.8 Flash TTS — November 3, 2026

## Current selection

The owner explicitly selected `gemini-3.8-flash-tts`. It is pinned in `server/speech/gemini-tts.ts`. The co-host voice is **Kore**; prepared synthetic host inputs use **Puck** (Alex) and **Charon** (Sam).

`TTS_PROVIDER` defaults to `gemini`. Only an explicit `TTS_PROVIDER=openai` enables the earlier speech provider; a Gemini failure cannot select it. Meta still performs ASR, research, WAIT/LOOKUP/DELIVER decisions and current-context review. Gemini renders only Meta's validated text. Generation and playback use the existing cancellation/generation guards. Audio is checked for PCM16 mono 24 kHz and a maximum 30-second duration before publishing through LiveKit.

## Credential correction

An inherited process `GEMINI_API_KEY` differed from the local `.env` value. Default dotenv loading had preserved the inherited key. Therefore earlier repeated 429 responses did **not** prove that the newly configured local key was unusable.

The app and editorial scripts now explicitly prefer the local Gemini key; a blank local entry fails rather than silently billing an inherited project. Values were neither displayed nor persisted. Regression tests cover local precedence, explicit blank values and process-only setup.

With the local key, three generation calls succeeded:

| Asset | Model | Result |
| --- | --- | --- |
| `podcast-hosts.wav` | `gemini-3.8-flash-tts` | HTTP 200, 38.56 s, PCM16 mono 24 kHz, Puck/Charon |
| `podcast-followup.wav` | `gemini-3.8-flash-tts` | HTTP 200, 7.72 s, same format and voices |
| `podcast-reveal.mp4` | `gemini-omni-1.1-flash` | HTTP 200, 10.03 s, 1280x720/24fps, native audio |

The video model is Omni, not TTS. Its generated audio repeats “You already have” near 8–9 s; that take requires editorial review before final use. Its original file is retained. Speech text was checked using Whisper transcription; this is not human listening acceptance.

## Full co-host attempt

Session **`2026-11-03_1142_meta_25c0`**, clean execution SHA **`a16946a`**, used the actual Gemini host WAVs, split at aligned turn boundaries while retaining native timing, as two separate LiveKit identities. Meta transcribed the dialogue, searched and selected DELIVER with a short answer. The Gemini Kore TTS request then failed with HTTP 429. Recording, source result and decision events were preserved; no co-host audio was heard and the run was not successful.

A direct diagnostic using the confirmed local key returned **monthly spending cap exceeded**. Thus, after the successful generations above, additional speech calls were quota-blocked on the local key as well. No balance or cause of the account-level cap is inferred from this response. No cap was changed, alternate account selected, or fallback speech synthesized.

Local non-secret evidence: `output/media-v6/*.json` and `output/probes/cadence-1793673756697/evidence.json`. The app status and UI identify Gemini TTS. Standalone speech success must not be presented as a passed full app speech flow. The previous successful full-run recordings used OpenAI TTS and retain that attribution.

## Validation and next step

132 tests, typecheck and web build passed. Tests cover exact text/model forwarding, WAV format/size, late cancellation, no retry/fallback, required Gemini credentials, and local-key precedence. Provider probes and preparation checks now use the selected speech provider.

The owner can inspect the project associated with the local key in [AI Studio spend settings](https://ai.studio/spend). Once speech calls are available, rerun:

```sh
npx tsx scripts/probe-cadence.ts --fixtures=output/media-v6/fixtures/manifest.json
```

The app should already be running with the new code. This command is a paid synthetic test, not a human trial. Judge naturalness from the generated host sample before deciding whether human recording is needed. Final submission editing and human listening acceptance remain pending.
