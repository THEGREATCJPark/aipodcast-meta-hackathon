# Keep Talking — final hackathon submission copy

**Selected film:** [Keep Talking v11, 89.2 seconds](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v11/keep-talking-v11-antigravity-review.mp4) · [Full-quality release and captions](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v11)

This is the participant's builder-tone copy for the submission form. It is prepared but **not a record of a completed form submission**. Do not replace answers to subjective questions with inferred ratings.

## Team Name

Keep Talking

## Which track are you submitting to?

Indie

## Which problem statement did you build towards?

Build for Your World

## Public GitHub Repository

https://github.com/THEGREATCJPark/aipodcast-meta-hackathon

## 3-Minute Demo Video

https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/download/keep-talking-v11/keep-talking-v11-antigravity-review.mp4

## Project Description

Keep Talking is an AI research co-host built for small podcast teams that don't have a dedicated producer in the room.

Good conversations lose momentum when hosts have to pause and Google something mid-recording. With Keep Talking, a host can toss out a quick fact-check question, keep the discussion moving, and get a concise, sourced answer only when there is a natural pause in the conversation.

In the demo, one host asks which Muse Spark model can be self-hosted. While Keep Talking looks into it in the background, the hosts keep talking about privacy, hardware specs, and local deployment. Once the lookup finishes, the AI checks where the conversation has moved before chiming in, delivers the answer, and hands the floor right back.

The core technical focus here is decoupling when a lookup finishes from when the AI speaks. A basic voice assistant may treat a question as a prompt to talk immediately. Keep Talking tells the difference between casual banter among hosts and an actual request for information—and checks whether an answer is still relevant by the time it gets a chance to speak.

The prototype runs on React, Node.js, and LiveKit, handling per-speaker transcription, background web lookups, source tracking, turn-taking logic, and manual interruption controls.

For this hackathon, I built the Meta-powered research and turn-taking pipeline on top of an existing recording studio codebase. The demo uses scripted synthetic host audio running against live Meta API calls, edited down for time.

Keep the conversation going. Let the AI handle the lookup.

## Describe your use of Meta products to build the submitted project

The Meta Model API drives the research and decision loop in Keep Talking:

- **Muse Voice Transcribe** turns incoming participant audio into speaker-labeled transcripts in real time.
- **Muse Spark 1.3** monitors the transcript stream to separate normal host-to-host chatter from actual lookup requests.
- **Meta web_search** pulls information and source links once a lookup is triggered.
- **Muse Spark 1.3 (Context Review)** compares the finished research against the most recent lines of dialogue and returns a state decision: WAIT, DELIVER, DISCARD, or CANCEL.

Around the models, the application layer manages floor control, manual HOLD toggles, barge-in cancellation, and stale-answer prevention. A separate TTS engine renders the final response, which is played into the room over LiveKit. Transcripts, sources, state decisions, and separate audio tracks are saved per session so hosts can review them after recording.

## Why are Meta's models important to your solution?

In a multi-person podcast, getting the right answer is only half the problem. The harder part is knowing when a question is actually meant for the AI, and figuring out if the answer still fits a conversation that kept moving forward while the search was running.

Muse Voice Transcribe and Muse Spark handle those decisions. Instead of just generating text responses, Meta's models act as the control plane—following the room, running web lookups in the background, and evaluating conversational timing before anyone hears a word.

## Provide feedback from your experience using partner technologies

I didn't use Fireworks, Modal, or Baseten for this build, so I don't have direct feedback on those platforms.

## What was the biggest obstacle your team hit while building this project?

Decoupling background research from voice turn-taking.

In my early builds, continued speech from the hosts could cancel not just the AI's audio playback, but the in-flight research job too. That completely broke the core premise of the app, since hosts are supposed to keep talking while the AI looks things up.

I had to split those lifecycles apart so ongoing dialogue wouldn't wipe out a pending lookup. Now, background research stays active while a separate turn manager handles speaker activity and speech permission; Meta reviews whether the result still fits the latest dialogue. I tested this with multi-speaker synthetic sessions hitting live Meta APIs to make sure the co-host could finish a search while hosts kept talking, check the updated context, and speak afterward.

## Compared with other AI models your team has used for the same kind of work, how did Meta's models perform on this project?

Muse Spark handled intent detection, web-grounded lookups, and delivery state decisions in successful end-to-end runs. It was particularly good at ignoring ordinary questions between hosts while catching explicit requests for facts in targeted tests.

The main hurdles were keeping structured JSON decisions consistent as the conversation window shifted, and managing total round-trip latency across the voice pipeline.

I haven't run side-by-side benchmarks against other frontier models on this exact pipeline, so I don't have hard comparative numbers. The other AI tools in this project supported TTS voice rendering and demo assets rather than replacing Meta's research reasoning.

## When your team chooses an AI model or coding tool, what matters most?

Predictable latency, reliable structured outputs, and how gracefully the system handles interruptions.

In a live audio room, a good answer that arrives three seconds too late—or talks over a host—can ruin the take. I care most about schema adherence for state routing, accurate source grounding, and clean cancellation hooks. For small creator tools, predictable API costs and straightforward integration also matter a lot.

## What makes it hardest for your team to switch to a different AI model or coding tool?

Re-tuning the conversational timing and state logic across the whole pipeline.

Swapping out a model isn't just changing an API endpoint. Different models have different latency profiles, formatting quirks, and thresholds for when they decide to WAIT versus DELIVER. If I switched models, I would have to re-run the multi-speaker edge-case tests to make sure the AI doesn't start interrupting hosts or dropping valid lookups.

## If your team took this project to production, what would most likely stop you from using Meta's models?

Tail latency and decision consistency during messy, real-world recordings.

The prototype works in structured synthetic sessions, but real podcasts involve crosstalk, half-finished sentences, and hour-long context windows. Before going to production, I'd need to profile each step—transcription, search, context review, and TTS—under heavy crosstalk to see where the bottlenecks are. As long as latency stays manageable and state outputs stay predictable over longer sessions, Meta's stack fits the product well.

## Entrant-only selections

- **Team Members:** Confirm the actual human entrants shown in the live form.
- **Most Viral Track X link:** Leave blank unless participating and a real post URL exists.
- **How likely are you to build with Meta Model API?** Choose the entrant's actual opinion from the live form.
- **Overall opinion of Meta Model API:** Choose the entrant's actual opinion.
- **Recommend Meta Model API:** Provide a genuine 0–5 rating.
- **Recommend Muse Code:** Not used. Choose N/A or leave blank if the form permits; do not invent use.
- **Permission to use, publish, share and promote submitted materials:** Review and decide in the actual form.

[Submission checklist](SUBMISSION_READINESS.md) · [v11 video provenance](VIDEO_V11.md) · [Event contribution boundary](../HACKATHON.md)
