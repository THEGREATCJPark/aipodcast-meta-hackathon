# Judge guide — Keep Talking / Conversation Co-host

**Submission candidate:** [Watch 2:22 v8](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4) · [Release QA & subtitles](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8) · [What the video shows](VIDEO_V8.md).

This is an independent Meta hackathon entry, not an official Meta product. The filmed studio scenes are generated editorial material; the **continuous real Meta application evidence** is from session `2026-11-02_1908_meta_adc9` with **synthetic host inputs**, a genuine searched/sourced Meta response, **OpenAI speech synthesis** and LiveKit reception. The conversation after the answer is a prewritten fixture triggered upon observed completion, not a human trial. The app's current Gemini TTS default was separately quota-blocked at HTTP 429 after Meta DELIVER.

## No-credential review

Node **22.22+** (compatible Node 22), npm:

~~~sh
npm ci
npm test
npm run typecheck
npm run build:web
npm run build:guest
npm run dev
~~~

Studio at http://localhost:4400 and judge summary at http://localhost:4400/?view=judge. Offline tests do not need API keys. The source checkpoint `2ea416b` has [successful GitHub CI](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/actions/runs/41584443719): **132/132 tests**, typecheck and both builds. A later documentation-only update must be checked on its own CI run.

### How to inspect the event contribution

| Start here | Look for |
|---|---|
| [HACKATHON.md](../HACKATHON.md), [PROVENANCE.md](PROVENANCE.md), [CONTRIBUTIONS.md](CONTRIBUTIONS.md) | Clearly separated inherited studio and new event work |
| `server/meta/asr-realtime.ts` and `server/meta/director.ts` | Participant transcription and Meta evidence-linked WAIT/ASK/LOOKUP decisions |
| `server/meta/research.ts`, `server/meta/research-review.ts`, `server/meta/session.ts` | Real web_search evidence; fresh-context WAIT/DELIVER/DISCARD/CANCEL; bounded permission, expiry and source rules |
| `server/agent/mc-agent.ts`, `server/agent/playout.ts` | Floor policy, Handoff/HOLD, late-output cancellation and audio transport |
| `tests/research.test.ts`, `tests/background-lookup.test.ts`, `tests/asr-pacing.test.ts` | Source validation, ongoing dialogue/race regressions and audio timing |
| [EVALUATION.md](EVALUATION.md) | Actual-provider session IDs, failed attempts and limitations |

The demo is **not** a general autonomous fact-checker. Explicit opt-in Research PD is required. Ordinary interventions need operator Handoff, and new speech does not authorize an unrelated autonomous AI monologue.

## Optional live provider reproduction (may incur charges)

Copy `.env.example` to an ignored local `.env`, add your **own** keys for `META_API_KEY`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, plus the deliberately selected speech provider. Default `TTS_PROVIDER=gemini` uses `GEMINI_API_KEY` and Kore; the recorded successful app path used explicit `TTS_PROVIDER=openai` with `OPENAI_API_KEY`. There is **no silent fallback**. External quotas can prevent a live spoken result.

Start the studio, enable Research PD in settings, connect a consenting participant and ask for a source during a conversation. For automated synthetic integration, the existing `scripts/probe-conversation.ts` uses OpenAI-generated **input fixtures** and real Meta services; supply authorized provider access. Such runs are paid, and are not a substitute for a human study.

## Security and limitations

The main localhost operator server is **not a public hosted app** and must not be tunneled for judges. The guest-only bundle is not proof of a publicly deployed and tested guest flow. Files in `output/` may contain voice tracks, transcripts and provider metadata; keep them private. No measured p95 latency, generalized fact accuracy, usability lift, real-world microphone acceptance or instantaneous interruption is claimed. See [readiness](SUBMISSION_READINESS.md) for publication and form gates.
