# Conversation Co-host — hackathon disclosure

A Meta-powered co-host that listens to human discussions, waits when it should, and asks grounded follow-up questions when useful.

November 3 update: improved studio typography and rapid-turn handling. Meta can recognize a pending lookup while speakers continue; current-context review still controls delivery. A scripted cadence check uses OpenAI host inputs and real Meta responses. Gemini opening/host generation remains blocked by the account's spending cap. See [current media evidence](docs/MEDIA_V6.md).

This private independent repository imports pre-existing AI MC Studio code. The React/Vite UI, Express server, LiveKit transport, legacy GPT/Gemini engines and recording foundation were not created from scratch for this repository. See [provenance](docs/PROVENANCE.md).

- Original app baseline: `b79131169fcd74abfb20a45e1daad78d29217cf8`.
- Reviewed snapshot: `23985f2f84cc7d86c651b35eea5e03ca98f01022`.
- Independent import: `ac71d68`.
- Work branch: `hackathon/meta-2026`.
- Final submission SHA: not frozen; record `git rev-parse HEAD` after final validation.

New work is the Meta-specific pipeline, turn controls, tests and submission documentation recorded in commits after the import. Do not equate repository creation with the start of all code development. Codex assisted implementation and documentation. Synthetic input voices use OpenAI TTS; the recorded answers use actual Meta responses rendered by OpenAI TTS. Editorial narration and speaker visualization are separately disclosed and are not app capabilities. Dependency versions are in package-lock.json; dependency notices and original-source rights still require review before publication. No project-wide open-source license is inferred from repository access.

The authenticated guide and form require public source, three-minute video, contributors, one team entry and event-contribution disclosure. The owner reports idea change allowed and directs preparation without organizer questions. Inherited-code and TTS interpretations remain disclosed in [RULES](docs/hackathon/RULES.md), not presented as organizer approvals. See [contribution map](docs/CONTRIBUTIONS.md) and [actual fields](docs/SUBMISSION_FORM.md). No standalone live URL field was observed; no entry or public deployment is claimed.

Video execution checkpoint: 564027c (2026-11-02), not a submitted final entry. The release source commit is identified by the final private package manifest. Actual-provider synthetic-input evidence is recorded separately from automated tests and pending human acceptance in EVALUATION.md.


Contributor record: repository owner THEGREATCJPark; preferred credited name and any additional human contributors must be confirmed before submission. Codex is disclosed as AI assistance, not asserted to be a human team member. The owner must confirm this is the team's single submitted project.

Creative direction: the original project persona reference was read without modifying its source. The independent hackathon co-host adopts general relaxed, candid pacing and concise witty questions; no show branding, copied signature dialogue, presenter voice imitation or endorsement is claimed.

The research-PD extension adds explicit opt-in spoken lookup routing through Meta Responses web_search, validated search/citation evidence and stale-result cancellation. This is focused contextual research, not unrestricted automatic fact checking. Runtime validation and human acceptance are separate in EVALUATION.md. The synthetic v3 demonstration is rendered and pending full listening/publication approval; no scripted answer is substituted for actual Meta output.
