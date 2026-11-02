# Status — 2026-11-02 KST

## Implemented

Independent PRIVATE repository, source-only baseline ac71d68 and work branch hackathon/meta-2026. Original project remains preserved. Current reviewed checkpoint: 1e5ec68; not a frozen submission SHA.

The Meta pipeline includes per-participant realtime ASR, validated contextual decisions, manual host handoff, OpenAI TTS, context/generation cancellation, bounded queues/context/calls and separate generated-versus-sent audio evidence. React/Vite/Express/LiveKit and existing recording structure are retained. Studio and Judge views expose controls and provider roles. Full details and limitations are in ARCHITECTURE.md.

## Tested

- Baseline: npm ci, 29 tests, typecheck and web build passed.
- Post-implementation checkpoint: 41 automated tests, typecheck and web build passed; bundle-size warning remains. Local studio and Judge view inspected with Playwright.
- Local Host/Origin rejection and guest token grant/expiry tests passed. These are not full production authorization verification.
- Real account calls verified Meta muse-voice-transcribe-1.0 and muse-spark-1.3, OpenAI tts-1/alloy and LiveKit authentication.
- Synthetic Korean audio traversed actual Meta ASR → Meta director → OpenAI TTS → LiveKit sender/separate receiver, with private WAV and JSON evidence. This is a real-provider synthetic-input probe, not a real human discussion or complete Studio acceptance test. See EVALUATION.md.

## Pending acceptance

Human microphone end-to-end sessions, automatic interruption audible at a listener, separate manual HOLD verification, real WAIT opportunities, topic-change cancellation, reconnection/identity, external guest operation, and two people plus AI remain pending. No real human-session success, performance benefit or listening-quality score is claimed. English acceptance instructions and filming procedures are in HUMAN_ACCEPTANCE.md and DEMO_SCRIPT.md.

## Rules and release blockers

Owner-supplied participant instructions establish a public-repository and three-minute-video requirement, contributor listing, one project per team and disclosure of event contributions. Their source status and rubric are recorded in RULES.md. Startup reuse is explicit in that supplied text; indie reuse, application-idea change, external TTS and exact form/deployment requirements remain unresolved.

Repository publication still requires explicit approval. No public app, completed video, public voice-release permission, final terms acceptance or submission receipt exists. Authentication is no longer a blocker for the models tested; the earlier no-auth checkpoint is historical.

## Deferred / limitations

No automatic ASR reconnect; restart is required. Usage caps are not a verified dollar spending ceiling. Advanced avatar/lip sync, long editing, multiple AI panels, social publishing and broad fact checking remain out of scope. The presentation direction uses an independent relaxed, candid co-host with short, witty questions; it does not claim endorsement or imitate a real presenter's voice.

Target package completion: November 4 evening KST. Announced deadline: November 5, 11:00 KST, subject to official change. Preparation is not submission.

## Local filming and guest packaging

A capture panel records a user-selected browser tab plus connected microphone, with a local preview/download and 180-second WebM limit. It does not upload; a ten-second human audio/capture test is still required. FFmpeg is unavailable on PATH. A guest-only static build target (`npm run build:guest`, `dist/guest`) is prepared for approved HTTPS hosting; no deployment or external guest success is claimed.


Latest integrated evidence: 2026-11-02 10:26 KST synthetic English input through real Studio HTTP/McAgent/VAD/providers/recorder succeeded. WAIT then handoff ASK, separate participant audio receipt, HOLD state and stop artifacts verified. This is not human acceptance or measured audible stopping. See EVALUATION.md and HUMAN_ACCEPTANCE.md.

English MVP preparation is complete for owner acceptance: 49 tests, typecheck, main web build and guest-only build passed. Fixed SPNS-inspired original English style, local 180-second capture/preview/download, English test script and three-minute production script prepared. Source remains private; human acceptance, final footage/export, public access and submission receipt are outstanding.

## Scope clarification — research PD (2026-11-02)
Owner wants the co-host to resolve forgotten facts during a natural singularity discussion and actually look up supporting information. Runtime web lookup, web-source evidence and opt-in spoken lookup requests are NOT implemented in the current manual-handoff pipeline. They are now required before the owner's human rehearsal/filming. See SUBMISSION_READINESS.md and revised English DEMO_SCRIPT.md. This is not a claim that everything except filming is ready.
