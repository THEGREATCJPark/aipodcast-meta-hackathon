# Submission draft — English — NOT SUBMITTED

These are reusable responses, not a verified mapping to the authenticated form's fields or character limits. Reconcile with the actual form before transmission. Participant-copied requirements and their provenance are recorded in RULES.md.

## Project name
AI Conversation Director

## One-line description
A Meta-powered co-host that listens to human discussions, waits when it should, and asks grounded follow-up questions when useful.

## Impact
Small creator teams often moderate a conversation while participating in it. The co-host is designed to reduce that divided attention by proposing a useful follow-up, clarifying a mismatch, summarizing a discussion, or waiting. People retain control of the floor. We have not measured time savings, audience growth or market demand; these are hypotheses for evaluation, not reported results.

## Meta usage
Meta muse-voice-transcribe-1.0 transcribes separate participant streams. Meta muse-spark-1.3 chooses WAIT, ASK, CLARIFY or SUMMARIZE from bounded recent context and returns references to source utterances. The application validates those references and the context revision before speech. OpenAI tts-1/alloy renders the approved Meta text. No other language model silently replaces a failed Meta decision.

## Technical execution
The application retains React, Vite, Node, Express and LiveKit. Manual handoff gates speech; human speech and HOLD invalidate pending generation and playback. Separate evidence distinguishes generated text, synthesized audio and server-sent sound. Real-provider synthetic audio has passed through Meta ASR, the Meta director, OpenAI TTS and a separate LiveKit receiver. This is not evidence of a real human conversation. Human interruption, reconnect and external guest acceptance remain pending. Automatic ASR reconnect is not implemented; call/time limits are not a verified dollar spending ceiling.

## Existing work and event contribution
This is an independent snapshot of our existing AI MC Studio. The React/Vite interface, Express server, LiveKit transport, legacy GPT/Gemini engines and recorder are pre-existing work. The disclosed app baseline is b79131169fcd74abfb20a45e1daad78d29217cf8. Subsequent work adds the Meta co-host pipeline, validated contextual decisions, turn controls, evidence and tests. We do not claim all source was created during the event. Reuse eligibility for the applicable track still requires confirmation.

## Contributors and tools
Repository owner: THEGREATCJPark. Confirm the owner's preferred credited name and every other human contributor before sending. Codex assisted implementation, tests and documentation. No other human contributor is asserted without confirmation. The independent co-host uses general relaxed, candid conversational traits; no show affiliation, presenter voice imitation or endorsement is claimed.

## Demo and evidence
The required three-minute English video is in preparation; the script and filming checklist are in DEMO_SCRIPT.md and HUMAN_ACCEPTANCE.md. The application can locally capture a browser tab and microphone into a WebM preview/download; actual human recording acceptance is still pending. Existing synthetic-provider artifacts are private and must be labeled accurately if used.

## Links / freeze record
- Source: https://github.com/THEGREATCJPark/aipodcast-meta-hackathon (PRIVATE; public repository required by supplied participant instructions, publication awaiting approval)
- Branch: hackathon/meta-2026
- Reviewed implementation checkpoint: 1e5ec68 (not final submission SHA)
- Final frozen SHA: pending final checks
- Public runnable URL: none
- Public three-minute video URL: none
- Submission receipt/ID: none

## Final release checklist
- [ ] Resolve indie-track reuse, idea change and external TTS permissions; verify applicable current rules.
- [ ] Retrieve actual form, limits and any runnable URL or hosting-period requirements.
- [ ] Confirm all contributors and that this is the team's single project entry.
- [ ] Complete human acceptance and annotate evidence; keep synthetic input separate.
- [ ] Review final English video and public voice/face permissions.
- [ ] Review source rights, dependency notices, full new history, secrets and personal data.
- [ ] Obtain explicit approval to publish repository; then verify public access.
- [ ] Obtain approval for any public guest deployment; verify HTTPS and access boundaries.
- [ ] Freeze final SHA and ensure public source/video describe that version.
- [ ] Owner reviews final copy, accepts final terms and authorizes submission.
- [ ] Save receipt after transmission; only then mark submitted.

Internal package target: November 4 evening KST. Announced deadline: November 5, 2026 at 11:00 KST; recheck official updates before transmission.
