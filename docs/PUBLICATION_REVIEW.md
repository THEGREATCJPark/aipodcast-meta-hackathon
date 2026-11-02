# Publication preparation review — 2026-11-02

Target: THEGREATCJPark/aipodcast-meta-hackathon, branch hackathon/meta-2026. Audited committed checkpoint `813a02715029595e46063241e436e643aa052503`. Publication is NOT approved or performed. This scoped preparation check is not complete security or legal clearance. Run the packaging check again after the final reviewed commit; ongoing uncommitted work is not covered by this checkpoint.

## Source and private material

- Independent snapshot provenance retained; original checkout unchanged.
- Current snapshot contains 109 tracked files; a real `git archive` ZIP was inspected and contained 109 files with no forbidden private/generated paths. No .env, data/, output/, node_modules/, dist/, WAV, MP3, MP4, WebM or PEM files were included. The committed .env.example has empty configuration values.
- All 248 blobs reachable from local refs were scanned for high-confidence private-key, OpenAI-style key, GitHub token, Google key and JWT patterns: zero matches. Historical filename inspection also found no forbidden private/generated paths. This check did not read local .env values and cannot detect every credential, personal detail or un-fetched remote ref.
- Prior targeted check scanned 155 historical blobs for configured secret values with zero matches; that historical check had a different scope. Recheck final publication history before approval.
- Exclude ignored logs, recordings, personal transcripts, invite tokens and local settings. Review tracked documentation and old commits too.
- No project-wide license granted. Owner must confirm inherited-code rights and decide the source license before an open-source release; public visibility alone is not a license.

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

## Assets and claims

No SPNS branding, presenter voice imitation or copied signature dialogue is claimed. General pacing informs an independent character. No generated visual asset is claimed. Meta, OpenAI TTS and LiveKit roles are disclosed. Human success and completed filming are not asserted; synthetic evidence and failures remain in EVALUATION.md.

## Approval packet

Review HACKATHON.md, PROVENANCE.md, SUBMISSION.md, EVALUATION.md and docs/hackathon/APPROVALS.md before publication. Source visibility, an open-source license, public media and final submission are separate decisions. Organizer usage rights in the waiver go beyond linking a repository.

## Reproducible private package

After committing reviewed work on `hackathon/meta-2026`, run `npx tsx scripts/prepare-submission.ts`. The script refuses an unclean working tree, unexpected branch, nonempty committed environment template, forbidden paths or detected credential patterns. It archives committed source with `git archive`, excluding .git history and ignored local material by construction. Output is `output/submission/<full-commit>/ai-mc-studio-source.zip` plus `manifest.json`, with the full SHA, branch, file inventory, audit scope and archive SHA-256. Nothing uploads. This private ZIP does not replace the required public repository or video.

`npx tsx scripts/prepare-submission.ts --audit-only` checks the committed snapshot/history while work continues, without packaging. `--self-test` checks path rejection and credential-pattern fixtures. Both the fixture check and standalone TypeScript compilation passed on November 2; the dirty-tree package refusal was exercised. The full final-commit packaging run must follow the final commit and is not implied by the baseline archive check.
