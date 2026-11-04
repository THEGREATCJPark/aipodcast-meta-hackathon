# Keep Talking — Conversation Co-host

**An AI research producer that lets people keep talking while it checks a reference.**

Built with the Meta Model API for the **Meta Global AI Developer Hackathon 2026**. An independent prototype, not an official Meta product.

### Watch the 2:22 demo

**[Watch the final-candidate English demo — Keep Talking v8](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4)** · [Release, master and evidence](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8) · [English subtitles](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8)

The video is **2:21.97, 1080p/30fps**. The 21 MB review copy and 192 MB FilmCraft master carry the same decoded audio. These GitHub links are **not accessible to the public while the repository remains private**. They must be tested signed out after publication approval. A smaller review copy is the recommended link for the submission form; the master is available for archival purposes.

**What happens:** A podcast scene introduces the co-host → the speakers ask it to check a missing reference → Meta searches as they keep discussing the topic → a brief sourced answer arrives → the hosts react and resume their discussion. The demo deliberately avoids a lengthy architecture slideshow and a separate HOLD sequence.

### Why it exists

Small podcast and creator teams often have no dedicated producer to verify a forgotten name or retrieve a reference in the middle of a conversation. A voice chatbot that speaks after every turn is the wrong tool. **Keep Talking** is a restrained research co-host: an explicit request starts a source-checked lookup, but the discussion continues and Meta reconsiders whether its answer is still relevant before the app lets it speak.

### How it works

1. **Listen.** Meta `muse-voice-transcribe-1.0` transcribes separate participants.
2. **Decide.** Meta `muse-spark-1.3` evaluates context and chooses WAIT, ASK, CLARIFY, SUMMARIZE or LOOKUP, referring to actual utterances.
3. **Research.** When Research PD is enabled and requested, Meta Responses `web_search` returns a short source-backed answer. The app validates completed-search evidence and current context before delivery.
4. **Respect the floor.** Continued speech does not cancel the lookup. The app holds audio until speakers finish and discards stale results on changed context, withdrawal, HOLD, session end or revoked permission.
5. **Speak and preserve evidence.** A separate TTS provider renders Meta-authored text; LiveKit sends the audio and the session recorder retains transcripts, source references, audio tracks and event history. Speech synthesis never replaces Meta's research decision.

Normal unsolicited remarks require an operator Handoff. Research PD is **opt-in, off by default**; an explicit spoken lookup may be delivered without a second Handoff once the floor is free.

### Evidence and disclosure

| What | Verified scope |
|---|---|
| Offline CI | **132 tests passed**, TypeScript checks and web/guest builds passed at source commit [`2ea416b`](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/commit/2ea416b220bd423245e5eeb0930264ce3845b028); [CI record](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/actions/runs/41584443719) |
| Actual Meta app session in v8 | **`2026-11-02_1908_meta_adc9`**: synthetic hosts → real Meta ASR, search, review and DELIVER → OpenAI TTS → received audio; one continuous recorded screen/audio core at 1x |
| v8 editorial scenes | Generated Gemini Omni studio/robot footage and scripted synthetic host lines. Post-answer dialogue was written in advance and triggered after the actual response finished. Not an unscripted human conversation |
| Current speech configuration | Default **Gemini 3.8 Flash TTS / Kore**. Standalone speech succeeded, but the full co-host Gemini-output run was blocked by HTTP 429/monthly spending cap. The successful recorded demo used **OpenAI speech**, not Gemini output |
| Not established | Two-person human usability, generalized accuracy/reliability, instant results, precise acoustic interruption latency, measured creator time savings |

**Do not interpret edited studio footage as an application feature or prewritten follow-up dialogue as spontaneous user feedback.** The real Meta answer was not substituted with a scripted answer. See [v8 media provenance](docs/VIDEO_V8.md), [engineering evaluation](docs/EVALUATION.md) and [provider limitations](docs/GEMINI_TTS.md).

### Run and verify locally

Requires Node **22.22+** within the compatible Node 22 line and npm:

~~~sh
npm ci
npm test
npm run typecheck
npm run build:web
npm run build:guest
npm run dev
~~~

Studio: http://localhost:4400 · Judge view: http://localhost:4400/?view=judge

The interface and offline tests run without paid credentials. For a live Meta session, copy `.env.example` to a locally ignored `.env` and supply your own authorized `META_API_KEY`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and the TTS provider's key. Current default Gemini route needs `GEMINI_API_KEY`; to intentionally reproduce the earlier verified OpenAI audio route use `TTS_PROVIDER=openai` with an authorized `OPENAI_API_KEY`. **No automatic provider fallback.** API calls may incur charges.

Do **not** expose the localhost operator/server over a public tunnel or commit .env, output/, data/, raw recordings, secrets or participant transcripts. Guest-only code is buildable but external hosting/real guest acceptance has not been verified. Provider access and a consented participant are required for live microphone use.

### What is new for the event?

This entry **builds upon a pre-existing React/Vite/Express/LiveKit studio and recorder**. Its hackathon contribution is the Meta-specific ASR/director, contextual and evidence-checked research producer, speech/floor controls, cancellation/revision handling, judge presentation and associated tests. We do not claim the original studio was built during this event.

[Contribution map](docs/CONTRIBUTIONS.md) · [Original baseline and provenance](docs/PROVENANCE.md) · [Hackathon disclosure](HACKATHON.md) · [Judge setup](docs/JUDGE_GUIDE.md) · [English entry text](docs/SUBMISSION.md) · [Final readiness and approval gates](docs/SUBMISSION_READINESS.md)

### Submission status

**Prepared, not submitted.** The project and v8 release remain private until explicit owner approval. No public-access verification, terms acceptance, promotional consent or submission receipt is implied. The Indie-track treatment of the inherited private foundation has not been specifically confirmed by the organizers. The final form requires a public repository and a demo video; see the [form inventory](docs/SUBMISSION_FORM.md) and [recorded rules](docs/hackathon/RULES.md).
