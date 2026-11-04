# Keep Talking v8 — selected submission video

**Status:** selected final *candidate*, not published or submitted. The owner must still perform end-to-end viewing/listening and authorize its publication. No new filming, human trial or architecture-slide sequence is necessary for the approved synthetic-demo scope.

## Exact artifact identity

- Release: [keep-talking-v8](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8), published 2026-11-03 at 05:31:51 UTC.
- Preferred submission link, **pending signed-out access check**: [keep-talking-v8.mp4](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4)
- Preferred copy: 20,954,934 bytes (~21 MB), SHA-256 `10342ac817c682e3f30f38dfe92589c7f6d7daeb98d2818168dee073328fd75d`.
- Larger FilmCraft master: [submission-v8-keep-talking.mp4](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/submission-v8-keep-talking.mp4), 191,616,483 bytes (~192 MB), SHA-256 `cdc73ac7569e181d52d2aaab138a75ecc0f75b8e596daced38f12dff2288f77f`.
- Both: **2:21.97**, **1920 × 1080**, **30 fps**, with identical decoded audio according to the recorded release QA.
- Captions: [subtitles-en-v8-keep-talking.srt](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8) (release attachment; 34 non-overlapping cues reported).
- Media source commit: `2ea416b220bd423245e5eeb0930264ce3845b028`; the v8 release tag points there. Later documentation-only commits do not change the app/session shown in the film.

## What the video really shows

1. Newly generated podcast/studio footage, including a robot reveal, produced with Gemini Omni and assembled editorially in FilmCraft. This is **not** the runtime studio UI.
2. One unbroken app capture/audio core from session `2026-11-02_1908_meta_adc9` (`adc9`) at 1x speed, showing the actual Meta-based request, search, WAIT/current-context review, short sourced answer and the conversation returning to the topic. The hosts in this recorded core are **synthetic fixtures**, not live people.
3. The actual Meta model produces and authorizes the answer; in the successful source recording the answer voice was rendered by **OpenAI TTS**, then received over LiveKit. No substitute scripted answer was inserted.
4. The two lines following the answer are **prewritten synthetic reactions**, triggered after observed completion of the actual answer. They are not spontaneous human feedback.
5. Generated studio dialogue is visibly/editorially separate from the underlying actual app recording. No manual HOLD scene, claimed instantaneous interruption or architecture slideshow is included.

The successful source run is `564027cfb9eefaf6cdba49c43b53563a6fc6582a`; the release package is tagged on a newer commit. It remains inappropriate to claim the current Gemini default co-host TTS route passed end-to-end: its recorded full app attempt was stopped by HTTP 429 after Meta DELIVER.

## Quality evidence and limitations

The v8 release reports full decode, nine source-audio alignment checks, 34 subtitle cues without overlap, a final automatic speech check, encoded-frame review, and matching decoded audio between the compressed copy and master. These are **production reports from the release**, not proof of an independently completed human watch/listen. The owner should assess character-voice continuity, intelligibility and proper names (especially the cited author) on the complete 2:22 file.

A recorded research/answer gap of roughly ten seconds remains in the underlying conversation. Do not claim instant lookup, zero-latency speech interruption or a measured user productivity gain. No generalized accuracy or reliability benchmark exists. Keep human-trial claims separate from synthetic fixtures.

## Before the form is submitted

- Watch/listen to the full preferred 21 MB file with English audio and captions, including the answer and follow-up lines.
- Decide whether to release this exact v8 edit, and confirm rights to Gemini-generated visuals and all synthetic audio.
- Approve public source and media. The current GitHub prerelease is **not a public video URL** while the repository is private.
- Open the final video and repository links in a **signed-out** browser. If the form rejects GitHub video links, use a publicly accessible approved video host and record the actual URL.
- Confirm the live form's current length and link rules; do not pad the 2:22 video to 3:00 without a documented reason.

See [submission copy](SUBMISSION.md), [readiness](SUBMISSION_READINESS.md), [release](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8) and [publication review](PUBLICATION_REVIEW.md).
