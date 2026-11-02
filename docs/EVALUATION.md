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
