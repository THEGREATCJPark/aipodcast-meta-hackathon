# Judge reproduction guide

This document prepares source-based review; it is not a hosted demo URL or proof of completed human testing. The repository is currently private pending approval. Read HACKATHON.md and PROVENANCE.md before evaluating event contributions.

## Offline review — no service credentials

Use Node 22.22 or newer compatible with package.json and the lockfile. In the project folder:

```sh
npm ci
npm test
npm run typecheck
npm run build:web
npm run build:guest
```

The recorded implementation checkpoint 786a773 passed 68 automated tests and CI. Tests exercise stale-result cancellation, permission gates, source validation, audio pacing, recorder preservation and guest-token restrictions. Fixtures are labeled synthetic; they do not establish human conversation quality.

## Local real-provider run

Copy .env.example to a local .env. Supply your own authorized META_API_KEY, OPENAI_API_KEY (TTS only), LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET. Do not paste keys into the web interface or commit .env. The maintained Meta route uses muse-voice-transcribe-1.0 and muse-spark-1.3; speech rendering uses OpenAI tts-1/alloy. Existing account access and provider charges apply.

Run `npm run dev`, open http://localhost:4400, choose Meta, and start a session only after participants consent. Standard responses need Handoff. Optional Research PD is off by default; enable and save it to permit explicit spoken lookup requests without a second button. HOLD stops pending output. Stop exports local session artifacts under output/; they are not uploaded automatically.

For an explicitly paid synthetic integration check on an idle studio:

```sh
npx tsx scripts/probe-research-studio.ts
npx tsx scripts/probe-research-studio.ts --interrupt
```

These commands create synthetic speech, use actual providers and restore prior settings. They are not part of offline CI and do not replace human trials. See EVALUATION.md for observed successes and failures.

## Review the event contribution

- server/meta: transcription adapter, contextual decisions, research, citation validation and cancellation.
- server/agent: permission checks and actual audio-output integration.
- tests/research.test.ts and tests/asr-pacing.test.ts: search/cancellation and timing regressions.
- Studio research evidence: generated words, source kind and timing are distinct from listener playback.

The inherited studio and recorder are disclosed infrastructure, not claimed as newly invented event features. Current limitations include no automatic ASR reconnect, no completed human/external-guest acceptance and no finished video. A public judge-access arrangement will be added only if required and approved; do not expose the localhost administrative server through a tunnel.
