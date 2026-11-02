# Human acceptance and recording session

All spoken demo material and submission narration are in English. These are test prompts, not pre-written model outputs. Let Meta produce its actual answer and keep failures in the private record. Korean input can be tested separately without representing synthetic Korean audio as a human test.

## Before the session

Use two consenting adults with headphones. Record consent to audio recording and transmission to Meta/OpenAI/LiveKit; separately obtain permission for public video/audio. Confirm microphones, speaker identity, Meta provider labels and session recording indicator. Keep credentials, invite fragments and private files off screen. Capture the listener's actual audio in addition to server WAVs.

Record date, branch/SHA, session ID, participant aliases, provider/model names, mode, consent scope and recorder settings. Mark the footage “Live human session” only when that is true. A later playback is “Replay of recorded human session.”

## English test sequence

| Test | Human action / suggested line | Evidence and pass condition |
|---|---|---|
| New human input | A: “We want to make a weekly show, but preparation keeps taking over our evenings.” B: “I care more about a good conversation than a perfect script.” | Preserve actual audio and transcript with distinct participant identities. |
| Continued conversation / WAIT | A: “Let me finish that thought.” B continues discussing preparation. Do not hand off. | Record actual decision. No autonomous speech is expected in manual mode. Silence alone does not prove Meta selected WAIT: inspect the action. |
| Grounded question | Operator hands off after both stop talking. | Actual Meta question cites existing utterance IDs, stays relevant and is audible. Do not script the AI's answer. |
| Clarification | A: “By weekly I mean one recording every week.” B: “I meant publishing weekly, with monthly recording.” Hand off. | Inspect whether Meta notices different premises; record the actual decision, including failure or a different action. |
| Automatic interruption | During an audible AI response, B says “Hold on, I need to correct that.” Do not press HOLD. | Capture speech start, cancellation event, server send and listener audio. Pass only if the listener hears playback stop and stale audio does not return. No unmeasured timing threshold claim. |
| Manual stop | In a separate response, operator presses HOLD without speaking. | Listener audio stops; late response is discarded. Keep separate from automatic interruption evidence. |
| Changed context | While held, A: “We changed the plan. Now this is a live interview, not a weekly show.” Resume and hand off. | No old question resumes; new response uses current context. |
| Reconnect | B disconnects and rejoins using the intended guest path. | Inspect participant mapping and event log. ASR restart may be required; document the interruption honestly. |
| Finish / artifacts | End the session normally. | Inspect readable human tracks, generated TTS, sent MC audio, mix, transcript and execution evidence. Keep originals private. |

Run two 5–10 minute sessions with two humans plus AI. Review at least 20 actual intervention opportunities, recording relevance, unnecessary intervention and evidence-attribution errors. These counts are targets until performed. Use a private CSV with columns: session_id, opportunity_id, action, source_ids, relevance, unnecessary_intervention, attribution_error, reviewer, notes. Record unavailable measurements as unavailable.

## Filming checklist

- [ ] Real capture exists; clip source and timestamp recorded for every demonstration shot.
- [ ] English narration/subtitles match observed behavior, including limitations.
- [ ] Automatic interruption and manual HOLD are different trials.
- [ ] Provider labels show Meta ASR/director and OpenAI TTS.
- [ ] No API keys, invite tokens, private participant details or unrelated files are visible.
- [ ] Audio is actually audible in the exported video; no fabricated replacement model response.
- [ ] Any synthetic-provider probe is labeled explicitly; it cannot substitute for human-session evidence.
- [ ] All public voices/faces have release permission; review final export before uploading.
- [ ] Video duration is three minutes; keep failed takes in the private evaluation ledger.
- [ ] Public source has explicit owner approval and the frozen SHA matches the reviewed code.

## Local capture controls

Connect the microphone first. Use the studio capture button, select the studio browser tab and enable “Share tab audio.” The capture mixes the local microphone with tab audio (guest/AI), previews locally and downloads a WebM; it does not upload. Capture is capped at 180 seconds. First record a ten-second sample and play it back to verify microphone, remote/AI audio, image and synchronization. Browser capture permission is an explicit user action. If tab audio is unavailable, report the missing channel rather than dubbing a fabricated successful response. FFmpeg was not found on PATH; no transcoding/export verification is claimed.

A static guest-only bundle can be built with `npm run build:guest` into `dist/guest` for future HTTPS hosting. It is not deployed and does not expose the operator server. Public hosting still needs approval and actual external guest acceptance checks.

Guest deployment preparation: the guest bundle includes `/join` fallbacks (`_redirects` and `vercel.json`) and no management API imports. Host only `dist/guest` over HTTPS after approval, set `GUEST_PAGE_URL` to that origin, restart configuration as needed and issue a fresh invitation. Do not upload the repository root, .env, data or output directories. Verify real guest microphone permission and connection from another network before claiming external access.
