# Keep Talking — hackathon contribution

An independent podcast research co-host built with the **Meta Model API** for Meta Global AI Developer Hackathon 2026. Not an official Meta product.

## The problem and the solution

Podcast creators often need to verify a reference while the conversation is still happening. The co-host listens to multiple speakers, receives a short lookup request, researches in parallel, checks whether its answer is still relevant and speaks briefly when the floor is clear. A human operator retains control.

**[Watch the 2:22 demo](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4)**

The film contains an actual recorded Meta-backed application segment with synthetic participant voices. Generated studio visuals are editorial, not a live app feature. Meta's answer is generated from its actual research; the participant lines after the answer are prewritten and triggered when playback ends. This is not an unscripted human-user trial.

## New work for this hackathon

- Meta **Muse Voice Transcribe** for per-speaker speech recognition.
- Meta **Muse Spark** for contextual WAIT / intervention / requested LOOKUP decisions and updated relevance review.
- Meta Responses **web_search**, with bounded source validation and traceable references.
- Continued research during human speech, separated from permission to speak; cancellation of obsolete/withdrawn results.
- Judge-facing conversation summary, evaluation probes and regression tests.

## Pre-existing foundation and other tools

The project reuses the developer's existing React/Vite, Express, LiveKit voice studio, legacy engine interfaces and recording tools. They were **not newly built for this submission**. The recorded app response uses a separate third-party speech synthesis service; cinematic studio scenes are generated editorial assets. Other models do not silently replace Meta's research decision.

Original project baseline: `b79131169fcd74abfb20a45e1daad78d29217cf8`. Independent import: `ac71d68`. Video's filmed app execution: `564027cfb9eefaf6cdba49c43b53563a6fc6582a`; video package source: `2ea416b220bd423245e5eeb0930264ce3845b028`. The final submission branch may contain later documentation updates.

[Code contribution map](docs/CONTRIBUTIONS.md) · [Full provenance](docs/PROVENANCE.md) · [Verification evidence](docs/EVALUATION.md) · [Video disclosure](docs/VIDEO_V8.md)

## Evidence and scope

At the v8 source checkpoint, 132 automated tests, typechecks and both web builds passed in CI. Actual Meta calls worked in controlled synthetic two-speaker sessions; failures are retained in the detailed evaluation ledger. **No general latency, reliability, factual accuracy, user benefit or human conversation acceptance is claimed.** Sources still need review.

The entrant's rights to pre-existing code and generated media, and the track-specific treatment of inherited code, need final approval. The repository and film remain private until separately authorized. No final form submission or waiver acceptance is claimed.
