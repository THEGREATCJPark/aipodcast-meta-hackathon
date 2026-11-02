# Submission readiness — 2026-11-02 KST

**Engineering and English submission copy are prepared. Public release, video listening acceptance and submission are not complete.** No new feature, human conversation trial or reshoot is a prerequisite in the owner-approved synthetic-demo scope.

| Deliverable | Current evidence | Remaining action |
|---|---|---|
| Independent source | Branch hackathon/meta-2026; baseline and new contributions disclosed | Use final private package manifest for source SHA |
| Implementation | 115 tests, typecheck, main/guest builds passed; 4096-token review budget fixes observed completion exhaustion | No broad reliability or human-acceptance claim |
| Actual Meta demonstration | Two post-fix complete synthetic runs at 564027c, including actual WAIT, DELIVER and post-answer discussion | Preserve failed runs and limitations |
| English submission fields | SUBMISSION.md maps to the observed form; model/TTS/reuse disclosure included | Owner's personal opinions, contributor/track/rights confirmation |
| Source review/package | Run prepare-submission.ts against the final clean commit; exact audit and ZIP hash in manifest.json | Public release approval; no implied open-source license grant |
| Video | Local v3, 155.300s, 1080p30; correct source session and same-session audio | Full watch/listen, approve host/publication, obtain video URL |
| Judge access | JUDGE_GUIDE.md provides credential-free checks and local provider setup | Verify approved public source/video links logged out; hosting only if actually required |
| Actual submission | No form transmitted, no permissions accepted | Review final form for changed instructions, approve terms and submit; retain receipt |

## Owner review, once the package and video are reviewed

- Confirm team name Conversation Co-host, Park ChanJun and any additional human contributors, single entry, proposed Indie track and Build for Your World theme.
- Answer the form's required personal opinion questions. Optional surveys remain blank unless supplied or required by actual server validation. Do not invent endorsements or Muse Code use.
- Confirm rights to reused source and synthetic media; authorize public repository and video separately. Public visibility does not require us to invent or grant an MIT license.
- Review waiver/promotional permission and authorize final transmission. Existing private-baseline eligibility interpretation remains disclosed, not guaranteed.

## Video duration and human review

The observed field is labelled 3-Minute Demo Video. No separately documented exact/minimum duration was established. The 155.3-second candidate is under three minutes; check the actual final form instructions before submission rather than padding the film. Automated audio checks are not a human listening pass. Human conversation/guest usability remain unverified and deferred.

## Package identity

After committing the reviewed documents, `npx tsx scripts/prepare-submission.ts` produces `output/submission/<full-SHA>/ai-mc-studio-source.zip` and `manifest.json`. This clean-commit archive contains source/docs, not .git, credentials, local data or media. A separate ignored release packet records final file hashes and pending owner approvals. Neither artifact publishes anything.
