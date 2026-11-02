# Pre-filming preparation checkpoint — 2026-11-02

Capture loss handling and private packaging are implemented. Current checks passed 107 tests, typecheck and web/guest builds. Actual Meta edge evaluation found and mitigated two source/uncertainty failures; results and retained failures are in EVALUATION.md. A read-only local check is available with `npx tsx scripts/preflight.ts`; after a reviewed clean commit, `npx tsx scripts/prepare-submission.ts` generates a private ZIP and hash manifest. Neither command publishes anything or proves human acceptance.

Still not “only filming remains”: real two-human microphone/capture acceptance is unavailable without participants; the isolated external guest page is built but not hosted; public release/voice consent/terms/submission await owner approval. The ready English script includes a ten-second capture check and rehearsal order. Prompt mitigation does not guarantee source truth. Keep the original project untouched and do not expose the local operator server.

# Status — 2026-11-02 KST

## Current stabilization — 2026-11-02

98 automated tests, typecheck, main/guest builds and standalone script compilation passed. Baseline **11b9e76** passed an actual-provider synthetic retest. The latest parser/full-natural-continuation path then passed three consecutive real-provider synthetic sessions: `2026-11-02_1145_meta_a321`, `2026-11-02_1146_meta_e51e`, and `2026-11-02_1147_meta_d484`. Both Vinge and Good scenarios preserved research across speech, waited for fresh Meta release, received audio and saved valid WAVs. Manual HOLD (`1149_meta_cf7f`) and automatic interruption (`1149_meta_05ba`) also passed separately with zero late frames in defined observation windows. Exact evidence, source checks and timing limits are in EVALUATION.md.

The earlier failed research repeat and subsequent parser diagnostics remain recorded in EVALUATION.md. They are historical failures, not the latest baseline-retest result. Ordinary speech preserves the independent research job while interrupting audio; a fresh Meta review assesses current relevance before delivery. Broad provider reliability and human usefulness remain unestablished.

The previously questioned Wikipedia title/URL pairing is resolved: independent page and official API checks on November 2 confirmed that Zones of Thought redirects to Vernor Vinge, section Zones of Thought series. This explains that link pairing only, not all answer accuracy or primary-source quality. Sources and the historical uncertainty are retained in EVALUATION.md.
The independent repository default branch is now `hackathon/meta-2026` and remains PRIVATE. The original repository was not modified. This resolves the judge landing-page issue without rewriting either main branch.

Human trials and filming remain deferred by the owner. No new rules inquiry or human input is needed to continue this engineering work.

## Earlier implementation and test checkpoints — historical scope

Independent PRIVATE source-snapshot repository; baseline ac71d68, branch hackathon/meta-2026. Original repository preserved. Final submission SHA is not frozen.

The co-host retains React/Vite/Express/LiveKit and recording. Meta handles per-participant ASR and contextual WAIT/ASK/CLARIFY/SUMMARIZE/LOOKUP decisions. OpenAI TTS voices selected text. Handoff remains the default speech gate. The optional local `researchEnabled` setting is off by default; when enabled, an explicit spoken lookup can run Meta Responses web_search and release a cited answer without another handoff. Ordinary conversation does not receive this speech exception.

Research has completed-search/citation validation, bounded source evidence, eight attempts per session, one attempt per request utterance, a 25-second timeout and the earlier cancellation policy on speech, HOLD, stop or permission change. The normal-speech part has been superseded by the separate research job described above. Errors remain WAIT/error and preserve recording; no other LLM substitutes. Source links need inspection and do not guarantee factual correctness. See ARCHITECTURE.md.

English Studio/Judge views, local 180-second tab+microphone WebM capture and an isolated guest static build are implemented. Capture is local only; guest bundle is not deployed.

## Tested checkpoints

- Original baseline: 29 tests, typecheck and build passed.
- Manual-handoff English checkpoint 1999c92: 49 tests, typecheck, main/guest builds and CI passed. Actual-provider synthetic English Studio probe demonstrated transcript, WAIT, handoff ASK, remote audio receipt, HOLD state and exported artifacts.
- Research working branch: root verification reports 68 automated tests and typecheck passed, including opt-in, cancellation and pacing regressions. Final root main web and isolated guest builds passed. See EVALUATION.md for exact checkpoint scopes.
- Real-provider research probe initially returned incomplete at a 1,200-token output budget and was rejected. Request now uses low reasoning with a 2,400-token output budget. Two later actual calls completed search but lacked URL annotations and were rejected. The fallback citation representation accepts only final-answer links exactly matched to actual search results, distinctly labeled from provider annotations. A direct actual research call subsequently passed with a provider-annotated Virginia Tech paper scan (7,211 ms application request/completion interval). The first full Studio research trial failed on ASR buffer overflow and correctly cancelled research while preserving recording. After the clock-based pacing fix, integrated synthetic English Studio session 2026-11-02_1043_meta_df01 passed: four ASR transcripts, LOOKUP without Handoff, real provider-annotated search, TTS, 418 non-silent remote AI frames, HOLD state and saved artifacts with no probe errors. Search request/completion was 6,861 ms, not end-to-end latency.

## Human acceptance and filming — owner deferred

A separate synthetic-input automatic-interruption trial passed with zero late AI frames during a three-second observation after speech/silence and a two-second grace interval; HOLD occurred only afterward. Actual human discussion, precise interruption latency and browser capture acceptance remain unverified. Human microphone trials, research request relevance, automatic interruption versus manual HOLD, topic changes, reconnection/identity and external guests remain pending. English acceptance and production materials are ready for later use; the owner has deferred filming while engineering validation continues.

## Release / rules / form blockers

The authenticated guide, waiver and form were read on November 2 at 10:48 KST. Required public source, three-minute video, contributors, single entry and event-contribution disclosure are confirmed. Fields/copy are in SUBMISSION_FORM.md and SUBMISSION.md. The owner subsequently reported idea changes allowed and directed continuation without organizer questions. Prepare reproducible source plus video; no standalone live URL field was observed. Inherited-code/TTS interpretations remain disclosed rather than blocking private preparation. Publication/terms/submission approvals remain in docs/hackathon/APPROVALS.md; the organizer draft is archived.

Repository remains private pending explicit publication approval. No public app, finished video, public voice/face-release approval, final terms acceptance or submission receipt exists. SUBMISSION_READINESS.md separates engineering, human and release gates; this is not “only filming remains.”

## Limits and scope

No automatic ASR retries. After ASR failure, Resume authorizes one reconnect attempt per participant identity; another failure requires session restart. Usage limits are not a verified dollar spending ceiling. The research addition is focused lookup on request, not broad autonomous fact checking. Advanced lip sync, long editing, multiple AI panels and social publishing remain excluded. The independent presentation uses relaxed, candid pacing and short witty questions without presenter voice imitation or show branding.

Internal package target: November 4 evening KST. Publicly announced deadline: November 5, 11:00 KST, subject to official change. Preparation is not submission.


## Reliability audit — 2026-11-02

Current local audit checks passed: **80/80 tests**, typecheck, main web build and guest-only build. Large-chunk build warnings remain. Post-audit real-provider synthetic sessions `2026-11-02_1103_meta_8d3c` (lookup/automatic interruption/WAIT) and `2026-11-02_1105_meta_62e4` (separate manual HOLD) also passed, with zero late receiver frames in their bounded observation windows and saved exports. See EVALUATION.md for timing limits and private evidence paths. Human tests remain deferred.

ASR failure now holds output, records a gap and blocks decisions while transcription is unavailable. Resume grants one reconnect attempt per identity, with possible lost transcription explicitly recorded; this is not an automatic retry loop. Fresh queued handoffs retain their generation/revision and are invalidated by speech, HOLD, context or permission changes.

Concurrent stop/leave operations now share completion, and session start is blocked during transitions. Failed startup leaves the room. Participant recording filenames use a hash of the full identity to avoid collisions between equal name/suffix combinations. Browser join/control/capture operations have duplicate-action and cleanup guards, and disconnected studio controls expose a recoverable error state. These changes do not establish a successful human microphone/capture trial: both remain deferred by the owner.
