# Status — 2026-11-02 KST

## Implemented

Independent PRIVATE source-snapshot repository; baseline ac71d68, branch hackathon/meta-2026. Original repository preserved. Final submission SHA is not frozen.

The co-host retains React/Vite/Express/LiveKit and recording. Meta handles per-participant ASR and contextual WAIT/ASK/CLARIFY/SUMMARIZE/LOOKUP decisions. OpenAI TTS voices selected text. Handoff remains the default speech gate. The optional local `researchEnabled` setting is off by default; when enabled, an explicit spoken lookup can run Meta Responses web_search and release a cited answer without another handoff. Ordinary conversation does not receive this speech exception.

Research has completed-search/citation validation, bounded source evidence, eight attempts per session, one attempt per request utterance, a 25-second timeout and stale cancellation on speech, HOLD, stop or permission change. Errors remain WAIT/error and preserve recording; no other LLM substitutes. Source links need inspection and do not guarantee factual correctness. See ARCHITECTURE.md.

English Studio/Judge views, local 180-second tab+microphone WebM capture and an isolated guest static build are implemented. Capture is local only; guest bundle is not deployed.

## Tested checkpoints

- Original baseline: 29 tests, typecheck and build passed.
- Manual-handoff English checkpoint 1999c92: 49 tests, typecheck, main/guest builds and CI passed. Actual-provider synthetic English Studio probe demonstrated transcript, WAIT, handoff ASK, remote audio receipt, HOLD state and exported artifacts.
- Research working branch: root verification reports 68 automated tests and typecheck passed, including opt-in, cancellation and pacing regressions. Final root main web and isolated guest builds passed. See EVALUATION.md for exact checkpoint scopes.
- Real-provider research probe initially returned incomplete at a 1,200-token output budget and was rejected. Request now uses low reasoning with a 2,400-token output budget. Two later actual calls completed search but lacked URL annotations and were rejected. The fallback citation representation accepts only final-answer links exactly matched to actual search results, distinctly labeled from provider annotations. A direct actual research call subsequently passed with a provider-annotated Virginia Tech paper scan (7,211 ms application request/completion interval). The first full Studio research trial failed on ASR buffer overflow and correctly cancelled research while preserving recording. After the clock-based pacing fix, integrated synthetic English Studio session 2026-11-02_1043_meta_df01 passed: four ASR transcripts, LOOKUP without Handoff, real provider-annotated search, TTS, 418 non-silent remote AI frames, HOLD state and saved artifacts with no probe errors. Search request/completion was 6,861 ms, not end-to-end latency.

## Human acceptance and filming — owner deferred

A separate synthetic-input automatic-interruption trial passed with zero late AI frames during a three-second observation after speech/silence and a two-second grace interval; HOLD occurred only afterward. Actual human discussion, precise interruption latency and browser capture acceptance remain unverified. Human microphone trials, research request relevance, automatic interruption versus manual HOLD, topic changes, reconnection/identity and external guests remain pending. English acceptance and production materials are ready for later use; the owner has deferred filming while engineering validation continues.

## Release / rules / form blockers

Participant-supplied instructions require public source, a three-minute video, contributor listing, one entry per team and event-contribution disclosure. Source attribution and rubric are in RULES.md. Indie reuse, application-idea change, external TTS permission and exact form/deployment requirements remain unresolved.

Repository remains private pending explicit publication approval. No public app, finished video, public voice/face-release approval, final terms acceptance or submission receipt exists. SUBMISSION_READINESS.md separates engineering, human and release gates; this is not “only filming remains.”

## Limits and scope

No automatic ASR reconnect; restart required. Usage limits are not a verified dollar spending ceiling. The research addition is focused lookup on request, not broad autonomous fact checking. Advanced lip sync, long editing, multiple AI panels and social publishing remain excluded. The independent presentation uses relaxed, candid pacing and short witty questions without presenter voice imitation or show branding.

Internal package target: November 4 evening KST. Publicly announced deadline: November 5, 11:00 KST, subject to official change. Preparation is not submission.
