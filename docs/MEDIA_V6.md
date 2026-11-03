# Cadence and typography revision — November 3, 2026

The v5 cuts were rejected by the owner for slow exchanges and unsatisfactory typography. This revision produces a short listening check before another full submission edit. It does not certify natural human conversation or submission readiness.

## What changed

- The studio uses self-hosted Instrument Sans for interface text and IBM Plex Mono for timestamps. Large headlines, readable sentence-case labels and restrained spacing are informed by [Dinamo](https://abcdinamo.com/). No Dinamo commercial font is copied. See [font sources and licenses](../web/fonts/README.md).
- Synthetic host turns continuously publish real-time 20 ms frames through two separate LiveKit identities. They no longer wait for ASR completion between turns, and trailing silence is paced rather than burst into the transport.
- With research enabled, Meta can classify unreviewed utterances while the people keep speaking. The requesting utterance cannot be overwritten by a later ordinary turn while classification is busy. Only Meta chooses LOOKUP or WAIT; no keyword rule chooses the content.
- Background classification grants no speech permission. Every researched answer still requires Meta's current-context review and a clear floor. New speech or transcript revisions abort obsolete review requests. HOLD, resume, close and research-permission changes invalidate pending classification; late results cannot restart it.
- The 60 director-call / 8 search-call caps, 60-second research TTL, bounded contexts and output-generation guards remain in place. No fallback LLM or automatic retry was added.

## Actual run ledger

These were targeted debugging runs with scripted OpenAI host inputs and actual Meta ASR, classification, search and review. They are not a random sample or a reliability estimate.

| Session | Execution SHA | Result |
| --- | --- | --- |
| `2026-11-03_1108_meta_c631` | Pre-fix working tree | Search returned sources; review timed out. Recording preserved. |
| `2026-11-03_1112_meta_9994` | `1addf08` | A queued explicit request was lost between rapid turns. No answer; deadline ended the test. Recording preserved. |
| `2026-11-03_1115_meta_e35a` | `165ac72` | Full flow passed. First receiver audio was 19,610 ms after the final discussion clip was sent. |
| `2026-11-03_1119_meta_c98b` | `b4775198afe385f6be05ef46a7d8d6b62d979dfb` | Full flow passed after stale-review cancellation. First receiver audio was 12,689 ms after the final discussion clip was sent. |

The last two executions had clean working trees. Both kept two distinct transcribed identities, delivered a sourced Meta answer, observed no AI audio during published host speech, reached manual HOLD and exported the session mix, separate tracks and events. This manual HOLD check is not automatic acoustic-interruption validation.

In the final recording, host-to-host vocal gaps measured with 10 ms energy bins at -40 dBFS are 0.395–0.445 s, median 0.420 s (eight handovers, excluding the AI transitions). These values describe this synthetic recording only. The measured AI vocal gap remains about 12.6 seconds. The earlier and later runs are not a controlled performance benchmark; do not advertise the difference as a general speed improvement. Human recording would not remove provider latency.

## Review media

[Private review release](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/cadence-preview-v6): `cadence-check-v6.mp4`, MP3, English captions and QA metadata. The video is an editorial audio visualizer using the new typeface; it is not a browser screen capture. The original final-session mix runs continuously at 1x, with only initial and final padding removed. The AI wait is retained. No Gemini content is present in this listening control.

The separate `video-workspace/scripts/v6-cadence/` renderer uses recorded tracks and script text, aligns captions against Whisper word timestamps, and retains QA per session. Automatic checks cover full decode, original audio correlation, caption overlap and loudness. Human end-to-end listening remains pending. Browser visual verification is unavailable because local browser control is disabled in the current tool settings; HTTP asset delivery, build and typechecks are verified. Extracted video frames were inspected separately.

## Earlier Gemini connection diagnosis (corrected)

The local `GEMINI_API_KEY` authenticated successfully for model discovery. Models available in the returned list include `gemini-3.8-flash-tts` and `gemini-omni-1.1-flash`. The [official speech guide](https://aistudio.google.com/docs/speech-generation) and [Omni guide](https://aistudio.google.com/docs/omni) supply the Interactions protocol.

`scripts/media/gemini-media.ts` prepares two-speaker US-English host dialogue (Puck / Charon) and a ten-second podcast-to-robot opening with native audio. Prompts and non-secret response metadata stay under ignored `output/media-v6/`. Successful outputs are cached by request hash; a different generated asset cannot silently replace an existing file.

Those initial calls and retries returned HTTP 429 from an inherited process key that differed from the local .env key. That diagnosis has since been corrected: the local key successfully generated the dialogue and opening. The app now prefers the local Gemini key and defaults to Gemini 3.8 Flash TTS. Subsequent local-key co-host speech calls were also quota-blocked. See [GEMINI_TTS.md](GEMINI_TTS.md) for exact results; do not infer local-key availability from the earlier inherited-key failures.

The owner only needs to check the project associated with the `.env` key at [AI Studio spend settings](https://ai.studio/spend). After it is available, the agent can run:

```sh
npx tsx scripts/media/gemini-media.ts hosts
npx tsx scripts/media/gemini-media.ts followup
npx tsx scripts/media/gemini-media.ts video
```

Generated host fixtures must be aligned and checked before publishing them as two separate LiveKit input tracks. Gemini creates editorial host input and the opening; Meta continues to author and authorize the co-host's actual answer. Decide whether human recording is necessary after comparing the Gemini speech sample. Public uploads, repository visibility changes, terms acceptance and final submission remain owner gates.
