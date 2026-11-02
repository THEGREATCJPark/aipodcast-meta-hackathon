## Minimal submission improvement / Claude handoff — 2026-11-02

Product promise: **An AI research producer that lets speakers keep talking while it checks a requested reference.** New Judge summary displays recent identified speech, the actual research job, event-based state, answer/source and HOLD; details remain expandable. Model WAIT, application speech gating, generated TTS and server transport are distinguished. No listener-receipt claim appears in the UI.

Natural synthetic scenario: first full run `2026-11-02_1558_meta_1ffd` at `28cfabb` preserved conversation/search but rejected an invalid review response and sent no AI audio. One direct saved-context diagnostic returned DELIVER; root cause of the earlier malformed/absent payload is unresolved. The second and final full run `2026-11-02_1601_meta_6bac` at `89fd5f9` passed: five natural input lines, same research job during continued discussion, fresh review, a short sourced answer, 282 non-silent receiver frames and recordings. No engine change or answer injection. Failed evidence is preserved, not removed from the ledger.

Current checks: 112 tests, typecheck, build:web and build:guest passed; bundle-size warnings remain. Two small real synthetic-text edge checks returned differentiated attribution and an unsupported-claim qualification; the latter's broad negative wording remains a limitation, not a universal fact-checking success. Human trials are unverified. Late-result cancellation/withdrawal and research survival regressions pass. Earlier manual-HOLD raw footage/evidence is reused with an explicit separate-run label.

Deliverable: `output/handoff/claude-v2.zip`, relative-path assets under `output/handoff/claude-v2/`. Includes actual new 1600x900 raw footage, session audio/transcripts, minimal events, source/timing data, failure evidence and preserved earlier video/reference raw. HANDOFF.md defines permissible claims, edit estimates and approval gates. Final editing/narration/rendering belongs to Claude; none was newly generated in this phase. Public source/video release and final submission remain unperformed. Features frozen at this scope.

Earlier checkpoints below are historical.

## Submission scope freeze — 2026-11-02

Owner prioritizes submission completion. Freeze application features at 8688280; fix only demonstrated shooting/submission blockers. Follow FINAL_SHOOTING_GUIDE.md: one presenter, an actual contextual lookup, and manual HOLD/hold-state footage. A short microphone/AI capture check is required; two-human acceptance, external guest hosting and broad evaluation are deferred, not passed. Earlier sections below retain engineering targets but do not impose them as prerequisites for this solo video. Remaining delivery steps are actual English footage, export/link review, approved source/media publication and final form/terms/submission.

## Pre-filming update — 2026-11-02

Current automated checks: 107/107 tests, typecheck and main/guest builds. Capture now rejects unusable inputs and stops with a warning if audio is lost, preserving available footage. Private committed-source packaging and read-only local preparation checks are ready. Fourteen real Meta synthetic-text calls exposed and mitigated research overclaim and uncertainty-attribution issues; broader factual accuracy remains unproven. See EVALUATION.md for failures as well as passes.

**Decision: ready to attempt a supervised rehearsal, not certified as “only the final take remains.”** Remaining dependencies are actual microphone/capture acceptance, an HTTPS guest page if an external guest is used, and the owner's public-release/terms/submission approvals. Do not substitute synthetic trials for human acceptance. No public hosting or recording permission is silently assumed.

# Submission readiness — 2026-11-02 KST

Verdict: the stabilized whole-voice path passed three consecutive real-provider synthetic trials across two references, plus separate manual HOLD and automatic-interruption checks. Current checks passed 98 tests, typecheck, main/guest builds and script compilation. Final submission and human acceptance remain incomplete. Earlier failed calls are retained, and three passes do not establish broad statistical reliability or natural human usefulness.

The questioned Zones of Thought / Vernor Vinge title-URL pairing was independently resolved as a Wikipedia redirect on November 2; EVALUATION.md links the page and API evidence. That resolution does not validate all answer claims or establish a primary-source citation. Human testing and filming remain owner-deferred.
## Engineering gates

| Area | Observed state | Next evidence required |
|---|---|---|
| Current stabilization | 98 tests, typecheck, main/guest builds and script compilation passed; latest full voice path passed three consecutive synthetic trials | Human acceptance and varied real conversation remain separate |
| Research lifetime during continued conversation | Regression tests and actual-provider two-synthetic-speaker trial passed; fresh Meta review precedes output | Human conversation and varied real requests; source quality check |
| Meta runtime web research at prior checkpoint | Implemented; direct and integrated Studio synthetic-input lookup passed with provider-annotated source after clock-based pacing fix. Earlier failed buffer-overflow trial retained in ledger | Human conversational acceptance, broader paraphrase/contradictory-source trials and listener quality remain |
| Spoken request permission | Local opt-in research mode implemented, off by default; intended only for explicit spoken lookup requests | Verify disabled mode, contextual paraphrases and no unsolicited research/speech |
| Search citations / stages | Parser regressions fixed; selected NASA/Graphcore claims manually checked; Wikipedia redirect confirmed; all three latest trials returned sources | Broader and contradictory-source claims; no general factual accuracy guarantee |
| Current input scenario | Distributed-clue English singularity scene prepared, plus Vinge/1993, correction, ambiguity, unsupported claim and ordinary-peer-question cases | Actual Meta answer identified Good with a Virginia Tech paper-scan citation in synthetic-input trial; human rehearsal deferred |

## Human acceptance — deferred by owner

| Area | Remaining evidence |
|---|---|
| Two people plus AI | Real microphone sessions, overlap, identity and external guest behavior |
| Spoken research | Natural contextual request, source inspection, brief answer and return to conversation |
| Cancellation | Synthetic automatic-interruption and separate HOLD trials passed; human listener acceptance and topic-change trials remain |
| Capture and video | Ten-second tab/microphone channel check, actual three-minute English capture and final export review |

No human success or completed footage is claimed. See HUMAN_ACCEPTANCE.md and DEMO_SCRIPT.md when the owner resumes filming.

## Release / eligibility / form gates

| Area | State and required action |
|---|---|
| Public source | Still PRIVATE. Authenticated official guide and actual form confirm public source required; review history/content and obtain owner approval before publication |
| Applicable rules | Owner reports idea change allowed and instructs no organizer questions. Proceed with explicit baseline/new-work/TTS disclosure; interpretation limits retained, no eligibility guarantee |
| Judge access | Prepare source reproduction plus required video; no live URL field observed. Do not add public hosting or costs without a demonstrated need and approval |
| Submission form | Actual authenticated form inspected; exact field mapping and English copy prepared. No client maxlength observed; server limits unknown. Owner supplies subjective survey answers, confirms team/track, reviews promotional permission. No entries transmitted |
| Voice/face rights | Separate public-release consent needed for any recorded participants |
| Final freeze / transmission | Freeze source after validation, review final copy, obtain terms/submission authorization, retain receipt |

These release gates remain even if the research code and video pass. Source implementation, synthetic provider probes, human acceptance, public publication and actual submission are separate milestones.
