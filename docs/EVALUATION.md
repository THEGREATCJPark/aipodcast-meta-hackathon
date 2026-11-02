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
