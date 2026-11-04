# November 4 publication status

The source repository and selected [v11 film](VIDEO_V11.md) are now public. Unauthenticated HTTP GET access to the repository and review MP4 returned 200 during submission preparation. Earlier private/publication-pending statements below are historical audit checkpoints. This update does not claim a new full-history secret audit, legal clearance or form submission.

# v8 publication addendum — 2026-11-04

The selected submission film has changed from the historical v3 described below to **Keep Talking v8**: [release](https://github.com/THEGREATCJPark/aipodcast-meta-hackathon/releases/tag/keep-talking-v8) and [exact QA/hash/disclosure](VIDEO_V8.md). The 21 MB copy and 192 MB master are currently in a **private prerelease**, not publicly reachable. The source repository remains **private**. This documentation update does **not** rerun the historical local full-history secret audit, grant an open-source license, waive rights checks, publish source/media or submit the form. The new documentation-only paths do not intentionally contain keys or raw recordings; before making the entire repo public, review tracked history and full publication surface again.

The v8 film omits the older v3 manual HOLD scene, includes generated Gemini Omni editorial footage and uses one continuous Meta actual-provider session with **OpenAI app TTS**. Do not attribute the filmed co-host answer to the currently default Gemini co-host voice, which was quota blocked in the recorded complete app attempt. Human full-length listening and source/media permissions remain owner gates. For the current checklist use [SUBMISSION_READINESS](SUBMISSION_READINESS.md).

---

# Publication preparation review — 2026-11-02 KST

Target: THEGREATCJPark/aipodcast-meta-hackathon, branch hackathon/meta-2026. GitHub CLI confirmed PRIVATE during this final preparation. No visibility change, license grant, media upload, terms acceptance or submission is performed.

## Current source review

Pre-final-document snapshot 315f9a8 contained 133 tracked files and 328 historical blobs reachable from local refs. The audit found zero forbidden private/generated paths in snapshot/history, zero supported high-confidence credential patterns and no nonempty .env.example configuration. The final clean-commit packaging command reruns these checks; its manifest is authoritative for final SHA and counts. This is scoped detection, not comprehensive security or legal clearance.

The final source ZIP is created from git archive, excluding .git history and ignored material. No .env, data/, output/, recordings, node_modules or dist are included. Public GitHub visibility exposes tracked history as well, hence the separate reachable-history scan. The script does not read local .env values. Secrets/identifiers unknown to the patterns and remote refs not fetched are outside its assurance.

Independent provenance and the original baseline SHA remain in PROVENANCE.md. The original repository is unchanged by this release preparation. Public source visibility is separate from granting an open-source license; none is granted automatically. Confirm rights to the inherited source at final owner approval. Do not treat an optional MIT license as an invented submission prerequisite.

## Dependency metadata

package-lock.json contains 210 dependency entries with declared licenses, including optional platform variants rather than 210 necessarily installed packages.

| Declared license | Entries |
|---|---:|
| MIT | 170 |
| Apache-2.0 | 15 |
| MPL-2.0 | 12 |
| ISC | 6 |
| BSD-3-Clause | 4 |
| BSD-2-Clause | 1 |
| 0BSD | 1 |
| Apache-2.0 AND BSD-3-Clause | 1 |

MPL entries are lightningcss and platform variants. Metadata does not replace license texts, NOTICE requirements or distribution-specific review. Source release excludes node_modules and dist. If a browser bundle is later published, preserve applicable shipped-dependency notices and review that artifact separately. No dependency is relicensed here.

## Historical v3 media and claims (not the selected v8 film)

The current local video uses synthetic input voices, actual Meta responses, separate OpenAI app TTS and editorial narration. No personal microphone recording, presenter imitation or SPNS branding is used. The edit labels synthetic fixtures, editorial visualization, old HOLD and existing/new code. Video hash and pending listening status are in SUBMISSION.md. Media stays outside the source ZIP. The exact synthetic-demo disclosures do not establish broad factual accuracy, human usefulness or track eligibility.

## Final private output

After reviewed documentation is committed, run `npx tsx scripts/prepare-submission.ts`. It refuses an unclean tree, unexpected branch, forbidden paths, nonempty environment template or detected credential patterns. Output: `output/submission/<full-SHA>/ai-mc-studio-source.zip` and `manifest.json`. `--self-test` validates rejection fixtures. Archive inventory and hashes are independently verified in the local release packet.

The release packet additionally contains the English form copy, owner checklist, judge setup, media identity and verification logs. It does not replace the required public repository or video URL. No placeholder URL should be entered into the form. Recheck actual form instructions and logged-out link access after approvals.
