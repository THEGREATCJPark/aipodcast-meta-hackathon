# English submitted-demo preparation

The owner-approved current candidate is the completed synthetic v3 edit described in VIDEO_PRODUCTION.md and SUBMISSION_READINESS.md. It uses actual Meta responses and prewritten synthetic post-answer discussion; no new presenter recording is required. Current execution evidence is at 564027c. The scripts below are historical planning, not a requirement to film again or proof of human acceptance. Final full watch/listen remains pending.

## Editorial direction

Fixed reference: SPNS TV / Shoes Off conversational production pattern as described by the owner: people talk naturally and briefly ask a producer to find a missing fact. Our independent English AI co-host should perform that narrow research task and return the floor. No presenter impersonation, copied catchphrases, show branding or invented personal memories.

## Central scene — clues distributed across speakers

These are English rehearsal/fixture prompts, not captured runtime evidence. Use separate participant identities. Do not supply a canned AI reply, expected author's name, exact year or paper title in the input. The research lifetime and fresh relevance check passed synthetic integration trials; natural human performance remains unverified.

Host: “What interests me is the loop: a machine designs a better machine, and that one improves the next.”

Guest: “That argument was in an old paper, wasn't it? Long before today's chatbots. I can't remember who wrote it.”

Host: “AI, who was that? Check a source.”

While the actual research job is pending, Guest continues: “While you look, I think the bottleneck could still be experiments. A clever design doesn't build its own factory.”

Host: “Right. Faster thinking and faster real-world testing aren't the same thing.”

Expected behavior, not a scripted answer: resolve the short request from both participants' earlier clues, preserve the research job during their conversation and show its pending status. When a result is ready and the floor clears, Meta must reassess whether the original question remains relevant. It may deliver a brief sourced answer, clarify uncertainty or withhold an outdated result. Let the actual model produce the words; do not inject Good as the answer. The clues may be insufficient, in which case clarification is a legitimate outcome.

Guest after an actual answer: “So the argument describes a feedback loop, not a guaranteed date.”

Host: “What would make that loop work—or stall?”

Expected behavior: return the floor and WAIT during ordinary discussion. Keep the actual wait visible, or explicitly label any time cut. No “instant answer” claim.

Correction take: while the first research job is pending, Host says, “No, I meant the later essay by a science-fiction writer, around the early nineties. Check that instead.” The evaluator target is Vinge's 1993 reference, but it must not be hardcoded or fed as a prewritten answer. Log whether the old result is discarded or superseded and whether the new source supports the response.

Additional takes: “Who invented the singularity?” tests ambiguity; a request to substantiate a guaranteed exact future date tests unsupported claims; Guest asking Host “Who was that again?” tests an ordinary peer question that should not authorize AI lookup. Explicit withdrawal (“Never mind, don't look it up”) and operator HOLD are separate cancellation tests. Ordinary continued speech is not a withdrawal.
## Fact checked for scenario writing

Stuart Russell's Berkeley research page identifies I. J. Good's 1965 article, *Speculations Concerning the First Ultraintelligent Machine*, and discusses machines designing more capable machines and an intelligence explosion.
Source: https://people.eecs.berkeley.edu/~russell/research/future/
Publisher metadata: https://www.sciencedirect.com/science/article/pii/S0065245808604180 (search metadata observed; full-page retrieval returned 403).

These sources support the script's factual target. This research was performed while preparing the document; it is NOT proof that the application retrieved them. Runtime must retrieve and log its own evidence. Neither a singularity date nor inevitable future progress is presented as established fact.

## Three-minute cut

| Time | Picture / real action | English narration or content |
|---|---|---|
| 0:00–0:15 | Lounge and two participants | “When a conversation stalls on a forgotten fact, someone usually turns to the producer. We want an AI co-host to handle that moment—and then get out of the way.” |
| 0:15–0:35 | Brief product and provider roles | “Meta listens to the discussion and decides whether to wait, ask a question, or help check a specific fact. People retain control.” Show only the observed request and actual answer. |
| 0:35–1:20 | Distributed-clue scene, continued conversation during research, actual result | Preserve actual audible reply and source card. Show real elapsed lookup; label any edited wait. Do not pre-record a model answer and represent it as current inference. |
| 1:20–1:40 | Humans continue discussing feedback loops | “The answer is short. The source stays on screen. The people keep the conversation.” Show actual WAIT evidence. |
| 1:40–2:05 | Separate correction/withdrawal or HOLD take | Show current relevance assessment or explicit cancellation and no stale answer. Ordinary speech must preserve research while stopping audio; distinguish this from HOLD. |
| 2:05–2:30 | Source/evidence, transcript, generated and sent audio | “The record separates the question, retrieved evidence, generated answer and audio actually sent.” Show the recorded request/completion times; do not call them individual webpage fetch timestamps. |
| 2:30–2:50 | Engineering and provenance | “The new Meta pipeline builds on our existing React and LiveKit studio. We validate evidence, limit calls and discard stale results. OpenAI provides speech synthesis.” |
| 2:50–3:00 | Honest status and access links | “A conversational co-host with a producer's research instinct. Built to help the discussion, not take it over.” |

## Required validation gates before owner rehearsal

- Real search/retrieval integrated into the Meta decision path; no silent fallback LLM.
- Meta recognizes an explicit spoken lookup request from context. Owner-enabled research mode controls permission; arbitrary transcript instructions cannot change security, recording or permissions.
- Brief factual answer grounded in retrieved evidence, URL/title and request/completion timestamps visible and saved, with no fake citation.
- Ordinary human speech preserves pending research but blocks/interrupts audio. Fresh Meta assessment must withhold irrelevant completed results. Explicit withdrawal, HOLD, stop and permission revocation cancel the research job. No late audio resumes.
- Bounded search calls and timeouts; failure disclosed without interrupting recording.
- Measure actual end-of-speech, ASR final, search and first audio timings. No “instant” or numeric speed claim before measurement.
- Test paraphrases, ambiguous references, unavailable sources and contradictory sources with actual providers before asking for human filming.

A deterministic page prepared in advance is a source-pack demonstration, not a live internet search. A model answer without retrieval is recall, not a checked fact. Make the UI and narration match the real implementation.

## Recording-day order

1. Run `npx tsx scripts/preflight.ts` with the local Studio running. This is a read-only check, not a provider or microphone test.
2. Confirm participant processing consent, wear headphones and connect microphones. External guests require the isolated guest page to be hosted over HTTPS and tested first; localhost links are not remote links.
3. Record ten seconds and play it back: host, guest and AI must all be audible. This is the gate for the real take, not an optional polish task.
4. Rehearse the central scene and separately test interruption/HOLD. Preserve the real wait. The latest three synthetic trials observed about 7.8–12.9 seconds from continued speech ending to receiver audio; no instant-answer claim.
5. Record the English three-minute take. The built-in capture stops at 180 seconds; switch to Judge view after capture starts. Return to Studio controls to save the local WebM.
6. Inspect the actual exported file for duration, all audio channels, readable sources and absence of credentials/invite links. Human acceptance and media permission are not established by the automated checks.
