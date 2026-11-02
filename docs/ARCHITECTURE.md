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

The Meta director uses the 30 most recent utterances and validates action, evidence references and context revision. Manual host handoff is the default speech permission gate. The optional explicit-lookup exception is described below. Ordinary discussion turns can recommend or WAIT but do not start autonomous playback. Meta-selected text is rendered by OpenAI TTS (tts-1/alloy defaults), not a second moderation LLM. Environment overrides exist for the documented models; the configured models passed actual provider probes with synthetic input.

Generated decision metadata, generated TTS WAV and server-sent mc.wav are separate evidence. Limits are 15 minutes of provider work, four ASR streams, 60 director calls and 30 seconds of TTS per response; no retry loop is used. There is no verified dollar-denominated cost ceiling. These source-level controls require actual session evaluation and must not be presented as measured voice performance.

## Optional research PD

`researchEnabled` is a local operator setting, off by default. The Meta director can return LOOKUP with a focused query, empty prewritten speech and a reference to the latest requesting utterance. Its instructions restrict this to explicit lookup requests and exclude quotations or mere curiosity. This classification is model behavior and needs adversarial/real-input evaluation; schema validation alone does not prove that a request was semantically explicit.

When enabled, LOOKUP uses Meta's `/v1/responses` endpoint with the `web_search` tool and included tool results. The request sends the query and only the last three text utterances (up to 500 characters each), not participant identity fields. A valid result requires a completed search call and completed answer. Sources distinguish `provider-annotation` (provider citation with valid spans) from `model-linked-search-result` (a URL selected in the final answer that exactly matches an actual returned search result). For model-linked sources, recorded spans locate the Markdown link, not a provider-asserted factual-claim span; titles come from the matched returned result. Matching is against the first ten safe results. Unselected raw results are not promoted to citations. Sources are links reported by Meta, not proof that every factual claim is true. The model is instructed to prefer primary sources and qualify conflicting evidence.

The bounded research path allows eight attempted searches per session, one attempt per requesting utterance, a 25-second request timeout and a 256 KB response cap. Requested/completed times, search call IDs, answer, sources, query and disposition are recorded. These application timestamps are not webpage publication dates or precise fetch timestamps for each source. There is no new research provider key: Meta uses the configured director model and META_API_KEY. Search may consume additional provider quota.

A successful opted-in lookup can release its short answer without another Handoff, after the floor/context guard passes. Other spoken responses still require handoff. Human speech, HOLD, stop, changed context or permission changes invalidate pending work; checks repeat before TTS and chunks. Failure stays WAIT/error and recording continues, with no fallback model. Disabling research cancels pending output. TTS remains OpenAI and only renders the Meta answer.

Implementation and provider-probe results are tracked in EVALUATION.md; human research dialogue and listener-observed cancellation remain separate acceptance work. Broad autonomous fact checking is outside scope.
