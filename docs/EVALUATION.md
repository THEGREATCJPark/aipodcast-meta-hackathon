## Cadence revision — 2026-11-03 KST

Current commands: `npm test` (123 passed, zero failed), `npm run typecheck`, `npm run build:web`. Eight new regression cases cover background lookup under continued speech, queued requests between rapid turns, stale ASK rejection, hold/close/resume/permission invalidation, and immediate cancellation of an obsolete review. Failures were reproduced before the respective fixes.

Four actual-provider synthetic diagnostic sessions, including two failures, are recorded in [MEDIA_V6.md](MEDIA_V6.md). Latest successful execution: `2026-11-03_1119_meta_c98b`, clean SHA `b4775198afe385f6be05ef46a7d8d6b62d979dfb`. Sender end → first AI receiver audio was 12,689 ms; no human acoustic or perceptual timing was measured. Median host vocal gap in the recording was 0.420 s. This is not a performance or reliability benchmark. Human trials and human listening acceptance remain unverified.

Gemini model discovery succeeded, but host/audio-video generation and a requested retry failed with HTTP 429 monthly-spending-cap errors. The listening control uses OpenAI inputs and real Meta responses, not Gemini outputs.

## Recovered podcast handoff — 2026-11-02, 19:12 KST

**Supersedes the earlier STOP/fallback-only status below.** The owner authorized diagnosing and correcting the blocker. An instrumented actual failure (`2026-11-02_1906_meta_a2a7`) confirmed completion-limit exhaustion: 1000 total tokens, 998 reasoning tokens, no visible content. The review budget is now 4096; incomplete envelopes are explicitly rejected/classified. The 220-character speech cap, TTL, timeout, revision guards, HOLD and cancellation remain unchanged. No fallback model or automatic retry was added. See [diagnosis](META_REVIEW_DIAGNOSIS.md).

Two consecutive post-fix full runs passed at clean execution SHA `564027cfb9eefaf6cdba49c43b53563a6fc6582a`: `2026-11-02_1908_meta_adc9` (recorded, 423 non-silent AI receiver frames) and `2026-11-02_1910_meta_6222` (repeat, 276 frames). Both include actual search, Meta WAIT and DELIVER, two identified synthetic speakers, no AI during continued discussion, sourced audio and both post-answer lines. The lines were prewritten synthetic fixtures triggered after actual answer audio ended, not spontaneous humans. This is not a reliability statistic.

**Claude input: `output/handoff/claude-v3-ready.zip` (25 files, 29,011,405 bytes)** and same-name folder. This is the SUCCESS package; `claude-v3.zip` remains the earlier FAILURE package. Includes actual 1600x900/25fps video-only raw, same-session WAVs, synchronized preview, events, transcript, timing, edit guide, repeat evidence and confirmed pre-fix failure. Final editorial video remains Claude's task. Existing v2 is preserved. ZIP SHA256: `6b50c899c4bf0679425923ab9daaf44f6efeb9838be90eed0907144ce0988a84`.

Raw capture has an explicitly labeled post-session editorial synchronization marker; exclude it from final. Preview already excludes it. Mix offset is estimated from that marker and session-start time, with several-frame uncertainty, not an acoustic alignment measurement. Core pauses remain: approximately 10.8 seconds from last continued-input sender end to first receiver-observed AI audio. The current UI may label subsequent speech as output interruption even after the answer has finished; do not present that status as an automatic-interruption demonstration. Source URL redirects to the Vernor Vinge Wikipedia article, independently inspected, and remains a secondary source.

115 tests, typecheck, build:web and build:guest passed. Full preview decode passed; selected speech RMS is substantive, matching-mix correlations exceed .98 allowing 0.375ms codec/seek lag. Original zero-lag failures are retained in QA. Archive integrity/hashes passed and selected text files contained no exact configured-secret matches. Full human listening and final-video QA remain pending; no public upload or submission performed.

## Podcast revision outcome — 2026-11-02, 18:38 KST

**New podcast-focused take not completed. Existing Claude v2 remains the fallback; no successful v3 is claimed.** Product display name is now Conversation Co-host. Engine behavior was frozen. A standalone podcast fixture added longer topic discussion and two prewritten post-answer lines, conditional on a real sourced response.

Two bounded actual-provider attempts at HEAD `7c3ed789c0a107a58146b09c63201c7c200fd427` failed: `2026-11-02_1835_meta_1781` and `2026-11-02_1837_meta_12dc`. Both returned search results and real Meta WAIT decisions, then rejected a relevance review as `invalid_response / invalid_type` at root. Zero received non-silent AI frames; no post-answer lines were sent. Recording exports survived. Root cause is unresolved; no engine fix, third attempt or substituted response was made. The second run's dirty tree contained in-progress packaging/documentation work.

`output/handoff/claude-v3.zip` is a **failure/status handoff**, containing both actual 1600x900 video-only captures, matching app mixes, transcripts, events and hashes. It is NOT a replacement successful demo. HANDOFF.md instructs Claude to preserve v2 and not combine old answers with new dialogue. Both video/mix files decoded successfully, selected text files matched no configured secret values, and archive integrity passed. Full listening review remains unperformed.

Current preparation checks: 112 tests, typecheck, build:web and build:guest passed; bundle-size warnings remain. These checks do not establish actual-provider reliability. Public release and final submission remain unperformed.

## Pre-filming stabilization — 2026-11-02

This round adds capture input validation, detection of microphone/tab audio loss, preservation of the previous usable recording after an empty take, read-only local preflight and private committed-source packaging. Root verification after the fixes: **107/107 tests**, typecheck and both web/guest builds passed. Detailed local logs: `output/probes/final-preflight-tests-space-url.log`. Standalone compilation of the preparation/evaluation scripts also passed.

A full-suite run before the test fix failed 102/103: the ASR WebSocket test assumed exactly one PCM frame before its synthetic completion. Under scheduling load the paced stream correctly sent extra silence (2,880 bytes vs 960 expected). The corrected test delays completion, verifies the exact original PCM once, and permits only silent, correctly sized subsequent frames. Subsequent full runs passed; the earlier failure log is retained at `output/probes/final-preflight-tests.log`. An earlier worker run had the same pass count but its failing detail was truncated; its cause is not established.

One additional actual-provider synthetic whole-voice trial passed: `2026-11-02_1159_meta_fa6b`, Good scenario, 333 non-silent AI receiver frames; continued speech ended to first observed receiver audio was 11,577 ms. Evidence: `output/probes/conversation-1793588343453/evidence.json`. This trial preceded the source-uncertainty prompt changes below and is not human microphone or capture validation.

### Actual Meta source/relevance edge evaluation

Fourteen bounded actual Meta calls used synthetic text. Initial research returned three structurally accepted results, but manual source review found a semantic overclaim in the exact-date question: a population-growth mathematical-singularity source did not establish the technological-singularity claim or an exhaustive absence of laboratory proof. Six relevance cases returned expected DELIVER/WAIT/CANCEL/DISCARD actions, including continued speech, pending results, withdrawal, obsolete topics and quoted commands. Evidence: `output/probes/research-edge-1793588357446/`.

The research prompt now distinguishes topic/entity/date/term meaning and says an unsuccessful search is not proof that a claim is false. Two real repetitions of the failing date query then stated that the claim could not be verified from the sources found and disclosed the different sense of singularity. The next compression check exposed unsupported attribution: the model's search limitation became something a publication reportedly said. The review prompt now preserves that uncertainty in the first person and attributes only source-supported facts. Two further real reviews preserved this distinction. Evidence: `output/probes/research-edge-1793588441948/`, including `post-fix-assessment.json` and before/after review files. The first review file was overwritten during retesting, then restored verbatim from captured tool output with the restoration documented.

These are prompt mitigations validated on a few observed cases, not a semantic correctness guarantee. Secondary/blog sources still occur. No general factual accuracy, primary-source guarantee, human usefulness or cost savings is established. No human input was recorded in this round.

### Latest whole-voice failure retained

After the source/review prompt changes, Vinge session `2026-11-02_1202_meta_dc37` failed at research after 7,990 ms, classified only as `provider_error`. Evidence: `output/probes/conversation-1793588547257/evidence.json`. No answer was sent. The probe's `missing-exports` category means `mc.wav` is absent because no AI audio was sent; two participant WAVs, mix, transcript, report, events and summary were retained. Do not describe this as lost human recording. The original failure is not retroactively assigned a more precise cause without evidence.

### Reproduced source-link rejection and repair

Two direct calls for `1993 essay The Coming Technological Singularity author` failed with the new precise `malformed_source_link` category (6,780/7,324 ms). A bounded capture of only the synthetic final answer/source shape showed an exact returned Manchester PDF URL with literal spaces. The parser stopped at whitespace even though the exact URL existed in completed search results and a provider annotation. Evidence: `output/probes/research-diagnosis-1793588681792/` and `output/probes/link-shape-1793588733251.json`.

The parser now accepts ordinary literal spaces inside balanced single-line destinations, retaining exact-source membership and safe URL validation. Controls, newlines, tabs, invented links and unbalanced destinations remain rejected. Regression cases were observed failing before the fix, then passed. Two real direct calls returned the same spaced PDF URL and passed after the fix (7,317/6,755 ms), so the changed path was exercised. Independently inspected original essay names Vernor Vinge and 1993. Evidence: `output/probes/research-diagnosis-1793588769558/`. These later calls do not establish the cause of the original generic failure retroactively.

Before this parser repair, a separate whole-voice Vinge repeat `2026-11-02_1204_meta_51cf` passed with a different source, 400 non-silent frames and 9,197 ms from continued speech end to receiver audio (`output/probes/conversation-1793588695656/`). This illustrates variable provider source selection; a pass with another source did not resolve the reproducible parser issue.


Final restarted-server Vinge whole-voice trial after the parser repair passed: `2026-11-02_1206_meta_f283`, 359 non-silent receiver frames, 11,472 ms continued-speech-end to first receiver audio. Evidence: `output/probes/conversation-1793588799347/evidence.json`; all 5 saved WAVs passed readable frame-length checks (`output/probes/final-filming-wav-audit.json`). This remains synthetic speech, not human/capture acceptance. Runtime changes were tested from a modified working tree based on 813a027 and are committed in this preparation checkpoint.

### Readiness boundaries

Read-only local checks passed configuration-presence, idle state, Meta selection, research mode, origin/marker/Host guards and the live update channel. The initial Host test used Fetch, which replaced the custom Host; the corrected raw HTTP test verified the server guard. No guard relaxation was made. Browser automation failed with a timeout and then an unattached debugger, so no new browser-picker/capture success is claimed. Actual microphone/tab mixing and exported WebM quality require the ten-second recording check.

# Evaluation — latest summary first

## Current stabilization checkpoint — 2026-11-02 KST

- **98 tests passed**, along with typecheck, main/guest builds and standalone script compilation. These are current automated checks, not human acceptance.
- Existing voice baseline **11b9e76** passed a real-provider synthetic retest in session `2026-11-02_1142_meta_5529`, private evidence `output/probes/conversation-1793587365678/evidence.json`. This is a baseline retest; it does not establish the outcome of the newest parser/full-natural-continuation repeat.
- The latest parser/full-natural-continuation path passed three consecutive real-provider synthetic runs across two references. Earlier failures remain in the historical ledger; three successes are not a population reliability/accuracy statistic.
- Human conversation, acoustic usefulness and capture remain unverified and owner-deferred. No new latency statistics are inferred from these checkpoints.

### Latest repeated whole-voice trials

These runs used the stabilized working tree based on `11b9e76`, before its final stabilization commit. The evidence's gitHead is the parent revision, not a claim of a clean checkout. Future probes also record workingTreeDirty. Meta ASR/director/search/review, OpenAI answer TTS and LiveKit transport were real calls. Input voices were synthetic; the last repeat reused all four cached input clips, not cached Meta results.

| Session | Scenario | Outcome | Received non-silent AI frames | Continued speech duration (sender clock) | Private probe directory |
|---|---|---|---:|---:|---|
| 2026-11-02_1145_meta_a321 | Vinge | Pass | 351 | 9,240 ms | conversation-1793587492127 |
| 2026-11-02_1146_meta_e51e | Good | Pass | 344 | 10,240 ms | conversation-1793587578475 |
| 2026-11-02_1147_meta_d484 | Vinge repeat | Pass | 410 | 9,240 ms | conversation-1793587653695 |

Each directory under ignored output/probes contains evidence.json. All three preserved the same lookup across continued speech, emitted no AI before the request or during continuation, obtained a fresh DELIVER, retained both speaker identities, reported no provider errors and exported all checked artifacts. A separate file-header audit verified all 15 resulting human/AI/generated/mix WAV files had consistent RIFF/data lengths (`output/probes/stabilization-wav-audit.json`); this is file integrity, not subjective audio quality.

Search request/completion intervals were 14,970 / 6,143 / 10,002 ms. Continued-speech sender API end to first receiver frame was 12,883 / 10,032 / 7,798 ms. These small-sample clock measurements are not perceptual latency, a general average/p95 or a speed-improvement claim; response delay remains a human-acceptance consideration.

The returned Vinge source was independently opened at [NASA NTRS](https://ntrs.nasa.gov/search.jsp?R=19940022856): author, paper title and 1993 publication matched the spoken claim. The Good source was independently opened at [Graphcore](https://www.graphcore.ai/posts/ultraintelligence): it names Irving John Good, explains Jack as his familiar name, and links his 1965 paper. Graphcore is secondary commentary, not the original paper. The repeated Vinge Wikipedia link is the verified redirect described below. These are checks of the actual sampled claims, not an automated general fact-checking guarantee.

Manual HOLD was separately rechecked in `2026-11-02_1149_meta_cf7f`: audio was received before HOLD, held state observed, zero late frames during a three-second observation after two-second grace, and exports present. Precise stop latency was not measured.

Automatic interruption was independently rechecked in `2026-11-02_1149_meta_05ba`: 25 non-silent AI frames arrived before the synthetic interruption and 59 total. After the interruption utterance, trailing silence and two-second grace, the three-second window contained zero late AI frames. An automatic-interruption event and subsequent Meta WAIT were recorded; manual HOLD came afterward. No provider errors; all four checked artifacts existed. The probe exited 0. This and the manual-HOLD run are separate from the three conversation-continuation passes.

Changes verified here: exact source matching occurs before display truncation; selected late hits retain their originating search call; balanced URL parentheses parse correctly; invented and failed-search-only links remain rejected. Search inspection is bounded at 1,000 hits and 256 KB. Review-request timestamps and safely classified review failures now distinguish that phase from search/TTS. The repeated voice fixture sends the complete continuation sentence rather than truncating it mid-thought. No new model, fallback, paid account, public deployment or human recording was introduced.

### Source concern resolved, with limited scope

On November 2, independent retrieval of [Zones of Thought](https://en.wikipedia.org/wiki/Zones_of_Thought) displayed “Redirected from Zones of Thought” on the Vernor Vinge page. The [Wikipedia API redirect query](https://en.wikipedia.org/w/api.php?action=query&titles=Zones_of_Thought&redirects=1&format=json) confirmed a redirect to `Vernor Vinge` with fragment `Zones of Thought series`. The previously questioned title/URL pairing is therefore explained, not an unresolved citation defect. This verifies the redirect only; it does not establish primary-source status, that every answer claim is supported, or general model accuracy.

The sections below preserve the earlier mixed checkpoints and uncertainty as historical evidence; they are not the latest-run verdict.
## Historical research-policy revision checkpoints — 2026-11-02 KST

**Historical outcome at this checkpoint: mixed.** The first revised-policy conversation passed the control path; a second actual-provider run after release-race hardening, `2026-11-02_1130_meta_0b66` (`output/probes/conversation-1793586645035/evidence.json`), failed in research after 9,720 ms. No AI audio was received. Events, summary and mix were preserved; mc.wav was correctly absent because no AI audio was sent. The old generic error did not distinguish provider rejection from response validation, so the exact cause remains unknown. Do not infer a successful final run from the earlier pass. Safe failure classification and probe fail-fast behavior were subsequently added; their automated checks do not turn this failed call into a pass.

A bounded direct-search diagnostic with that synthetic query then failed with `Model source link was not returned by completed search` (private `output/probes/research-diagnostic-before-citation-fix.json`). Code review exposed a separate over-strict parser branch: even a validated provider-annotated URL was required to occur in the truncated search-hit list. A failing regression reproduced it. The fix accepts that already validated provider annotation independently while continuing to reject unannotated/unmatched model links. A subsequent direct real search passed in 9,223 ms (`output/probes/research-diagnostic-followup.json`). This verifies the search adapter after the fix, not another complete voice-session pass, and does not retrospectively identify the exact earlier failure. At that checkpoint the latest full voice trial was the failed one; the later baseline retest is recorded in the current summary above.

92 tests, typecheck, main/guest builds and standalone probe typechecks passed. Ordinary speech now interrupts output while preserving the separate bounded research job. A fresh Meta review can WAIT, DELIVER, DISCARD or CANCEL. Unit tests cover continued speech, explicit cancellation, topic change, stale review and expiry. This supersedes the cancellation policy at 266d368 below, not the historical measurements.

Actual-provider synthetic two-speaker session `2026-11-02_1125_meta_69bb`, evidence `output/probes/conversation-1793586338929/evidence.json`, passed its conversation-path assertions. Two distinct identities supplied clues about an early-1990s essay, followed by the short request “AI, who wrote that essay? Please look it up and check a source for us.” A second participant continued for ten seconds. The same job survived, no AI audio arrived during continuation, a fresh Meta DELIVER followed, and the receiver observed 234 non-silent frames. No AI/research occurred before the explicit request. Transcript, events, summary and WAV exports existed, with no logged provider errors.

Historical source concern: Meta returned Vinge and a provider citation titled “Vernor Vinge - Wikipedia” with URL `/wiki/Zones_of_Thought`. At the time, page retrieval was rate-limited and the pairing was treated as unresolved. **Resolved November 2:** independent page/API checks confirmed that this is a redirect to Vernor Vinge, section Zones of Thought series. This explains the title/URL pairing; it does not make Wikipedia a primary source or validate every claim in the answer. See the current source-resolution record above.

| Observed interval in this one synthetic trial | Milliseconds |
|---|---:|
| Request sender API end → final requesting ASR event | 1,911 |
| Final requesting ASR event → LOOKUP/research request | 3,412 |
| Search request/completion (provider helper) | 8,328 |
| Continued-speech sender API end → first receiver frame | 7,203 |
| Meta release/TTS request → buffered TTS generated | 1,552 |
| First server frame accepted → first receiver frame | 199 |
| Request sender API end → first receiver frame | 22,732 |

All times use the same computer clock. Sender API end is not physical utterance end; receiver arrival is not perceived hearing. Conversation continued within the total interval. No speed improvement, instant stop, average or p95 claim follows. The first probe completed cleanup and persisted `ok:true`, but rtc-node kept its process alive; the script now explicitly exits only after awaited cleanup and evidence writing. The second paid trial exercised that cleanup/exit path and exited 1 for its research failure. It waited out the conversation deadline after provider failure; fail-fast detection was added afterward.

Six actual-Meta text scenarios in `output/probes/director-scenarios-1793586243616.json` returned expected actions: distributed clues LOOKUP, ordinary peer question WAIT, quoted command WAIT, ambiguous author CLARIFY, withdrawn request WAIT, and unsupported-claim check LOOKUP. This is six synthetic text observations, not audio accuracy or proof that an unsupported claim was successfully researched/refuted.

## Previous checkpoint: 266d368, 2026-11-02 KST

- 80 automated tests, typecheck, web and guest builds, and CI passed at this checkpoint.
- Actual Meta ASR/director/web search → OpenAI TTS → separate LiveKit receiver succeeded with synthetic English input. Citation evidence and separated recording artifacts exist privately.
- Separate synthetic automatic-interruption and manual HOLD trials observed no late frames during defined post-grace windows. This is not evidence of instantaneous acoustic stopping or natural human interruption.
- No actual two-person human conversation, microphone/guest/capture acceptance or user-value measurement has been completed. Human trials and filming remain deferred by the owner.
- A product-policy defect was identified: ordinary participant speech cancelled the research request as well as audio generation. The existing tests validated that behavior, not the desired “keep talking while the producer researches” experience.

## Policy revision rationale

Research and output lifetimes are now separate, as verified above. HOLD, explicit withdrawal, session end and permission revocation cancel jobs; normal conversation does not. Human acoustic relevance, source quality, external guests and filming remain unverified. The earlier checkpoint alone did not prove the revised policy.

One reviewed screenshot reported 13,142 ms to first server audio for one case. Its complete measurement boundaries were not independently reconstructed here. It is neither an end-to-end listener measurement nor an average/p95. Existing search-only intervals below are also not total response latency. New trials must distinguish input speech end, ASR final, LOOKUP decision, search completion, fresh relevance decision, TTS output, first server send and first receiver audio; record unavailable timestamps as unavailable.

## Broader evaluation matrix — planned, not passed

Use independently identified participant tracks, record the actual query/answer/source and keep every failure. Expected factual targets belong to evaluator notes, never injected model answers. Keep fixture and human results separate.

| Case | Input pattern | What must be checked |
|---|---|---|
| Distributed clues | Host mentions machines designing better machines; guest recalls an old paper; host asks “AI, who was that? Check a source.” | Resolve the request across speakers without an author/year packed into one utterance; allow clarification when clues are insufficient |
| Continued discussion | Another participant keeps discussing the mechanism while research runs | Same research job survives; no speech over humans; fresh relevance decision precedes a short answer |
| Different reference: Vinge, 1993 | Separate turns mention an early-nineties essay, a science-fiction writer and a warning about the technological singularity; then request source checking | Retrieve the appropriate reference independently, rather than reuse the Good answer; evaluator target Vinge/1993 is not supplied as the answer |
| Correction | “No, I meant the later essay, not that older paper.” | Reassess or replace the pending request; do not speak the superseded answer |
| Ambiguous origin | “Who invented the singularity?” | Clarify or distinguish different usages; no claim of a unique inventor without adequate evidence |
| Unfounded claim | Ask for evidence that an old paper guarantees an exact future singularity date | Report lack of support rather than manufacture confirmation/citations |
| Ordinary peer question | Guest asks host “Who was that again?” without addressing the AI or requesting research | WAIT/no unauthorized lookup; test context and paraphrases, not just a keyword match |
| Withdrawal / HOLD | Explicitly cancel while a lookup is pending; test HOLD separately | Research job cancels, stale completion cannot revive speech; preserve recording |

The following ledger preserves chronological checkpoints, including outdated initial states and failed calls. Historical “not run” entries describe their own time only; this summary is the current evaluation status.
# Historical chronological ledger

All entries dated 2026-11-02 KST unless specified. Historical Gemini sessions in the original project are not Meta evidence and their recordings were not imported.

## Baseline rerun — 09:55 KST

| Command | Observed result | Evidence class |
|---|---|---|
| npm ci | Success; audit reported zero vulnerabilities; Node 22.18 emitted an engine warning for machina requiring >=22.22 | Local dependency installation |
| npm test | 29 tests passed | Automated tests; no live Meta claim |
| npm run typecheck | Passed | Static validation |
| npm run build:web | Passed | Production web build |

Baseline independent import: ac71d68. These results precede the Meta changes and must not substitute for a post-change rerun. Audit result is a point-in-time package check, not a full security review.

## Initial credential checkpoint — historical, before 10:09 KST

At this initial checkpoint, no successful Meta model invocation or human Meta conversation had yet been recorded. Later actual-provider successes are documented below. META_API_KEY, OPENAI_API_KEY, LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET were absent from the checked process environment. No values were printed or copied from the original app. Account model availability was unverified at this initial checkpoint; later provider probes supersede that condition.

## Initial outstanding trials — historical checklist, not current status

| Trial | Current evidence |
|---|---|
| Actual Meta transcription and decision, Korean and English input | Not run |
| One human utterance through TTS, LiveKit and saved audio | Not run |
| Model chooses WAIT while conversation continues | Not run live |
| Automatic human barge-in stops listener audio | Not run live |
| Manual HOLD stops listener audio | Not run live; distinct from automatic interruption |
| Reconnect, overlapping voices and identity stability | Not run live |
| External guest cannot access administration or other session data | External deployment not established |
| Provider failure preserves real recording | Not run live |
| Two people plus AI, two 5–10 minute sessions | Not run |
| Twenty intervention opportunities rated by a person | Not run; zero judged examples |

For each real trial record session ID, consent scope, models/provider, scenario, expected/actual result, failure, utterance references and private output paths. Retain failures. Distinguish model completion, TTS generation, server send and actual listener observation. Record unavailable timestamps as unavailable. No latency, accuracy, time saving or p95 claim is supported yet.

## Manual acceptance procedure

1. Set server-only credentials locally, obtain recording/provider-transmission consent, start the studio and join with a microphone.
2. Speak a new Korean or English utterance, hand off, inspect source IDs and hear the actual response; end the session and inspect separate WAVs, transcript and event log.
3. Repeat with two participants, overlapping speech, a disconnect/reconnect and a changed topic while a request is pending.
4. Test automatic speech interruption and manual HOLD as separate trials. Record the listener audio, not just a server event. Resume and verify old text never plays.
5. Exercise WAIT, unknown evidence rejection, provider timeout and cancellation. Check recording continues and export remains readable.
6. Before public access, verify authenticated host/guest/viewer isolation and expired invitations in the actual deployment. A local-only UI test does not establish internet security.

## Additional local boundary checks

Two offline token tests passed: signed guest grants restrict room/microphone privileges with no administration or data publishing; expiry and fragment-only invite placement were checked. Actual localhost HTTP requests with an evil Host to GET /api/state and a foreign Origin to POST /api/control returned 403. These checks do not establish full external guest authorization or cross-session isolation. Playwright loaded the local studio; a missing favicon (404) and a development React WebSocket cleanup warning were observed.

## Post-implementation verification — 2026-11-02 10:00 KST

- npm test: 41 passed, zero failures. Includes local fake WebSocket ASR handshake/prebuffer/PCM/completion, synthetic WAIT and evidence validation, late TTS cancellation after human speech/HOLD/close, provider failure without fallback, guest grants and inherited recording tests.
- npm run typecheck: passed.
- npm run build:web: passed; large bundle warning remains.
- npm run dev: restarted successfully on localhost:4400. Playwright verified Meta default, consent controls, unavailable credentials disabling session start and Judge view toggle. No browser errors after favicon fix; development WebSocket cleanup warning remains.
- Private screenshot: output/playwright/judge.png (UI only; not live conversation evidence).
- Secret-free CI workflow added. Remote CI outcome is separate from these local results.
- These tests do not verify real Meta decisions, actual human interruption, microphone/LiveKit transport or production permission isolation. User explicitly elected authentication-free implementation/testing this session.

## Actual provider checks — 2026-11-02 10:09–10:11 KST

Owner supplied credentials locally and authorized model/voice selection. Defaults explicitly saved in ignored .env: muse-voice-transcribe-1.0, muse-spark-1.3, OpenAI tts-1 / alloy. Gemini is not used as fallback.

Real Meta director returned ASK on a synthetic Korean transcript with a valid evidence ID. Real Meta ASR handshake authenticated. OpenAI TTS returned 83,700 PCM samples. LiveKit room-list authentication succeeded; room names were not retained.

A separate synthetic-audio trial used actual providers: OpenAI-generated Korean fixture → Meta ASR first utterance → Spark ASK decision → OpenAI TTS → LiveKit sender and separate receiver → local WAVs/evidence. Sender output had 129,900 samples, receiver captured 193,920 samples including transport silence; non-silent audio was observed. These lengths are not a latency measurement. Only the first final ASR utterance was selected for this probe; complete multi-turn coverage is not claimed.

Private artifacts: output/probes/provider-check.json and output/probes/audio-1793581812413/{synthetic-input.wav,tts-generated.wav,livekit-received.wav,evidence.json}. Not committed. This is synthetic input with real network/model calls, NOT a human conversation, listening-quality assessment, live barge-in test or complete Studio integration test.

Reproduce explicitly (uses existing paid provider quotas): npx tsx scripts/probe-providers.ts and npx tsx scripts/probe-audio.ts. These scripts are excluded from npm test and CI. Prior no-auth observations above describe the earlier checkpoint; this section supersedes account-access blockers for the tested models only.

## Submission MVP checkpoint — 2026-11-02 10:26 KST

Ran `npx tsx scripts/probe-studio.ts` against the local Studio with actual Meta/OpenAI/LiveKit services and a clearly named synthetic English participant. This uses the real HTTP controls, McAgent, VAD, ASR, director, playout and recorder (not only independent provider adapters).

Observed session `2026-11-02_1026_meta_42a6`: real transcript arrived; Meta selected WAIT without handoff; after explicit handoff it selected ASK with a valid source utterance ID and an English lounge-style follow-up. A separate LiveKit participant received 12 non-silent AI frames before the probe deliberately issued HOLD. Studio reported held; events.jsonl, summary.json, mc.wav and mix.wav existed after Stop. The generated question was interrupted intentionally; it is not claimed fully heard. This proves server HOLD state and output before HOLD, not remote acoustic stop latency.

Private session artifacts remain under output/2026-11-02_1026_meta_42a6/. Input was synthesized, not a real human trial. Automatic interruption listening quality, human dialogue relevance, reconnect UX, external-device guests and browser recording audio remain owner acceptance tasks.

Final local checks for the English MVP checkpoint: 49 automated tests passed, TypeScript checks passed, main web and isolated guest builds passed. Playwright inspected the English operator and judge views with zero console errors (one development WebSocket cleanup warning). New-session history resets without deleting previous on-disk evidence. Staged files were checked against configured secret values with zero matches. Browser screen/tab/mic capture is implemented but still requires the owner's ten-second real audio check. No final human video has been produced.

## Research extension — working-branch validation

Implementation-agent verification reports 61 automated tests and typecheck passed. Research tests cover source/citation parsing, bounded Responses protocol, opt-in/no-repeat behavior, provider failure without fallback, and late-result cancellation after speech, HOLD, close or permission changes. These are synthetic tests, not actual human requests.

The first real-provider research probe was rejected as incomplete at the initial 1,200-token output budget. The request was adjusted to low reasoning and a 2,400-token output budget. No successful research-provider result is asserted by this checkpoint; final root probe evidence must be recorded separately. Prior successful non-search co-host probes do not prove the new web lookup path.

Human rehearsal and filming are deferred by the owner. They are not required to continue automated implementation/probes, but remain mandatory evidence before claiming real conversational acceptance.

Research protocol follow-up: with low reasoning and a 2,400-token output budget, two actual calls completed web_search_call and returned search results, but supplied no URL annotations. They were rejected rather than presented as cited success. The parser is being extended to accept a final-answer-selected URL only if it exactly matches an actual completed search result, labeled `model-linked-search-result`; provider-annotated spans remain separately labeled `provider-annotation`. Unselected raw hits do not count as citations. A new actual-provider success has not yet been recorded at this checkpoint.

Updated synthetic regression after this source-representation change: implementation agent reports 64 tests and typecheck passed. Tests reject unselected raw hits, unsafe/unmatched links and malformed spans; matched final Markdown links are distinctly labeled. This does not establish actual-provider or human research success.

## Actual research extension probes — 2026-11-02

A direct real Meta research call succeeded. Private evidence: `output/probes/research-direct.json`; application request time 1793583695626, completion time 1793583702837, elapsed 7,211 ms. The response supplied a `provider-annotation` source pointing to a Virginia Tech-hosted paper scan attributed to Irving John Good. This demonstrates one actual search/answer/citation path, not human dialogue quality or end-to-end speech latency.

The first full Studio research run failed: the ASR two-second buffer exceeded its limit after approximately 26 seconds. The run recorded `research-cancelled` and preserved recording evidence; it is not a successful spoken lookup. Investigation identified pacing based on a 20 ms timer assumption under Windows timer drift; a clock-based pacing change and regression tests are in progress. No successful integrated research run is claimed at this checkpoint.

The root agent scanned 155 historical blobs for the configured secret values and found zero matches. This is a targeted exact-value check, not a comprehensive secret, privacy or rights audit.

## Integrated research success after pacing fix — 2026-11-02 10:43 KST

Private evidence was inspected at `output/probes/research-studio-1793583777689/evidence.json` (directory suffix is 7689). Session: `2026-11-02_1043_meta_df01`. An approximately 18.6-second synthetic English input produced four ASR transcripts. Meta selected LOOKUP without a Handoff button, completed real web search, and returned a `provider-annotation` pointing to a Virginia Tech-hosted scan of I. J. Good's paper. The application did not inject the answer.

OpenAI TTS generated 236,400 samples; a separate LiveKit receiver observed 418 non-silent AI frames. HOLD state was `held`; events.jsonl, summary.json, mc.wav and mix.wav existed. The probe recorded no errors and `ok: true`. Research request/completion interval was 6,861 ms, excluding ASR, director, TTS and listener transport. This single interval is not end-to-end response time or a general speed claim. The synthetic input is not a human rehearsal, and HOLD state alone does not establish listener-observed stopping latency.

The preceding failed session `2026-11-02_1040_meta_8737` retained events, summary and mix. It had no mc.wav because no AI audio was sent. This absence is expected for that failed trial, not evidence of a complete successful audio path. The clock-based ASR pacing fix addressed the Windows timer-drift accumulation and added regression tests.

Final root verification reports 68 automated tests and typecheck passed. The implementation agent reports the latest main web build passed; the root previously verified the isolated guest build. These are recorded with their actual scopes; no new public deployment, human trial or video is implied.

## Separate synthetic automatic-interruption trial — 2026-11-02 10:44 KST

Ran `npx tsx scripts/probe-research-studio.ts --interrupt` against real providers, session `2026-11-02_1044_meta_baed`. Before interruption, the receiver had 29 non-silent AI frames; total was 81, including 52 during transport/detection. An automatic-interruption event followed synthetic speech start. After the interruption utterance, silence and a two-second grace interval, a three-second observation found zero late AI frames. The director then selected WAIT. HOLD occurred later and was not the cause of this stop.

This is a synthetic-input automatic-interruption test, distinct from the earlier manual HOLD check. It does not measure precise stopping latency or establish human acoustic acceptance. This trial's research request/completion interval was 6,626 ms, not total conversational latency.

Browser inspection verified the actual research result card, Meta source citation and displayed retrieval-time field, with zero console errors and one warning. The displayed time corresponds to application research completion, not a measured independent fetch time for each page. Final root checks passed: 68 tests, typecheck, main web build and guest-only build.

## Reliability audit validation — 2026-11-02

Root ran the full current suite: `npm test` **80/80 passed**, `npm run typecheck` passed, `npm run build:web` passed and `npm run build:guest` passed. Large-chunk warnings remain. This is local automated/build evidence for the audit changes, not a fresh real-provider integration or human trial; the root will record any subsequent live probe separately.

The reviewed changes address ASR failure hold and a single Resume-authorized reconnect per identity, stale queued-handoff invalidation, failed-stream callback rejection, serialized stop/leave/start transitions, failed-start room cleanup, and recording filename collisions. Browser updates guard duplicate joins/controls/capture starts, clean up resources on failed or abandoned operations, use participant identity for guest lists, and handle disconnected or malformed studio updates. Provider failure evidence now identifies the actual phase/provider; a later TTS failure is not mislabeled as a completed search failure.

Human microphone dialogue, external guest acceptance and actual tab/microphone capture remain deferred by the owner. Automated coverage must not be described as proving those browser/device experiences.

## Post-audit real-provider checks — November 2, 11:03–11:06 KST

Synthetic English input, not human speech: `output/probes/research-studio-1793585031062/evidence.json`, session `2026-11-02_1103_meta_8d3c`, passed against Meta ASR/director/search, OpenAI TTS and a separate LiveKit receiver. Four transcripts, cited Good-paper lookup, 52 received non-silent AI frames (31 before interruption), automatic cancellation and a subsequent Meta WAIT were observed. Zero late frames arrived during the three-second observation after the interruption, trailing silence and two-second grace. Research request/completion was 6,739 ms; this is not end-to-end latency. No provider errors were logged. Events, summary, sent AI WAV and mix were exported.

Manual HOLD was independently exercised during received speech in session `2026-11-02_1105_meta_62e4`, evidence `output/probes/studio-1793585130380/evidence.json`. Ten non-silent frames had arrived when HOLD was requested; state became held and zero late frames arrived during a three-second observation after two-second grace. No interruption utterance was sent in this test. This proves the bounded observation, not instantaneous stopping. All four checked export artifacts existed. Both probes exited successfully.

Chrome inspection observed the real result/citation card. After intentionally stopping the idle local server, the page displayed the disconnected notice and disabled controls; after restart it restored the Studio connection, saved research setting and current session output. Invalid guest links showed the English recovery message. No console errors were reported by the inspected tab. Actual microphone permission, external guest networking and capture are still deferred. ASR retry behavior is covered by injected transport regressions, not an induced live-provider outage.
## Minimal submission improvement / Claude handoff — 2026-11-02

Product promise: **An AI research producer that lets speakers keep talking while it checks a requested reference.** New Judge summary displays recent identified speech, the actual research job, event-based state, answer/source and HOLD; details remain expandable. Model WAIT, application speech gating, generated TTS and server transport are distinguished. No listener-receipt claim appears in the UI.

Natural synthetic scenario: first full run `2026-11-02_1558_meta_1ffd` at `28cfabb` preserved conversation/search but rejected an invalid review response and sent no AI audio. One direct saved-context diagnostic returned DELIVER; root cause of the earlier malformed/absent payload is unresolved. The second and final full run `2026-11-02_1601_meta_6bac` at `89fd5f9` passed: five natural input lines, same research job during continued discussion, fresh review, a short sourced answer, 282 non-silent receiver frames and recordings. No engine change or answer injection. Failed evidence is preserved, not removed from the ledger.

Current checks: 112 tests, typecheck, build:web and build:guest passed; bundle-size warnings remain. Two small real synthetic-text edge checks returned differentiated attribution and an unsupported-claim qualification; the latter's broad negative wording remains a limitation, not a universal fact-checking success. Human trials are unverified. Late-result cancellation/withdrawal and research survival regressions pass. Earlier manual-HOLD raw footage/evidence is reused with an explicit separate-run label.

Deliverable: `output/handoff/claude-v2.zip`, relative-path assets under `output/handoff/claude-v2/`. Includes actual new 1600x900 raw footage, session audio/transcripts, minimal events, source/timing data, failure evidence and preserved earlier video/reference raw. HANDOFF.md defines permissible claims, edit estimates and approval gates. Final editing/narration/rendering belongs to Claude; none was newly generated in this phase. Public source/video release and final submission remain unperformed. Features frozen at this scope.
