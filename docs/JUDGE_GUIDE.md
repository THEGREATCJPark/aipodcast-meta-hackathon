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

The corrected implementation passed 115 automated tests, typecheck and both builds; prior CI results belong to their recorded checkpoints. Tests exercise stale-result cancellation, permission gates, source validation, audio pacing, recorder preservation and guest-token restrictions. Fixtures are labeled synthetic; they do not establish human conversation quality.

## Local real-provider run

Copy .env.example to a local .env. Supply your own authorized META_API_KEY, GEMINI_API_KEY (TTS only in the co-host route), LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET. Do not paste keys into the web interface or commit .env. The maintained Meta route uses muse-voice-transcribe-1.0 and muse-spark-1.3; speech rendering defaults to Gemini gemini-3.8-flash-tts / Kore. Existing account access and provider charges apply. Standalone Gemini speech succeeded; a subsequent full co-host run was quota-blocked at TTS. See GEMINI_TTS.md. Earlier recordings used OpenAI speech.

Run `npm run dev`, open http://localhost:4400, choose Meta, and start a session only after participants consent. Standard responses need Handoff. Optional Research PD is off by default; enable and save it to permit explicit spoken lookup requests without a second button. HOLD stops pending output. Stop exports local session artifacts under output/; they are not uploaded automatically.

For an explicitly paid synthetic integration check on an idle studio:

```sh
npx tsx scripts/probe-conversation.ts --scenario=podcast
# Separate control probe, not a physical button or acoustic interruption trial:
npx tsx scripts/video/record-control.ts
```

These commands create synthetic speech, use actual providers and restore prior settings. They are not part of offline CI and do not replace human trials. See EVALUATION.md for observed successes and failures.

## Review the event contribution

- server/meta: transcription adapter, contextual decisions, research, citation validation and cancellation.
- server/agent: permission checks and actual audio-output integration.
- tests/research.test.ts and tests/asr-pacing.test.ts: search/cancellation and timing regressions.
- Studio research evidence: generated words, source kind and timing are distinct from listener playback.

The inherited studio and recorder are disclosed infrastructure, not claimed as newly invented event features. Current limitations include no automatic ASR retry loop, no completed human/external-guest acceptance and no public video URL (local v3 is rendered, listening approval pending). After ASR failure, Resume authorizes one reconnect attempt per identity; a repeated failure requires restart, and missing transcription is not backfilled. A public judge-access arrangement will be added only if required and approved; do not expose the localhost administrative server through a tunnel.


## Reliability audit checkpoint — 2026-11-02

The current suite passed 115/115 tests, typecheck and both web/guest builds; large-chunk warnings remain. Research now survives ordinary speech, then requires fresh Meta relevance/permission review before delivery. `npx tsx scripts/probe-conversation.ts` is an explicit paid two-synthetic-speaker real-provider probe (add --scenario=good for the other reference; default is vinge). It caches only synthetic input TTS under ignored output/; ASR, search, review and answer TTS still use real services; `npx tsx scripts/evaluate-director.ts` runs six paid text scenarios. Both were exercised with results scoped in EVALUATION.md. Neither proves human acceptance or source accuracy. The independent repository default branch now opens the Meta version.

Review the ASR gap/reconnect evidence, queued-handoff generation checks, session transition guards and full-identity recording filename suffixes. If transcription fails, inspect the error, use Resume once to authorize recovery, and expect a possible transcript gap. Handoff cannot bypass failed transcription. A second failed attempt requires a session restart. Speech or HOLD must invalidate any queued handoff before it can speak.

Human testing remains deferred. Synthetic filming and local v3 editing are complete; full video listening acceptance remains pending. Do not infer microphone permissions, external guest usability or capture audio quality from passing Node tests or builds. The local capture preview/download remains available for a later explicitly initiated channel check.
