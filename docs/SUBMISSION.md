# Keep Talking — final submission copy

Selected film: **v11, 89.2 seconds, English**. Prepared for the submission form; form transmission and terms acceptance remain with the entrant.

## Team Name

Keep Talking

## Track

Indie Developer

## Problem statement

Build for Your World

## Project Description

Keep Talking is an AI research co-host for small podcast teams without a dedicated research producer. When a host needs to check a reference, the team can delegate the lookup without stopping the discussion.

The co-host understands the request in context, researches in the background, and reviews the latest conversation before delivering a short answer with a source. Research completion and permission to speak are separate: the hosts keep the floor while they are talking, and can hold or cancel output.

In the demo, a podcast host asks which Muse Spark model the team can run on its own hardware. The hosts keep discussing privacy and GPU memory while Keep Talking researches the question. It waits for a pause, gives a short answer with a source, and the hosts use that answer to discuss what to run locally and what to send to a hosted service.

The film uses scripted synthetic hosts and an actual Meta-backed application session, edited for time. The hackathon work adds contextual research, source handling and turn control to an existing voice studio; the repository documents the contribution boundary.

## Public GitHub Repository

https://github.com/THEGREATCJPark/aipodcast-meta-hackathon

## 3-Minute Demo Video

https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v11/keep-talking-v11-antigravity-review.mp4

Selected submission video: **Keep Talking v11 — 1:29**. [Full-quality video and captions](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v11). Use this explicit v11 URL rather than an older release link.

## Describe your use of Meta products to build the submitted project

Meta powers the core research co-host: it transcribes the participants, interprets a request against the ongoing discussion, performs web research, and checks whether the result remains relevant before choosing WAIT or DELIVER. The application then enforces the speaker-floor and cancellation rules before playing the answer.

We built the Meta integration and research controls for the hackathon on an existing voice and recording foundation. A separate speech service renders Meta's answer. The repository includes the architecture, tests and run evidence.

## Why are Meta's models important to your solution?

The difficult part is deciding what to look up and when the answer belongs in the conversation. A useful research co-host must follow a discussion that continues after the request, then reconsider its result before speaking. Meta handles those contextual decisions and research together, allowing the product to support the conversation rather than turn every utterance into a chatbot exchange.

## Remaining personal form fields

The entrant supplies the actual contributor list, partner-tool feedback, opinion/recommendation ratings and any optional social link. Do not claim use of partner services or coding products that were not used.

Review the final form's video-host requirements and terms, then submit once and retain the receipt. [Submission checklist](SUBMISSION_READINESS.md).
