# Current phase: Claude owns the final edit

Codex provided the raw v2 handoff at output/handoff/claude-v2.zip. New 1600x900 natural-input evidence and a retained failed take are separate from the earlier edit described below. No new narration or final render was generated in this phase.

# English submission video — 2026-11-02

Local video production completed with FilmCraft 0.16.0. No publication or submission performed.

## Deliverables

- `output/video/render-final-v1/submission.mp4`: 1920×1080 H.264, 30 fps, 5,400 video frames. Container duration 180.01 seconds (AAC tail); picture duration 180 seconds. 24,966,311 bytes.
- `output/video/render-final-v1/submission.fcproj`: editable FilmCraft project; media stays in this checkout's ignored output directory.
- `output/video/submission-en.srt`: English narration and principal conversation captions. Timing comes from recorder/probe events and is approximate, not word-aligned transcription. The separate control segment has English speech and visible application text, without full subtitles.
- `output/video/render-final-v1/quality-check.json`: machine-readable media checks and SHA-256.
- `output/video/raw/meta-studio-raw-2026-11-02T05-15-20-510Z.webm` and adjacent JSON: actual tab capture and timing metadata.

## What was recorded

This is a synthetic demonstration, not a human trial. Two OpenAI synthetic fixtures travel through LiveKit into actual Meta transcription, context decisions, research and relevance review. OpenAI renders the model response as speech. No physical microphone was requested/published by the recording helper.

1. Research run: `2026-11-02_1415_meta_3957`; `output/probes/conversation-1793596536183/evidence.json`, `ok: true`. Actual receiver audio observed; distinct speaker identities; no AI before explicit lookup; no AI during continued speech; research result reviewed and delivered; recordings retained.
2. Separate control run: `2026-11-02_1416_meta_f05b`; `output/probes/video-control-1793596613656/evidence.json`, `ok: true`. An automated operator sent the manual HOLD action after 2.5 seconds of received AI speech. Held state confirmed and no late frames in the three-second observation after a two-second grace period. This does not demonstrate acoustic interruption or a physical button click.

Meta models: `muse-voice-transcribe-1.0` and `muse-spark-1.3`. App response TTS: OpenAI `tts-1/alloy`. Editorial narration: OpenAI `tts-1/onyx`. AI responses were not scripted or replaced in editing.

The model citation `https://en.wikipedia.org/wiki/Zones_of_Thought` was independently opened during QA: it redirects to the Vernor Vinge article and lists The Coming Technological Singularity (1993). The differing URL slug is not evidence of a broken citation. It remains a secondary source; the video makes no universal fact-checking guarantee.

## Edit and checks

FilmCraft assembled title cards, actual recording excerpts, narration and burned captions. FFmpeg prepared the side-by-side editorial frame around the original narrow browser capture. The app image is not reconstructed. Excerpts preserve original speed and internal waiting; setup time between runs is removed.

Timeline: introduction 0–13, synthetic/real disclosure 13–24, research recording 24–94, research explanation 94–108, HOLD explanation 108–122, separate HOLD recording 122–151, architecture/provenance 151–171, limitations/closing 171–180 seconds.

Passed: FilmCraft export with no offline media or warnings; full exported-file audio/video decode; 1080p/30 fps/frame count; non-silent audio; source-to-export audio correlations 0.99946 (research) and 0.99995 (HOLD); selected visual preview inspection; current `npm run typecheck`; Python helper compilation. No claim of a full human listening review. Source capture contains minor near-full-scale samples; listening review is still appropriate before public release.

Reproduction: `python scripts/video/title-cards.py`, `python scripts/video/prepare-take.py`, then `python scripts/video/filmcraft-build.py output/video/submission-manifest.json`. Choose a new manifest output directory to avoid overwriting an existing export. `python scripts/video/verify-take.py` checks this recorded take/export. These helpers reference this specific take; they are not generic production APIs. Media and evidence are local, not Git-tracked.

## Remaining approval boundaries

The creator can preview this local video without recording their own voice. Public upload/video URL, repository visibility changes, final terms acceptance and final submission remain unperformed and require the creator's approval. This report does not resolve or supersede outstanding eligibility/rules notes in the submission documents.
