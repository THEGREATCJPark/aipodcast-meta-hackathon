# Submission readiness audit — 2026-11-02

Verdict: NOT submission-ready even when human speech trials and final video are excluded. The English manual-handoff co-host is an implemented and tested foundation. The owner's newly clarified research-PD interaction is a missing core capability, not an already delivered feature.

| Area | Evidence / state | Remaining action |
|---|---|---|
| Existing English co-host | 49 offline tests, typecheck, web/guest builds and CI success at 1999c92; real synthetic-English Studio run demonstrated WAIT, handoff ASK, audio receipt, HOLD and export | Preserve these controls while adding research |
| Runtime information lookup | Missing in server/meta/director.ts; Chat Completions request has no search tool, retrieval client or web citations | Implement and test grounded research path |
| Natural spoken PD request | Missing; speech release currently requires manual Handoff | Add explicit opt-in voice lookup routing without unrestricted autonomous interruption |
| Search evidence and timing | Missing; existing sourceUtteranceIds refer to conversation, not web pages | Record actual retrieved source URL/title/time, request stages and cancellation |
| English human scenario | Prepared in DEMO_SCRIPT.md; future runtime target only | Owner trials after implementation, then capture actual outputs |
| Public source | PRIVATE verified by GitHub | Review complete publication surface and obtain owner publication approval |
| Rules exceptions | Indie reuse, JazzLink idea switch and external TTS unresolved | Confirm applicable final rules/organizer interpretation |
| Judge access | Local studio only; guest-only dist/guest build available but not deployed | Establish required access path; verify whether public runnable URL mandatory |
| Submission form | Exact authenticated fields/limits not retrieved | Map draft to actual form, confirm contributor credits and single entry |
| Capture/export | Browser WebM capture implemented, actual audio capture unverified | Ten-second channel check, actual video export review; no completed video claimed |
| Final source freeze and receipt | Not done | Freeze after validation; owner approves terms and submission; retain receipt |

Do not treat all remaining work as filming. Prior “MVP prepared for human acceptance” described the narrower manual-handoff version, not the newly requested research co-host. Public source, access, eligibility and form work remain even after a successful video.
