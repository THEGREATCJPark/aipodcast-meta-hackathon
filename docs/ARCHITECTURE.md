# Architecture and operating boundaries

The application retains React/Vite, TypeScript, Express, LiveKit and the existing recorder. The operator server listens on 127.0.0.1:4400. It is a local studio, not a production multi-tenant service.

## Audio and evidence

LiveKit supplies participant audio at PCM16 mono 24 kHz. Participant identity is transport metadata, not an identity guessed from an anonymous transcription label. The recorder writes per-identity human WAVs and an MC track on a shared session timeline. The MC recording represents server-sent audio; it does not prove what a remote listener heard. Session export produces a mix, transcript, event ledger, settings and summary under ignored output/. Settings and transcripts are private session data.

Meta's roles are speech recognition and the contextual WAIT/ASK/CLARIFY/SUMMARIZE decision. Speech synthesis is a separate provider. GPT/Gemini legacy engines are inherited comparison code, not a fallback for failed Meta decisions. Model output must pass schema and evidence-reference validation before speech. No hidden chain of thought is requested.

## Control contract

Human speech invalidates pending spoken-response generation and clears playback. Opted-in background lookup classification and an authorized research job may continue without granting speech permission. Unclassified utterance IDs are sent to Meta together so a lookup request between quick turns is not overwritten. Only Meta selects an explicit request; no keyword rule determines content. HOLD, resume, shutdown and permission revocation invalidate pending classification. Every researched answer requires a fresh Meta review of the current context and a clear floor before TTS. New speech or final transcripts abort obsolete review requests without cancelling the research job. A context revision prevents an old question entering a newer discussion. Cancellation needs checks before TTS and again before output chunks, plus playback-queue clearing. An AbortSignal alone cannot guarantee an upstream service stopped working; stale-result rejection remains necessary. Model-generated text, synthesized sound and server-sent audio are different evidence stages. Human hearing requires a separate observation.

Current implementation details and tested guarantees must be read with EVALUATION.md; this contract is not a claim of successful live verification. The default should be human handoff until automatic intervention has sufficient actual evaluation.

## Security and data

The local server applies Host/Origin checks, a 256 KB JSON limit and a WebSocket origin check. These are not internet operator authentication. Do not expose the local management server by changing its bind address or tunneling it. A public deployment needs authenticated host/guest/viewer roles, room/session isolation, minimal expiring guest grants, rate limits and validated HTTP/WS origins. External guest and cross-session authorization remain separate acceptance tests.

Credentials stay server-side in a local ignored .env file. Never place them in browser variables, event logs or committed files. People must consent to recording and provider transmission before joining; public voice/video release requires separate consent. No automatic public uploads are configured. Local output is retained until the operator deletes the relevant session folder; no automatic retention guarantee is provided. Provider retention is governed by the selected account's terms and must be reviewed before sensitive sessions.

A persistent Node worker is required for LiveKit and recording. There is no verified public judge deployment or hosting cost/availability commitment. Static video/replay cannot be represented as an interactive live application.

## Meta implementation in this branch

Each LiveKit participant identity has a separate Meta realtime ENDPOINTING stream with PCM 24 kHz input. Handshake gaps are explicitly logged; the original recorder retains the incoming source audio. There is no automatic ASR retry loop. ASR failure holds output and records a gap; Resume authorizes one reconnect attempt per identity, and a failed retry requires session restart. Anonymous ASR labels are not used to invent participant identity.

The Meta director uses the 30 most recent utterances and validates action, evidence references and context revision. Manual host handoff is the default speech permission gate. The optional explicit-lookup exception is described below. Ordinary discussion turns can recommend or WAIT but do not start autonomous playback. Meta-selected text is rendered by OpenAI TTS (tts-1/alloy defaults), not a second moderation LLM. Environment overrides exist for the documented models; the configured models passed actual provider probes with synthetic input.

Generated decision metadata, generated TTS WAV and server-sent mc.wav are separate evidence. Limits are 15 minutes of provider work, four ASR streams, 60 director calls and 30 seconds of TTS per response; no automatic provider retry loop is used. The explicit ASR recovery exception is described below. There is no verified dollar-denominated cost ceiling. These source-level controls require actual session evaluation and must not be presented as measured voice performance.

## Optional research PD

`researchEnabled` is a local operator setting, off by default. The Meta director can return LOOKUP with a focused query, empty prewritten speech and a reference to the latest requesting utterance. Its instructions restrict this to explicit lookup requests and exclude quotations or mere curiosity. This classification is model behavior and needs adversarial/real-input evaluation; schema validation alone does not prove that a request was semantically explicit.

When enabled, LOOKUP uses Meta's `/v1/responses` endpoint with the `web_search` tool and included tool results. The request sends the query and up to 30 recent text utterances (up to 6,000 characters each), not participant identity fields, so clues can span speakers and turns. A valid result requires a completed search call and completed answer. Sources distinguish `provider-annotation` (provider citation with valid spans) from `model-linked-search-result` (a URL selected in the final answer that exactly matches an actual returned search result). For model-linked sources, recorded spans locate the Markdown link, not a provider-asserted factual-claim span; titles come from the matched returned result. Exact matching examines safe hits from completed calls within a 1,000-hit validation limit and the 256 KB response cap; only afterward are up to ten selected sources/results/call IDs retained for display. Selected evidence is prioritized, so display truncation cannot reject a valid later hit. Balanced parentheses in source URLs are preserved. Unselected raw results are not promoted to citations. Sources are links reported by Meta, not proof that every factual claim is true. The model is instructed to prefer primary sources and qualify conflicting evidence.

The bounded research path allows eight attempted searches per session, one attempt per requesting utterance, a 25-second request timeout and a 256 KB response cap. Requested/completed times, search call IDs, answer, sources, query and disposition are recorded. These application timestamps are not webpage publication dates or precise fetch timestamps for each source. There is no new research provider key: Meta uses the configured director model and META_API_KEY. Search may consume additional provider quota.

One active or ready research job has its own cancellation controller and a 60-second lifetime. Normal speech/transcripts preserve it. New transcripts and research completion trigger a separate Meta review using the latest 30 turns, original request and returned sources: WAIT, DELIVER, DISCARD or CANCEL. Meta detects explicit withdrawal and obsolete topics; no keyword list substitutes for its decision. The review has a 15-second timeout and 60-call/session cap. Failed review stays silent. A result is delivered only on a fresh revision, clear floor and available ASR; ready results may expire rather than force an interruption. DELIVER text is at most 220 characters, instructed to contain a source and one factual sentence. Sources/full result remain in the ledger. The job is consumed once before TTS, so interrupted delivery does not replay. Other spoken responses still require handoff. HOLD, stop and research permission changes cancel jobs and output; checks repeat before TTS and chunks. TTS remains OpenAI, rendering Meta-selected text without fallback.

Timing evidence separates server VAD end (not a measured physical utterance end), ASR log arrival, director/search/review events, complete buffered TTS generation and first non-silent frame accepted by the server transport. The integration probe separately records receiver frame arrival on the same computer clock. Neither transport acceptance nor receiver frame arrival proves perceptual hearing. The old header latency is a server indicator, not a conversational end-to-end metric.

Implementation and provider-probe results are tracked in EVALUATION.md; human research dialogue and listener-observed cancellation remain separate acceptance work. Broad autonomous fact checking is outside scope.


## Audit controls — 2026-11-02

ASR streams are marked unavailable while connecting or failed. Decisions and handoffs are blocked until required transcription is available. A failed stream is closed, output is held and an `asr-gap-start` event records retry availability. Resume explicitly authorizes one new connection per failed participant identity; subsequent audio creates that stream. Successful recovery records `asr-connected` with a possible audio gap. It does not backfill untranscribed audio or promise uninterrupted context. Late callbacks from replaced/failed streams are ignored. Repeated failure requires restart.

A handoff made while previous work is cancelling may be queued only with the current generation and context revision and a clear human floor. The queue is checked again before execution and cleared by cancellation/HOLD/close; a newer conversation cannot inherit an old permission to speak. Handoff during human speech is not queued.

McAgent serializes repeated stop and leave requests and blocks start during lifecycle transitions, avoiding export/recorder ownership crossing into a new session. Failed startup leaves the room. Recording filenames now include a 16-hex-character SHA-256 prefix of the full participant identity rather than only its last four characters; this prevents the observed name/suffix collision class without claiming mathematical collision impossibility.

The UI blocks ordinary duplicate controls while requests are pending but keeps HOLD available. WebSocket recovery refreshes current state and ignores stale/unreadable updates; controls are unavailable while disconnected. Guest joins and capture starts have in-flight guards and cleanup for abandoned browser operations. Capture remains local and still requires real audio/channel acceptance.
