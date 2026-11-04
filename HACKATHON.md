# Keep Talking — hackathon contribution

**Keep the conversation. Delegate the lookup.**

Keep Talking gives small podcast teams an AI research producer: ask a question in the context of a live discussion, keep talking while it researches, then receive a brief answer and source at a suitable pause.

**[Watch the selected 89-second demo](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v11/keep-talking-v11-antigravity-review.mp4)**

## Why it matters

A small creator team often has to choose between interrupting its discussion to search and leaving a reference unresolved. Keep Talking makes lookup a parallel task, with the hosts retaining control of the conversation.

## What we built during the hackathon

- Meta-powered speech transcription and contextual decisions across speakers.
- Explicit lookup requests, background research and source references.
- Fresh-context review before delivery, with model WAIT decisions and an application speech gate.
- HOLD, cancellation and stale-result protection.
- A conversation/research interface, recording evidence and regression tests.

## Meta's role

Meta handles understanding, research and conversational decisions. Voice transport, recording and speech rendering support those decisions. [Architecture](docs/ARCHITECTURE.md) · [Evaluation](docs/EVALUATION.md)

## Existing foundation

The project reuses the developer's React/Vite, Express and LiveKit studio and recording foundation. Those components predate this independent repository. The original source baseline is recorded in [PROVENANCE.md](docs/PROVENANCE.md), with a [contribution map](docs/CONTRIBUTIONS.md).

## Demonstrated scope

The selected film shows one actual application session with scripted synthetic participants, including a lookup, a WAIT decision, a sourced answer and continued host discussion. It is edited for pacing; it does not establish response-time or real-user performance benchmarks. [Film and evidence notes](docs/VIDEO_V11.md).

Independent project built with Meta; not an official Meta product.
