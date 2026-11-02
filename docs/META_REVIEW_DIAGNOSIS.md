# Meta review diagnostic recovery — 2026-11-02

The owner authorized continuing the investigation after the two bounded editorial attempts. This is a corrective diagnostic phase, not an undisclosed repetition of the previous two-attempt plan.

## Observed defect

The old review parser ignored completion finish_reason and converted absent message content to JSON null. This lost the distinction between token exhaustion, missing response text and schema failure; a truncated but parseable JSON response could even pass. Two regression tests first failed, then passed with safe envelope validation. Incomplete/truncated outputs remain silent; schema, context revision, HOLD, cancellation and source checks remain in force. No fallback LLM or automatic retry was added.

## Diagnosis limits

The earlier failed sessions retain only root invalid_type, not envelope metadata. Their exact cause cannot be retroactively proven. Seven direct replay checks against the second failed synthetic context and three against the first returned valid DELIVER (one initial call plus six repetitions for the former). Visible answer and internal reasoning share the token budget; one observed completion used 960 of the configured 1000 tokens. This is a plausible exhaustion risk, not proof that it caused the earlier failures. The 1000-token setting has not been changed on this evidence alone.

Official references inspected November 2:
- https://dev.meta.ai/docs/api-reference/chat-completions/schemas
- https://dev.meta.ai/docs/reasoning

No raw model reasoning or keys are saved. New failures carry only safe category, allowlisted finish reason, content length and numeric token counts.

## Actual-provider recovery

Instrumented full run 2026-11-02_1904_meta_81eb, evidence output/probes/conversation-1793613864090/evidence.json, completed actual search, Meta WAIT and DELIVER, TTS, 502 non-silent receiver frames and both post-answer synthetic utterances. It ran at HEAD 2fcd581 with the diagnostic patch in the working tree. This is a successful diagnostic run without screen footage, not proof of general reliability. Follow-up lines are prewritten, not spontaneous or model-generated reactions.

Fresh validation: 114 automated tests, typecheck and build:web pass. The web build retains its pre-existing bundle-size warning.

## Confirmed reproducer and targeted fix

The next instrumented full capture, 2026-11-02_1906_meta_a2a7 (output/probes/conversation-1793613995240/evidence.json), reproduced the failure with finishReason=length, contentLength=0, completionTokens=1000 and reasoningTokens=998. That establishes token exhaustion for this observed occurrence; the older failures are consistent but lacked this metadata. The earlier hypotheses above are retained as the investigation sequence.

The review request now permits 4096 total completion tokens while retaining low reasoning effort, the 15-second request timeout, 60-second job TTL, schema validation, 220-character spoken limit, revision checks and output cancellation. No automatic retries or alternate model were added. A regression reproducing the exhausted envelope first failed and then passed with the larger budget. 115 tests, typecheck and build:web passed. This raises only the possible budget, not a guaranteed per-call spend, and does not prove arbitrary-input reliability.
