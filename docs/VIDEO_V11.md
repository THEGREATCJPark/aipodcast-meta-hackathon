# Selected submission film — Keep Talking v11

**[Watch the 89-second film](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v11/keep-talking-v11-antigravity-review.mp4)** · [Master and captions](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v11)

## What the film demonstrates

The hosts compare Muse Spark deployment options, request a lookup, continue talking during research, receive a short sourced answer after WAIT, and return to their discussion. The actual session is `2026-11-04_1206_meta_7fa3`. v11 changes the presentation of that session, preserving v10's 89.2-second timeline and clean program audio.

## Production and evidence boundary

- Participants and follow-up dialogue are scripted synthetic voices. Studio visuals are generated editorial footage, not an app feature.
- Meta performs actual transcription, contextual lookup, research and review. The recorded WAIT (`log-37`) and DELIVER (`log-42`) are distinct from the application's speech gate.
- Meta's delivered answer is unchanged: “Muse Spark Open is the one you can download and run locally, while Muse Spark 1.3 stays cloud-hosted, per Tech Insider.”
- The displayed reference is the returned secondary source, [Tech Insider](https://tech-insider.org/au/run-muse-spark-open-locally-2026/). A source link enables inspection; it is not a guarantee of accuracy.
- The film uses session-derived app views and editorial focus captions. Wait intervals are cut and marked **Edited for time**. The film is not an end-to-end latency measurement.
- v11 removes the misplaced vertical highlight, preserves screenshot proportions and shows the complete answer/source card. It introduces no new model calls.

## Actual providers

| Role | Provider used in this session/film |
| --- | --- |
| Speech transcription | Meta `muse-voice-transcribe-1.0` |
| Decisions, web research, relevance review | Meta `muse-spark-1.3` |
| Session host and co-host speech | Gemini `gemini-3.8-flash-tts` (Aoede / Puck / Kore) |
| Generated studio footage and its native audio | Gemini `gemini-omni-1.1-flash`, reused from v9 |
| Voice transport | LiveKit |
| Final editing | FilmCraft |

## Artifact identity

| File | Size | SHA-256 |
| --- | --- | --- |
| `keep-talking-v11-antigravity.mp4` | 86,668,606 bytes | `84e38eeaf48c5f0ad7639ce5fa8de02ddc97503c7f82389cf72ae0fd0727b1d6` |
| `keep-talking-v11-antigravity-review.mp4` | 11,181,571 bytes | `ca504773d6afa2b003fe05429730ae121b4923627bab3a0c5b9e5cef501c03d1` |
| `subtitles-en-v11-antigravity.srt` | 2,175 bytes | `c070e3044296c7bb058239365547ec10b5b97256ff9535cae4618dfe17a4cf35` |

1080p, 30 fps, 89.2 seconds. Uploaded asset hashes match local files. The editor's automated report records full decoding and unchanged v10 program audio. Selected final frames were reviewed for geometry and source visibility; no human listening completion is claimed here.

Local production records are in `video-workspace/output/edit-decision-list-v11-antigravity.csv` and `video-workspace/qa/v11-antigravity/`. Earlier films and their reports remain historical records.
