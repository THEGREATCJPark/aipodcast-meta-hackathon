# Reviewer guide — Keep Talking

**[Watch the 89-second demo](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v11/keep-talking-v11-antigravity-review.mp4)** · [Demo evidence](VIDEO_V11.md)

## What to look for

| In the film | What the product does |
| --- | --- |
| A host asks which model runs locally | Interprets a lookup request in the discussion's context |
| The hosts continue discussing privacy and GPU memory | Research runs independently of the speaker floor |
| The app shows WAIT | A completed result does not automatically interrupt the conversation |
| The co-host gives a short answer and source | Reviews relevance and returns the floor to the hosts |

## Run locally

Node.js 22.22+ and npm:

```bash
npm ci
npm test
npm run typecheck
npm run build:web
npm run build:guest
npm run dev
```

Open http://localhost:4400 for operator controls or http://localhost:4400/?view=judge for the conversation and research view.

Offline tests and builds require no provider credentials. To run a live session, create a local `.env` using `.env.example` and configure your own Meta, LiveKit and speech-provider credentials. Keep `.env` untracked. Enable **Research PD**, connect participants and ask an explicit lookup question after introducing a topic. HOLD stops output. The local studio is an operator interface, not a public guest deployment.

## Inspect the implementation

| File | Responsibility |
| --- | --- |
| `server/meta/asr-realtime.ts` | Per-participant speech input |
| `server/meta/director.ts` | Contextual decisions |
| `server/meta/research.ts` | Background lookup and sources |
| `server/meta/research-review.ts` | Current-context review before delivery |
| `server/agent/mc-agent.ts` | Speaker-floor and output control |
| `tests/research.test.ts` | Research regression cases |

[Contribution map](CONTRIBUTIONS.md) · [Architecture](ARCHITECTURE.md) · [Evaluation](EVALUATION.md)

The film is a controlled synthetic-input run, not a human usability study. See [production notes](VIDEO_V11.md) for the session, providers and edit boundaries.
