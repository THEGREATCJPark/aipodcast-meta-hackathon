# Podcast-focused final edit — 2026-11-02

Product: **Conversation Co-host**, built with Meta Model API. Independent hackathon prototype, not an official Meta product.

The product engine is frozen. Only representative display names and the standalone synthetic demonstration fixture changed. Claude owns the editorial composition and final MP4; original v2 remains the fallback. No publication or submission is authorized by this document.

## Scenario

Two prewritten synthetic participants discuss the early singularity essay, request its author, continue discussing research feedback loops and experimental constraints, and return to that discussion after a sourced Meta answer. Both later lines are synthesized in advance and sent only after receiver-observed AI audio ends and a sourced DELIVER is observed. They are not dynamically generated reactions, spontaneous people or a usability trial. The reference acknowledgement does not repeat or endorse a particular author/year; the following discussion concerns ideas versus empirical validation.

Input sequence and exact sender times are recorded in evidence.json. The fixture waits for research-request before continuation; this is controlled scheduling, not an organic conversation. There is no injected AI answer, editorial filler during silence, speedup or engine fallback. Ordinary speech still goes through actual Meta ASR.

## Edit boundaries

Use a single same-session audio/video core from the request through post-answer discussion. Broadcasting-style speaker cards are editorial visualization, not an app feature. Keep real waiting and response timing. Cut setup before the core and cleanup HOLD afterward if desired; log these cuts. Any older HOLD is a separate run triggered by a test script, not acoustic interruption. Never imply listener-perceived zero-latency cancellation.

New capture is 1600x900 browser-native video only. Use the same session mix.wav, label it as app-recorded audio, and verify synchronization using recorded screen transitions and events. Navigation timestamps are approximate start anchors, not per-frame presentation timestamps. Do not assert sub-100ms alignment without actually measuring it.

Previous source-to-export correlation validated waveform preservation, not dialogue audibility. Final full-length watch/listen is a separate acceptance item. No fixed LUFS target or cosmetic rebuild is required.

## Bounded execution

At most two new full attempts. Preserve failures. If no complete sourced answer plus post-answer discussion is obtained, stop the revision and retain v2; no invented follow-up or third run to chase a success.

## Actual outcome



1. 2026-11-02_1835_meta_1781, code 7c3ed789c0a107a58146b09c63201c7c200fd427, clean tree at start. Actual search and two WAIT reviews; later review rejected with invalid_response / invalid_type at root. No received AI voice; no post-answer lines sent.
2. 2026-11-02_1837_meta_12dc, same code HEAD, dirty tree consisting of in-progress packaging/docs work (not engine changes). Actual search and WAIT; final review likewise rejected. No received AI voice; no post-answer lines sent.

The failure resembles the earlier v2 failed take; the root cause remains unconfirmed. Do not say a temporary provider outage or a fixed bug was established. All participant recordings were preserved; absence of mc.wav is expected because no AI audio was sent. These two selected runs are not a statistical reliability estimate.

## Capture and sound

Both actual browser videos are 1600x900, 25fps, video-only native Playwright captures. matching mix.wav contains synthetic participant speech, not AI responses. Use only for failure inspection. No microphone or personal voice was used. Navigation timestamps in capture-timing.json are approximate and are NOT calibrated media start times; do not claim precise synchronization.

The prior v1 correlation checks verified waveform preservation, not dialogue audibility. For the existing v2 use its matching successful-session mix and its established EDL; full final watch/listen is still required. No listening acceptance is claimed here.

## Assets and boundaries

Each failed-take folder has screen, session mix/stems, minimal events, input transcript, evidence and hashes. Existing successful assets remain unchanged in ../claude-v2/. Prior Claude v2 remains the primary final-edit asset. Do not publish, change repository visibility, agree to final terms or submit.

112 tests, typecheck, build:web and build:guest passed in this preparation turn. Builds retain bundle-size warnings. Passing code checks do not override failed actual-provider trials.
