# AI Conversation Director

A Meta-powered co-host that listens to human discussions, waits when it should, and asks grounded follow-up questions when useful.

**Private development build. Meta ASR/director, OpenAI TTS and LiveKit passed a real-provider probe with synthetic Korean audio. Human voice sessions remain unverified.** This project reuses an existing studio; see [provenance](docs/PROVENANCE.md) and [hackathon disclosure](HACKATHON.md). Applicable-track reuse eligibility remains unresolved. Owner-supplied participant instructions require a public repository and a three-minute video; see the source distinctions in RULES.md.

## Run locally

Use Node 22.22 or later within the supported Node 22 line, and npm. Earlier Node 22.18 installed successfully but emitted a dependency engine warning.

```sh
npm ci
npm run dev
```

Open http://localhost:4400. The studio can be inspected without provider credentials. Audio operation needs local server-only credentials and a LiveKit service. Put credentials only in this independent project's ignored .env, using .env.example as the variable reference. Never copy original private settings, recordings or tokens. Do not send key values through chat.

```sh
npm test
npm run typecheck
npm run build:web
```

## Experience and evidence

The intended path is human audio → Meta transcription → Meta contextual decision → human-controlled speech gate → separate TTS → LiveKit playback → separated audio and execution evidence. Meta errors must remain visible and must not silently route to another LLM. Live means new human input and actual model calls; replay means a previously recorded consenting session; synthetic tests are fixtures. These are not interchangeable.

The operator can use HOLD, resume and handoff. A completed build or a passing fixture does not prove automatic interruption at the listener. [Evaluation](docs/EVALUATION.md) records baseline and subsequent checks separately and lists unverified real-world behavior.

## Judge access and limits

Local source execution is the current access path. No public app, public replay or submitted video is available. Do not tunnel the management server. External guest use requires consent and a verified deployment/access path. No latency, accuracy or time-savings claim has been measured for Meta.

Session artifacts stay in ignored output/ and include sensitive audio/transcripts/settings. Do not publish them automatically. See [architecture](docs/ARCHITECTURE.md), [status](docs/STATUS.md), [rules](docs/hackathon/RULES.md), [demo script](docs/DEMO_SCRIPT.md) and [submission draft](docs/SUBMISSION.md).

## Implemented provider roles

- Meta realtime ASR: `META_ASR_MODEL` (default `muse-voice-transcribe-1.0`), using one ENDPOINTING stream per participant identity.
- Meta director: `META_DIRECTOR_MODEL` (default `muse-spark-1.3`), with validated WAIT/ASK/CLARIFY/SUMMARIZE output and utterance references.
- **OpenAI TTS**: `TTS_MODEL` (default `tts-1`) and `TTS_VOICE` (default `alloy`). It renders Meta's chosen text; it does not decide how to moderate.

Set `META_API_KEY`, `OPENAI_API_KEY`, `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` locally for live operation. The configured models passed actual account/provider probes with synthetic input. Human microphone and full Studio acceptance remain pending.

The initial mode requires operator handoff to release speech. Ordinary turns can produce WAIT or a recommendation but do not automatically speak. Input context is capped at 30 recent utterances. Provider work is limited to 15 minutes, four ASR streams, 60 director calls and 30 seconds of TTS per response, without retries. These are usage limits, **not a verified dollar spending cap**. ASR handshake gaps are logged while source WAV recording is retained. Automatic ASR reconnection is not implemented; restart the session.



## English demo preparation

Follow [human acceptance and filming](docs/HUMAN_ACCEPTANCE.md) before recording the [three-minute English demo](docs/DEMO_SCRIPT.md). The local capture panel requires a connected microphone and explicit browser tab selection with “Share tab audio.” It offers a local WebM preview/download capped at 180 seconds; verify a ten-second sample first. No automatic upload is performed.

`npm run build:guest` prepares a guest-only static bundle at `dist/guest` for future approved HTTPS hosting. It is not a public deployment. Publishing the repository, guest site or personal recordings requires separate owner approval. The original SPNS TV reference informs only general relaxed, candid pacing and short witty questions; the submission presents an independent co-host without logos, copied signature lines or presenter voice imitation.
