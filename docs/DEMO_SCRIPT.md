# Three-minute English demo: the co-host who can check a fact

Status: production plan, NOT recorded runtime evidence. The research-PD extension is now implemented in the working branch; provider and human validation must be reported separately in EVALUATION.md. Do not film scripted AI replies as actual model outputs. Filming and human trials are deferred by the owner. Implementation, automated validation and explicitly labeled provider probes continue first.

## Editorial direction

Fixed reference: SPNS TV / Shoes Off conversational production pattern as described by the owner: people talk naturally and briefly ask a producer to find a missing fact. Our independent English AI co-host should perform that narrow research task and return the floor. No presenter impersonation, copied catchphrases, show branding or invented personal memories.

## Central scene — singularity / intelligence explosion

Human lines are rehearsal prompts. AI lines below are illustrative acceptance targets; actual model wording must be generated from real retrieval evidence, not injected or hardcoded.

Host: “Everyone talks about the singularity like it has a launch date. I'm more interested in what happens when AI starts designing better AI.”
Guest: “That intelligence-explosion idea has been around for decades. Who was the researcher behind that old ultraintelligent-machine paper? I'm blanking.”
Host: “Can you check that for us?”

Expected AI behavior: resolve the reference from conversation, retrieve a credible source, wait until humans stop speaking, answer briefly, show the source card and return the floor.
Illustrative AI response: “You mean I. J. Good? His 1965 paper describes an intelligence explosion from machines designing better machines.”

Guest: “So that's a mechanism, not a date on the calendar.”
Host: “Exactly. The interesting question is what would make that feedback loop work—or stall.”
Expected behavior: WAIT while people continue; no unsolicited lecture.

Ambiguity variation: Host says “Who first came up with the singularity?” The co-host should distinguish the broad singularity idea from the specific intelligence-explosion paper, ask what is meant or qualify its answer; it must not assert Good uniquely originated all singularity concepts.
Failure variation: if retrieval fails, say the source could not be checked; never claim to have searched or found a source based only on model memory.

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
| 0:35–1:20 | Central human scene above, actual search and reply | Preserve actual audible reply and source card. Show real elapsed lookup; label any edited wait. Do not pre-record a model answer and represent it as current inference. |
| 1:20–1:40 | Humans continue discussing feedback loops | “The answer is short. The source stays on screen. The people keep the conversation.” Show actual WAIT evidence. |
| 1:40–2:05 | New lookup cancelled by topic change or HOLD | Show real cancellation and no late answer. Distinguish human-voice interruption from a button stop. |
| 2:05–2:30 | Source/evidence, transcript, generated and sent audio | “The record separates the question, retrieved evidence, generated answer and audio actually sent.” Show the recorded request/completion times; do not call them individual webpage fetch timestamps. |
| 2:30–2:50 | Engineering and provenance | “The new Meta pipeline builds on our existing React and LiveKit studio. We validate evidence, limit calls and discard stale results. OpenAI provides speech synthesis.” |
| 2:50–3:00 | Honest status and access links | “A conversational co-host with a producer's research instinct. Built to help the discussion, not take it over.” |

## Required validation gates before owner rehearsal

- Real search/retrieval integrated into the Meta decision path; no silent fallback LLM.
- Meta recognizes an explicit spoken lookup request from context. Owner-enabled research mode controls permission; arbitrary transcript instructions cannot change security, recording or permissions.
- Brief factual answer grounded in retrieved evidence, URL/title and request/completion timestamps visible and saved, with no fake citation.
- Search cancellation on human speech, HOLD, stop and changed context; late results never play.
- Bounded search calls and timeouts; failure disclosed without interrupting recording.
- Measure actual end-of-speech, ASR final, search and first audio timings. No “instant” or numeric speed claim before measurement.
- Test paraphrases, ambiguous references, unavailable sources and contradictory sources with actual providers before asking for human filming.

A deterministic page prepared in advance is a source-pack demonstration, not a live internet search. A model answer without retrieval is recall, not a checked fact. Make the UI and narration match the real implementation.
