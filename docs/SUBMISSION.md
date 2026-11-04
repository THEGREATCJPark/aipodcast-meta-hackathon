# Final-candidate submission copy — 2026-11-04 KST

**NOT SUBMITTED.** English text prepared for the [authenticated form](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit) observed on November 2. No fields, checkbox, waiver or survey answers have been entered or accepted here. The form may have changed since inspection. Team membership, individual opinion fields, publication and final submission remain owner decisions.

## Team Name — required

Conversation Co-host

## Project Description — required

**Keep Talking — an AI research producer that lets speakers keep talking while it checks a reference.**

Small podcasters and creator teams cannot always afford a dedicated producer. When a host forgets a name or a source, stopping the show to search breaks the conversation. Keep Talking uses Meta's speech transcription and contextual decisions to recognize an explicit research request, investigate it while the hosts continue, and speak a brief sourced answer only when it still belongs in the discussion.

The application separates **research from speaking permission**. New conversation does not destroy the pending search, but fresh Meta review and clear-floor guards determine whether its result can be delivered. HOLD, withdrawal, permission changes and session end prevent stale audio from resurfacing. The prototype also records separate speakers, decisions, search evidence and audio tracks for review.

The hackathon work extends a **pre-existing React/Vite, Express, LiveKit and recording foundation** with Meta ASR, Muse Spark direction, web search/citation validation, stale-result and floor-control logic, judge UX and tests. Earlier code is disclosed, not represented as newly built. Synthetic English two-host recordings passed actual Meta ASR → lookup → relevance review → sourced answer → OpenAI TTS → LiveKit reception. Those are **synthetic-input runs**, not studies with human creators.

Our 2:22 demo, *Keep Talking v8*, combines explicitly generated studio scenes with **one continuous actual-provider app recording**. Its post-answer participant lines are written fixtures triggered after the actual AI answer, not spontaneous reactions. No fast/instant-response, broad fact-checking or measured user benefit is claimed. Source and reproduction evidence are available in the repository.

## Public GitHub Repository — required (pending approval)

https://github.com/THEGREATCJPark/aipodcast-meta-hackathon

**Status: PRIVATE at this preparation checkpoint.** Do not paste as an already accessible public link until owner-approved publication and logged-out verification. Default branch: `hackathon/meta-2026`. v8 media source SHA: `2ea416b`; submit the then-current final branch SHA, with passing CI, after release approval.

## 3-Minute Demo Video — required (pending public-link check)

**Candidate:** [Keep Talking v8, 2:21.97 — compressed review copy](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4)

**Release with subtitles/master/QA:** https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8

This is a real prepared GitHub release asset, but **not public while the repository is private**. The 21 MB copy is preferable to the 192 MB FilmCraft master for judge playback. After publication approval, verify the exact direct video URL while logged out. If the submission form requires a different host, upload the approved copy there and replace this field with the verified URL.

The observed form names the field "3-Minute Demo Video"; it did not establish that the film must be exactly 180 seconds. Re-check the live instructions. Automated audiovisual QA passed per release notes, while complete human viewing/listening acceptance is pending.

## Describe your use of Meta products to build the submitted project — required

Meta tools perform the core reasoning and research. We use `muse-voice-transcribe-1.0` for per-participant realtime transcription and `muse-spark-1.3` to identify relevant utterances and choose WAIT, ASK, CLARIFY, SUMMARIZE or an explicit LOOKUP. The operator-enabled lookup path uses Meta Responses `web_search` to obtain source evidence. We require completed-search support and validate provider annotations or selected links matching actual search hits. A fresh Meta current-context review then chooses WAIT, DELIVER, DISCARD or CANCEL before any answer is spoken.

LiveKit transports speaker audio. TTS is a **separate speech renderer**, not a replacement LLM for the Meta decision. The successful recorded v8 app response uses **OpenAI speech**; the current app selects **Gemini 3.8 Flash TTS / Kore** by default. Gemini standalone audio generation succeeded, but a full Gemini-output co-host attempt reached Meta DELIVER and failed at HTTP 429 (monthly spending cap). We do not represent the old OpenAI recording as a Gemini success.

Codex assisted coding, testing and documentation; Gemini Omni generated designated editorial film scenes. We **do not claim use of Muse Code** to build the app, nor that the editorial visuals are application runtime features.

## Why are Meta's models important to your solution? — required

Meta's models are the decision-making center rather than decorative chat. Their transcription supplies the multi-speaker context; Muse Spark decides whether to stay silent, ask a short question or search; Meta web search returns evidence; and a later Meta review determines if the answer is still relevant after the human discussion moves on. The application enforces permission, source and revision checks around those decisions. Actual-provider synthetic recordings show this path in operation, without claiming comparative model superiority or a completed human usability study.

## Proposed selections for owner review

- **Track:** Indie (individual builder). The official guide's treatment of this privately inherited foundation remains an eligibility interpretation, **not an organizer ruling**. The reuse is disclosed in `HACKATHON.md` and `docs/PROVENANCE.md`.
- **Problem theme:** Build for Your World.
- **Team members:** The form previously displayed Park ChanJun. Confirm all actual human contributors, authorized entrant status and a single entry before sending.
- **Likelihood of building with Meta API / overall opinion of Meta API:** only the entrant may supply genuine subjective choices. Do not fabricate favorable ratings.
- **Optional surveys** (Meta API and Muse Code ratings, obstacles, comparisons, switching, etc.): keep blank unless the owner answers or the current form demands completion.

## Final release and consent gates

This document is **prepared English copy**, not submission confirmation. The existing waiver grants broad perpetual organizer-use rights while retaining creator ownership, and the separate promotional checkbox is a distinct permission; review both before acceptance. Public repository conversion exposes source and **tracked history**, and does not automatically grant an open-source license. The generated/recorded media requires separate publication authorization.

Before transmission: confirm rights/eligibility/contributors; approve and publish source and video; listen to the entire v8 film; verify public links signed out; inspect live form/terms; answer personal surveys; submit one entry and retain an actual receipt.

Current documented deadline: **2026-11-05 11:00 KST** (2026-11-04 21:00 EST), subject to current organizer changes. [Submission form inventory](SUBMISSION_FORM.md) · [v8 identity](VIDEO_V8.md) · [approval register](hackathon/APPROVALS.md).
