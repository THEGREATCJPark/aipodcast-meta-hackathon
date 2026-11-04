# Keep Talking / Conversation Co-host — hackathon disclosure

**Independent prototype built with Meta Model API for Meta Global AI Developer Hackathon 2026.** We are not claiming an official Meta affiliation.

## Scope and honest contribution boundary

This entry **imports an existing AI MC Studio foundation**, including a React/Vite interface, Express server, LiveKit transport, legacy GPT/Gemini engines, recording and session infrastructure. It was not all written during this hackathon or invented when the new repository was created.

- Original app: https://github.com/THEGREATCJPark/aipodcast ; baseline `b79131169fcd74abfb20a45e1daad78d29217cf8` (dated 2026-10-28).
- Reviewed source snapshot: `23985f2f84cc7d86c651b35eea5e03ca98f01022`.
- Independent private repository import: `ac71d68`.
- Submission branch: `hackathon/meta-2026` (default branch).
- v8 media/code source snapshot: `2ea416b220bd423245e5eeb0930264ce3845b028`. Later submission-document commits do not alter this filmed execution; the final submitted code SHA should be taken from the then-current branch HEAD.

**Event additions:** Meta participant ASR, Muse Spark contextual decisions, opt-in spoken LOOKUP and Meta Responses web_search, validated source attribution, research survival through human speech, current-context relevance review, stale-result/permission cancellation, speaker timing reliability fixes, judge-facing evidence display, synthetic real-provider probes and Meta-specific regression tests. See [review map](docs/CONTRIBUTIONS.md) and [evidence ledger](docs/EVALUATION.md). Codex assisted coding, validation and documentation; no use of Muse Code is claimed.

## Selected video and its provenance

**[Keep Talking v8 (2:21.97)](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v8/keep-talking-v8.mp4)** · [Release with quality reports and 192 MB master](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8) · [Exact identifiers](docs/VIDEO_V8.md).

The intro and surrounding studio footage use **Gemini Omni-generated synthetic people/robot scenes**. The one continuous actual app core records `2026-11-02_1908_meta_adc9`, using two **synthetic** hosts, real Meta transcription, lookup, source review and spoken-answer authorization, a separate **OpenAI** TTS renderer and LiveKit audio reception. The actual Meta response is not prewritten or swapped. Two subsequent host reactions were prewritten and sent only after actual answer audio was received; they do not prove spontaneous human interaction. The runtime UI and editorial graphics are distinct. No copied SPNS TV brand, voice imitation or endorsement is claimed; only general conversational pacing informed the creative direction.

The source app **now defaults to Gemini 3.8 Flash TTS / Kore**. Standalone Gemini audio generation was successful; the latest complete Gemini speech route failed at HTTP 429 after Meta DELIVER because of the recorded account spending cap. A passing OpenAI-output demo must not be mislabeled a successful Gemini-output integration. Provider-specific results: [GEMINI_TTS.md](docs/GEMINI_TTS.md).

## Verification and limits

- CI on release source `2ea416b`: **132 automated tests passed, 0 failures**, typecheck and main/guest builds passed; [CI run](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/actions/runs/41584443719). The test count includes inherited tests, not 132 all-new event cases.
- Several real-provider synthetic sessions passed, including the filmed `adc9` core; failed runs are preserved in [EVALUATION.md](docs/EVALUATION.md).
- No genuine two-person human podcast trial, verified public production deployment, measured creator benefit or general accuracy/reliability claim. A roughly 10–13 s observed synthetic vocal gap is not zero-latency research.
- No general automatic fact-checking or automatic LLM fallback. Source URLs do not guarantee claim-level factual correctness.

## Eligibility, rights and entry

The authenticated participant guide and submission form require a **public repository, 3-minute-demo field, contributor disclosure and new-work differentiation**. The recorded form did not show a separate live-app URL field. The owner reported that idea changes are permitted, but there is **no specific organizer ruling** in these documents resolving Indie use of this pre-existing private baseline or external TTS. We disclose both rather than asserting eligibility.

Repository/history and v8 release are **currently private**. Publication exposes tracked history; no project-wide MIT/open-source license is granted by default. Dependency and original-source rights require owner review. The waiver grants broad organizer media/IP use rights, and the promotional checkbox is separate. No consent, terms acceptance or form submission is claimed here.

Entrant/team display prepared as **Conversation Co-host**, with the previously observed prefilled member **Park ChanJun**. The owner must confirm all actual contributors, a single entry, track, rights and personal survey answers. [Owner approvals](docs/hackathon/APPROVALS.md) · [Prepared English form copy](docs/SUBMISSION.md) · [Readiness](docs/SUBMISSION_READINESS.md).
