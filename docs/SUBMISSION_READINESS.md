# Submission readiness — Keep Talking v8 (2026-11-04 KST)

**Decision: the existing v8 recording is the selected submission candidate. Stop new feature work and unnecessary recuts. Final approval/publication/form transmission remain outstanding.** The app has actual-provider synthetic evidence; a human field trial is not claimed and is not required for the selected synthetic-demo scope.

| Deliverable | Evidence as checked | Status / remaining gate |
|---|---|---|
| Source | `hackathon/meta-2026`, media source commit `2ea416b`; inherited foundation and contributions disclosed | Documentation harmonized for final candidate; freeze final source SHA only after final CI |
| Engineering | GitHub Actions at `2ea416b`: **132/132 tests**, typecheck, main and guest build successful; large-bundle warning only | Check CI again on this documentation update; live-user reliability not established |
| Actual Meta path | Synthetic session `2026-11-02_1908_meta_adc9`, full Meta ASR/lookup/review/sourced answer with OpenAI TTS and LiveKit, including post-answer synthetic discussion | Disclose synthetic inputs and scripted post-answer lines |
| Current speech default | Gemini 3.8 Flash TTS / Kore | Standalone succeeded; full app output failed under 429 quota; do not claim an end-to-end Gemini result |
| Video | [Keep Talking v8](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8): **141.97 s**, 1080p30, 21 MB review / 192 MB master, release QA reports passed | Owner must watch/listen all the way through and approve exact file |
| English form answers | [Submission copy](SUBMISSION.md) mapped to actual field names observed Nov 2 | Confirm current form instructions and personal answers; do not invent ratings |
| Public GitHub | Repository is still **private** | Owner approves source/history/rights and makes it public; confirm signed-out access |
| Public video | Currently a **private prerelease**; real video asset URL prepared | Owner approves publication; open URL signed out or use approved public video host |
| Judge access | Offline tests and credential setup in [JUDGE_GUIDE](JUDGE_GUIDE.md); no live public app field observed | Source/video sufficient for prepared fields if the current form agrees; do not expose admin server |
| Legal/track | Indie/private inherited code interpretation remains unresolved; waiver/promotion permission not accepted | Owner reviews eligibility, contributor list, waiver and publication rights |
| Submission receipt | None | Submit the approved form before deadline and save its receipt |

## The minimum final handoff

1. Review [v8 video identity, disclosure and SHA-256](VIDEO_V8.md) and **watch/listen to the 21 MB file**, especially voice continuity, cited proper names and the transition after Meta's answer.
2. Approve releasing **both** the source (including Git history) and this specific video, after confirming contributor and asset rights.
3. Publish, then verify repository and video in a signed-out browser. If the direct release asset does not play publicly or is rejected by the form, choose an approved public host; do not submit a guessed URL.
4. Enter the field copy in [SUBMISSION.md](SUBMISSION.md). Confirm one Indie entry, Build for Your World and genuinely chosen personal response ratings. Read the current waiver and promotional checkbox.
5. Send the submission **only with explicit entrant authorization**, before **2026-11-05 11:00 KST** (per inspected guide; recheck current notice), and keep the receipt.

## No unsupported claims

- Synthetic two-speaker fixture ≠ a human podcast pilot.
- Actual Meta result + prewritten follow-up ≠ fully organic reactions.
- One recorded delay of roughly 10–13 seconds ≠ instant answer or a product speed benchmark.
- Source-linked model output ≠ guaranteed factual correctness.
- Code passing CI ≠ human microphone/guest acceptance.
- Current Gemini TTS quota blocker ≠ a verified Gemini co-host end-to-end success.
- An uploaded private prerelease ≠ a publicly accessible submission link.

For private source ZIP packaging, `npx tsx scripts/prepare-submission.ts` may be run on a clean final checkout to generate a SHA-bound archive and manifest; no ZIP, media or terms acceptance is required from this documentation update itself. See [publication audit](PUBLICATION_REVIEW.md) and [approval register](hackathon/APPROVALS.md).
