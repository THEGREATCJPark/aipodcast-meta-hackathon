# Three-minute English demo — production script

The three-minute requirement is from owner-supplied participant instructions (see RULES.md). No completed recording is claimed. Capture real human trials using HUMAN_ACCEPTANCE.md first. The narration below deliberately distinguishes verified provider probes from pending human acceptance; update a claim only after recording its evidence.

| Time | Shot / action | English narration |
|---|---|---|
| 0:00–0:20 | Title, two people, operator interface | “A good co-host knows when to speak—and when to leave the conversation alone. AI Conversation Director helps small creator teams explore a topic without turning every human sentence into a chatbot prompt.” |
| 0:20–0:45 | Actual conversation; show participant identities and transcript | “Meta transcribes each participant's audio. Muse Spark considers the recent conversation and chooses WAIT, ASK, CLARIFY, or SUMMARIZE. The people stay in control.” |
| 0:45–1:15 | Actual handoff and actual question; show its source utterance IDs | “Here, the host hands over the floor. Meta proposes the next question using these utterances as evidence. OpenAI TTS voices Meta's text. It does not decide what to ask.” Leave room for the actual response to be heard. |
| 1:15–1:40 | Separate automatic interruption take, with listener audio | “Now we test interruption by speaking while the co-host is talking.” Show the actual result. Add “Playback stopped” only if the listener recording proves it; otherwise say “This trial exposed an interruption failure we still need to resolve.” |
| 1:40–2:00 | Manual HOLD; changed topic and resume | “This is a different test: the operator presses HOLD. Cancellation invalidates pending work, so an old question must not return after the topic changes.” Show actual result, not an animation. |
| 2:00–2:20 | Actual WAIT action and evidence panel | “Waiting is an explicit decision. In this first version, speech requires a host handoff. A recommendation alone cannot take the floor.” |
| 2:20–2:40 | Separated artifacts and provider labels; redact private content | “We keep participant audio, generated speech and server-sent audio separate. Our real-provider synthetic-audio probe reached a separate LiveKit receiver. Human-session tests are reported separately.” |
| 2:40–3:00 | Provenance, verified results and honest remaining limits | “We reused our existing React and LiveKit studio and recorder. The new contribution is the Meta co-host pipeline, evidence validation and turn controls. The repository documents what passed, what remains unverified, and exactly which code was reused.” |

If real human clips are not available, make the corresponding segment an explicitly labeled test plan or synthetic-provider demonstration and state that human acceptance is pending. Do not present planned behavior as a filmed success. Trim narration to preserve actual dialogue and keep the complete export to three minutes.

Presentation tone: relaxed, candid and concise, with short witty questions where appropriate. The original project's SPNS TV reference was checked read-only; borrow only these general conversational traits. Use an independent robot co-host identity, no show logos, no presenter voice cloning, no endorsement claims and no copied signature dialogue.

Before export, follow the filming checklist in HUMAN_ACCEPTANCE.md. Save original takes privately, annotate each final clip's source, and obtain publication approval for voices/faces and repository visibility.
