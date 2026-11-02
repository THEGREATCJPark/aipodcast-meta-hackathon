# Evaluation ledger

All entries dated 2026-11-02 KST unless specified. Historical Gemini sessions in the original project are not Meta evidence and their recordings were not imported.

## Baseline rerun — 09:55 KST

| Command | Observed result | Evidence class |
|---|---|---|
| npm ci | Success; audit reported zero vulnerabilities; Node 22.18 emitted an engine warning for machina requiring >=22.22 | Local dependency installation |
| npm test | 29 tests passed | Automated tests; no live Meta claim |
| npm run typecheck | Passed | Static validation |
| npm run build:web | Passed | Production web build |

Baseline independent import: ac71d68. These results precede the Meta changes and must not substitute for a post-change rerun. Audit result is a point-in-time package check, not a full security review.

## Live evidence

No successful Meta model invocation or human Meta conversation is recorded in this ledger. META_API_KEY, OPENAI_API_KEY, LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET were absent from the checked process environment. No values were printed or copied from the original app. Account model availability remains unverified.

## Required separate trials

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
