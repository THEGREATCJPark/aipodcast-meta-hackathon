# Keep Talking — final submission copy (English)

**Prepared for review; not submitted.** These answers follow the participant form inspected on November 2, 2026. Confirm the current form and publication rights before sending.

## Team Name

Conversation Co-host

## Project Description

**Keep Talking is an AI research co-host that lets podcast guests keep talking while it checks a missing fact or reference.**

Small creator teams do not always have a producer ready to look things up during a conversation. A host can ask a brief question based on earlier discussion; the AI researches the requested reference while the people continue speaking. Before responding, it checks the latest context and whether it has the floor, then delivers a concise sourced answer and steps back. The session preserves the conversation, source evidence and audio.

The submission demonstrates a working Meta-powered prototype with **synthetic participants and real model calls**. In the recorded app scene, Meta transcribes and interprets the discussion, performs the lookup and reviews relevance before a separately synthesized voice delivers its answer. Generated podcast visuals provide the setting; they are not an application feature. The conversation after the response is scripted synthetic material, not human-user feedback.

The project extends an existing audio studio and recorder. Its hackathon contributions are the Meta conversation/research pipeline, source validation, floor and cancellation handling, and a judge-facing conversation view. Existing and new work are disclosed in the repository.

## Public GitHub Repository

https://github.com/THEGREATCJPark/aipodcast-meta-hackathon

**Publication still requires owner approval.** Do not submit this as a public link until it opens in a signed-out browser.

## 3-Minute Demo Video

https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4

**Selected film:** *Keep Talking v8*, 2 minutes 21.97 seconds, English. [Release and subtitles](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8). The final form must accept this length and URL, and the film must be publicly playable before transmission.

## Describe your use of Meta products to build the submitted project

Meta is the core of the experience. Its speech recognition processes the separate participants; **Muse Spark** interprets requests, decides when to wait or act, uses Meta's **web search** for requested references, and checks whether a researched answer is still relevant after the discussion moves on. The application validates the source and controls whether speech may be played.

The Meta integration, research/turn controls and tests were added for the hackathon. A pre-existing LiveKit studio provides transport and recording. Spoken audio is rendered by a separate speech service; video studio imagery and synthetic hosts are editorial media, not Meta model outputs from the live app. Codex assisted development; **Muse Code is not claimed**.

## Why are Meta's models important to your solution?

This is not just a transcription widget or a voice wrapper. Meta determines which part of the conversation matters, whether a specific lookup was requested, what the evidence supports and whether delivering that answer still fits the discussion. People can keep talking while research continues, and the system avoids speaking over them. Without those Meta-driven decisions, the central research co-host behavior would not work.

## Owner-only form choices (do not invent)

- Proposed **track:** Indie Developer.
- Proposed **theme:** Build for Your World.
- **Contributors:** Confirm the prefilled member and any other actual human contributors; one team entry.
- **Opinion and recommendation questions:** The entrant must supply genuine answers. Do not invent ratings or claim use of untried tools.
- **Rights / waiver / promotional checkbox:** Require separate entrant review and approval.

**Submission state:** The source/release are private; no waiver or promotional rights have been granted, and there is no submission receipt. The inherited-code eligibility interpretation has not been confirmed by a specific organizer ruling. See [full requirements and approvals](SUBMISSION_READINESS.md).
