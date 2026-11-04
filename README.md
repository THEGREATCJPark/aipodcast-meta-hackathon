# Keep Talking — Conversation Co-host

**Keep the conversation. Delegate the lookup.**

An AI research co-host for small podcast teams. When a host forgets a name or reference, the group can ask the co-host to check it **without stopping the discussion**. The AI researches, checks whether the answer still matters, responds briefly with a source, and gives the floor back.

### Watch the demo (2:22)

**[▶ Watch Keep Talking v8](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4)** · [English captions and video assets](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8)

The demo starts like a podcast and reveals the AI producer at work. It follows **one actual recorded application session** in which Meta processes the request and provides a researched answer while the hosts keep talking. The conversation resumes after the answer.

*Demo disclosure:* The hosts are synthetic voices, and the cinematic studio scenes are editorial visuals—not an in-app 3D feature. The Meta requests, search, decision and spoken answer in the app segment are real; the hosts' follow-up lines were written in advance. This is not a human-user study.

> The demo and repository links remain private until publication is approved. This repository has not been submitted to the competition.

### What makes it different

- **Context, not a standalone question.** A short request can refer to a subject introduced across multiple speakers.
- **Research without interruption.** The lookup continues while people speak; the co-host does not have to answer every turn.
- **A timely answer, with a source.** Meta reviews the latest discussion before the app permits a short response.
- **Human control.** The operator can hold or cancel output. The app records speaker audio, sources and decisions.

### Built with Meta

Meta provides participant speech transcription, conversation decisions, web research and an updated relevance check before speaking. LiveKit handles voice transport; a separate speech service voices the answer. The project is an independent prototype, **not an official Meta product**.

### Run locally

Requires Node.js 22.22+ and npm.

```bash
npm ci
npm test
npm run typecheck
npm run build:web
npm run build:guest
npm run dev
```

Open **http://localhost:4400** (studio) or **http://localhost:4400/?view=judge** (conversation summary). The interface and offline tests can run without provider credentials. Live audio requires your own authorized Meta, LiveKit and speech-provider credentials; use `.env.example` and keep `.env` out of Git. Research PD is opt-in. Do not expose the local operator server directly to the internet.

### Hackathon contribution

This submission **reuses an earlier React/Vite, Express, LiveKit and recording foundation**. The hackathon work adds Meta-powered contextual listening, requested research and sources, current-conversation checks, speech/turn control, associated UI and tests. It does **not** claim that the entire studio was developed during the event.

[Hackathon contribution and disclosure](HACKATHON.md) · [Reviewer setup](docs/JUDGE_GUIDE.md) · [Engineering evidence](docs/EVALUATION.md) · [Video provenance](docs/VIDEO_V8.md)

**Limitations:** Synthetic input has passed actual-provider trials, but real-user conversational usefulness and broad accuracy/reliability have not been established. Answers are not instant, and linked sources still require human review.
