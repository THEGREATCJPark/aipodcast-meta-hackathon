# Submission draft — mapped to the authenticated form — NOT SUBMITTED

The authenticated [submission form](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit) and [participant guide](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details) were inspected in Chrome on November 2, 2026. No form data was entered or submitted. The following English copy maps to the observed fields. No visible maxlength attributes were found; server-side limits remain unknown. See SUBMISSION_FORM.md for the full field inventory and unanswered owner choices.

## Team Name — required
Conversation Co-host

Proposed team name for owner review; not entered into the form.

## Project Description — required
An AI research producer that lets speakers keep talking while it checks a requested reference.

Built for small creator teams without a dedicated researcher. A short explicit request draws on the conversation; Meta researches while speakers continue, reviews the latest context, and offers a brief sourced answer when permitted. It does not promise instant answers or autonomous fact-checking.

The project builds on our existing React/Vite, Node/Express and LiveKit studio and recording foundation. The work added for this entry is the Meta transcription/director integration, evidence-validated web research, speech permission and cancellation controls, and tests. The original baseline and subsequent contributions are disclosed in HACKATHON.md and docs/PROVENANCE.md. We do not claim that all code was created during the event.

Actual-provider synthetic English input has traversed the full Studio, Meta ASR, contextual LOOKUP without a handoff button, Meta web search, cited response, OpenAI TTS and a separate LiveKit receiver. A separate synthetic interruption trial suppressed late audio during its defined observation window. These are synthetic-input trials, not human conversations or measured user benefits. Human acceptance remains unverified; recorded synthetic demonstrations are clearly disclosed. Checkpoint 813a027 passed 98 automated tests, typecheck, web/guest builds and CI; three consecutive full voice trials used synthetic input. Consult EVALUATION.md for subsequent preparation checks.

## Public GitHub Repository — required
https://github.com/THEGREATCJPark/aipodcast-meta-hackathon

Current visibility: PRIVATE. This URL does not yet satisfy the public-repository requirement. Publication requires explicit owner approval after review. Branch: hackathon/meta-2026. Verified voice checkpoint: 813a027; final submission SHA is not frozen.

## 3-Minute Demo Video — required
No public video URL exists. An earlier local video is preserved; Claude owns the final edit from the new raw-evidence handoff. Do not enter a fabricated link or substitute a screenshot. The English production script and capture checklist are prepared in DEMO_SCRIPT.md and HUMAN_ACCEPTANCE.md. The guide requires the demo to focus on new work and distinguish event contributions.

## Describe your use of Meta products to build the submitted project — required
We use muse-voice-transcribe-1.0 through Meta's realtime ASR endpoint to transcribe separate LiveKit participant streams. Muse Spark 1.3 chooses WAIT, ASK, CLARIFY, SUMMARIZE or LOOKUP from recent conversation and supplies references to the relevant utterances. The application validates the decision and context revision before allowing speech.

For operator-enabled, explicit research requests, Muse Spark uses Meta Responses web_search. We require completed search evidence and either provider citation annotations or final-answer links that exactly match actual search results, with these source types labeled separately. Human speech interrupts output while the bounded research job continues. A fresh Meta review of the latest conversation determines WAIT, DELIVER, DISCARD or CANCEL before any short answer is spoken. HOLD, withdrawal, session end and permission changes cancel the job. OpenAI tts-1/alloy supplies separate speech synthesis of Meta's text; no other language model silently replaces Meta's decision or search. Codex assisted development, tests and documentation; we do not claim use of Muse Code to build this project.

## Why are Meta's models important to your solution? — required
Meta models handle the central conversation decisions, not a decorative feature. Speech recognition provides the discussion context; Muse Spark decides whether to wait, ask, clarify, summarize or perform a requested lookup. The research path connects an explicit request to external source evidence before the answer can speak. This makes the model's choice and grounding inspectable while application controls preserve the participants' floor. Our recorded provider trials demonstrate this path with synthetic input; they do not establish comparative model superiority or human conversation quality.

## Team Members — prefilled
Park ChanJun. Confirm the participant list is complete and the team is submitting only one project. Additional private profile metadata is not reproduced here.

## Required radio choices — owner answers pending
- Track: prepare Indie Developer Track for the individual-builder entry; do not switch to Startup to obtain a reuse exception. Include inherited-code disclosure and the owner's factual eligibility review in final submission review; no organizer question is queued.
- Problem theme: **Build for Your World** is the prepared choice, matching the creator-domain problem; included in final submission review. Push the Frontier is the other choice.
- Likelihood of building with Meta API: owner answer required; do not infer from technical success.
- Overall opinion of Meta API: owner answer required; do not invent an endorsement.

## Optional fields and additional surveys
The optional X viral-post link and partner feedback can remain empty unless the owner supplies content. Unmarked surveys ask Meta API and Muse Code recommendation ratings, biggest obstacle, model comparison, selection priority and explanation, switching difficulty, and production blocker. These require the owner's subjective answers; no ratings or Muse Code experience are invented. No separate live-app URL field was observed.

## Promotional permission and final release gates
The form includes a checkbox authorizing Meta and Cerebral Valley to publish, share and promote submitted materials across channels. It remains unchecked. Its required status was not established; explicit owner approval is needed for this permission and final submission.

- [x] Record owner's confirmation that idea change is allowed and instruction to proceed without organizer questions. Disclose inherited code, new contributions and external TTS without asserting a guaranteed eligibility ruling.
- [ ] Confirm team name, complete contributors, single entry, track/theme and subjective survey responses.
- [ ] Review source rights, dependency notices, history, secrets and personal data; approve public repository publication.
- [ ] Review the final Claude edit and synthetic-input disclosure; approve public media use. Human testing is not represented as complete.
- [ ] Review promotional permission, final terms and the exact materials to be transmitted.
- [ ] Freeze final SHA, verify public links, authorize submission and retain the receipt.

No terms were accepted and no submission receipt exists. Announced deadline: November 5, 2026 at 11:00 KST, subject to official changes. Internal package target: November 4 evening KST.

Waiver review: the subsequently inspected waiver retains IP ownership but grants broad perpetual, irrevocable, royalty-free rights. Open-source-component permission is conditional and does not resolve reuse of this private baseline for the Indie track. The promotional checkbox remains unchecked (`ariaRequired=null`); owner review of the actual waiver and permissions is required before any acceptance or submission.
