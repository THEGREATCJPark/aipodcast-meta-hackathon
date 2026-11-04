# Reviewer guide — Keep Talking

**[Watch the English 2:22 demo](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4)** · [What is real vs editorial](VIDEO_V8.md)

### One-minute product summary

Keep Talking is a **research co-host for podcast conversations**. Rather than requiring everyone to stop while somebody checks a forgotten reference, Meta can use preceding discussion to interpret a short request, research it, review whether the answer is still relevant and speak briefly when no one else is talking.

The demo includes actual Meta model/search activity from a controlled two-synthetic-speaker session. The surrounding studio imagery is a created presentation, not a real-time 3D studio. The post-answer conversation lines were scripted for the demonstration, not organic human responses.

### Run the code

Node 22.22+; npm:

```bash
npm ci
npm test
npm run typecheck
npm run build:web
npm run build:guest
npm run dev
```

Open http://localhost:4400 for the studio or http://localhost:4400/?view=judge for the summary. **Offline build and automated tests require no model credentials.** A new live speech session requires your own authorized Meta, LiveKit and external speech-renderer credentials in an ignored local `.env` as described by `.env.example`. Enable Research PD before making an explicit voice lookup request. Real-provider calls may be charged.

**No public live-app deployment is claimed.** Do not expose the local operator endpoint through a public tunnel.

### Inspect the work that was added

| File | Main purpose |
|---|---|
| `server/meta/asr-realtime.ts` | Meta speech input per participant |
| `server/meta/director.ts` | Conversational decisions grounded in actual utterances |
| `server/meta/research.ts` and `server/meta/session.ts` | Requested lookup, source checks and updated-context delivery |
| `server/agent/mc-agent.ts` | Control of speaker floor and output permission |
| `tests/research.test.ts` | Lookup, source and cancellation regression cases |

[Detailed contribution vs inherited code](CONTRIBUTIONS.md) · [Evaluation records](EVALUATION.md)

### Important limits

Synthetic-input integration is demonstrated, not a human usability study. The selected film's spoken answer uses a separate speech renderer and a real Meta result; it is not a prewritten model answer. A later default speech configuration has not been verified in a full live session owing to provider availability; see [technical verification](GEMINI_TTS.md) if attempting live reproduction. Audio latency is not claimed to be instantaneous; sources are for inspection, not guaranteed truth.
