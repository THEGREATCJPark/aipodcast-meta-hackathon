# Event contribution review map

The imported foundation is ac71d68, derived from app baseline b79131169fcd74abfb20a45e1daad78d29217cf8. Its snapshot date is not the development start date for every line. Only new event contributions should be featured as new work in the demo.

| Area | Inherited foundation | Event contribution / evidence |
|---|---|---|
| Studio | React/Vite interface and Express local server | English co-host/research controls and judge view; 1999c92, 786a773 |
| Speech | LiveKit transport, PCM structure and legacy engines | Meta participant ASR and validated contextual decisions; 52266b1; actual-provider probes 1e5ec68 |
| Research | Existing legacy engine capabilities, not claimed as new | Meta Responses web_search, explicit spoken LOOKUP and inspectable citation kinds; 786a773 |
| Floor control | Existing agent and audio queue infrastructure | Meta revision/generation cancellation, HOLD and late-result rejection; 52266b1, 1999c92, 786a773 |
| Recording | Existing WAV/mix/session recorder | Meta decisions, source evidence and generated-vs-sent audio distinction; baseline recorder is not claimed as invented here |
| Reliability | Existing baseline tests | Meta protocol/cancellation/permission/research tests and clock-based ASR pacing fix; 68 total tests at 786a773, not 68 all-new tests |
| Submission | Existing app history | Independent provenance, English evaluation ledger, real-form mapping and reproducible judge instructions |

## Suggested code review order

1. server/meta/director.ts: Meta chooses WAIT or an actionable intervention with source utterance IDs.
2. server/meta/research.ts: real search evidence and selected sources are validated before speech.
3. server/meta/session.ts and turn-manager.ts: permission and fresh context checked across asynchronous work.
4. server/agent/mc-agent.ts: actual LiveKit output and recorder integration.
5. tests/research.test.ts and asr-pacing.test.ts: failures, stale results and timing regressions.

Use `git diff ac71d68..786a773` for the implemented event changes and EVALUATION.md for observed behavior. Evidence includes synthetic input through actual services, not completed human trials. Codex assisted development; no Muse Code use is claimed. Meta makes core decisions/research; OpenAI only renders speech.

The owner has directed continuation without organizer clarification and reports the idea change is permitted. This map supports honest contribution disclosure; it does not manufacture a track-specific eligibility ruling.
