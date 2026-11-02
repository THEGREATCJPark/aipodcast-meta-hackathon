# Architecture and operating boundaries

The application retains React/Vite, TypeScript, Express, LiveKit and the existing recorder. The operator server listens on 127.0.0.1:4400. It is a local studio, not a production multi-tenant service.

## Audio and evidence

LiveKit supplies participant audio at PCM16 mono 24 kHz. Participant identity is transport metadata, not an identity guessed from an anonymous transcription label. The recorder writes per-identity human WAVs and an MC track on a shared session timeline. The MC recording represents server-sent audio; it does not prove what a remote listener heard. Session export produces a mix, transcript, event ledger, settings and summary under ignored output/. Settings and transcripts are private session data.

Meta's roles are speech recognition and the contextual WAIT/ASK/CLARIFY/SUMMARIZE decision. Speech synthesis is a separate provider. GPT/Gemini legacy engines are inherited comparison code, not a fallback for failed Meta decisions. Model output must pass schema and evidence-reference validation before speech. No hidden chain of thought is requested.

## Control contract

Human speech, HOLD, shutdown and restart must invalidate pending generation. A context revision prevents an old question entering a newer discussion. Cancellation needs checks before TTS and again before output chunks, plus playback-queue clearing. An AbortSignal alone cannot guarantee an upstream service stopped working; stale-result rejection remains necessary. Model-generated text, synthesized sound and server-sent audio are different evidence stages. Human hearing requires a separate observation.

Current implementation details and tested guarantees must be read with EVALUATION.md; this contract is not a claim of successful live verification. The default should be human handoff until automatic intervention has sufficient actual evaluation.

## Security and data

The local server applies Host/Origin checks, a 256 KB JSON limit and a WebSocket origin check. These are not internet operator authentication. Do not expose the local management server by changing its bind address or tunneling it. A public deployment needs authenticated host/guest/viewer roles, room/session isolation, minimal expiring guest grants, rate limits and validated HTTP/WS origins. External guest and cross-session authorization remain separate acceptance tests.

Credentials stay server-side in a local ignored .env file. Never place them in browser variables, event logs or committed files. People must consent to recording and provider transmission before joining; public voice/video release requires separate consent. No automatic public uploads are configured. Local output is retained until the operator deletes the relevant session folder; no automatic retention guarantee is provided. Provider retention is governed by the selected account's terms and must be reviewed before sensitive sessions.

A persistent Node worker is required for LiveKit and recording. There is no verified public judge deployment or hosting cost/availability commitment. Static video/replay cannot be represented as an interactive live application.

## Meta implementation in this branch

Each LiveKit participant identity has a separate Meta realtime ENDPOINTING stream with PCM 24 kHz input. Handshake gaps are explicitly logged; the original recorder retains the incoming source audio. There is no automatic ASR reconnect; restart is required. Anonymous ASR labels are not used to invent participant identity.

The Meta director uses the 30 most recent utterances and validates action, evidence references and context revision. Manual host handoff is the speech permission gate. Ordinary turn decisions can recommend or WAIT but do not start autonomous playback. Meta-selected text is rendered by OpenAI TTS (tts-1/alloy defaults), not a second moderation LLM. Environment overrides exist for the documented models; account availability remains unverified.

Generated decision metadata, generated TTS WAV and server-sent mc.wav are separate evidence. Limits are 15 minutes of provider work, four ASR streams, 60 director calls and 30 seconds of TTS per response; no retry loop is used. There is no verified dollar-denominated cost ceiling. These source-level controls require actual session evaluation and must not be presented as measured voice performance.
