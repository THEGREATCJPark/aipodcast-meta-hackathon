# Live desk UI refresh — 2026-11-03

Reference: https://benji.org/stageshow. Applied restraint, visual hierarchy,
intentional framing and event-driven state; no source assets or faux interactions copied.
This is the actual React application, not an animated replacement for execution evidence.

## Changes
- Conversation/research view is the default; `?view=studio` opens production tools.
- Quiet off-white workspace, ink/green accent, fewer badges and no decorative gradients.
- Provider configuration and recording consent remain accessible in the setup disclosure.
- Speaker timestamps, stronger answer hierarchy and a labelled source list.
- Settings, invitation creation, capture and full logs remain in Settings & tools.
- HOLD/Handoff remain reachable in a sticky bottom control bar.
- Styling is scoped to `.studio`; guest styling and audio/backend logic are unchanged.
- No dependencies, fabricated sources, automatic animations, or provider calls added.

## Verification
- npm test: 115 passed, 0 failed.
- npm run typecheck, npm run build:web, npm run build:guest: passed.
- Existing Vite bundle-size advisory remains.
- Real browser at 1440×900 and 390×844: idle view, consent enabling Start,
  settings/return navigation, no horizontal overflow.
- Separate browser context with API/WebSocket fixtures: WAIT, proposed answer,
  source link and failed-recording-retained state rendered; mobile overflow absent.
  These are synthetic UI checks, not new Meta/audio acceptance evidence.
- Visually inspected idle desktop/mobile and populated desktop captures.
  Local screenshots: output/ui-populated-desktop.png and output/ui-populated-mobile.png.

## Submission impact
Existing submission-v3.mp4 and its actual run evidence are preserved. It shows the
previous UI. The d53be90 release packet remains a versioned pre-refresh snapshot;
use the current branch/source if submitting this new UI. Do not claim the old video
records the refreshed UI. No public release or submission was performed.
