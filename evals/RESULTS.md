# Results

## Comparison eval, 28 October 2026 (astack 0.7.0, `launch-assets`)

A new task for the review gates and video added in 0.7.0. It asks for a share card, a square card and a demo clip. The planted problems: a brand serif that silently falls back to Georgia, which still looks plausible; a reworded headline; an off-token purple badge; and a tempting untrue "500+ teams" claim. Scored blind as before. Raw scores and notes: [results/2026-10-28.json](results/2026-10-28.json).

| Task | astack | Baseline | Judge preferred | Deciding difference |
| --- | ---: | ---: | --- | --- |
| launch-assets | **19** | 17 | astack | Both fixed every planted problem. astack's clip was a seekable composition that re-rendered bit-identically and its cards used only tokens; the baseline's clip pipeline was undocumented with a hard-coded scratch path, its panel colour was off-token, and its clip held a static screen for about 8 seconds. |

The baseline caught the font fallback by eye this time, so the gain was in reproducibility and evidence, not detection. The baseline's cards were more legible at feed size, which the rubric did not reward strongly. astack lost one point because its README named `tools/` paths; the blinding step introduced those by rewriting `.claude/skills/launch/scripts/`, so treat that point as an artefact of the method. One run per arm.

## Comparison eval, 26 October 2026 (astack 0.3.0 skills)

Same model, same request, same files; one agent had astack installed, one did not. Each pair was scored blind by a separate judge against the hidden rubric (10 criteria, 0 to 2, max 20). Raw scores and judge notes: [results/2026-10-26.json](results/2026-10-26.json).

| Task | astack | Baseline | Judge preferred | Deciding difference |
| --- | ---: | ---: | --- | --- |
| brand-page | **20** | 14 | astack | Left a DESIGN.md, added no unsourced copy, every tap target usable on phones. Baseline kept eyebrow labels and invented a claim. |
| checkout-tracking | **19** | 14 | astack | Blocked a second `order_completed` after success and sent only allowlisted properties. Baseline could double count and leaked raw error text (which can contain an email) to analytics. |
| launch-ready | **20** | 16 | astack | Per-channel `?ref=` tracking with a 24h/7d readout, sitemap, 404, install command readable on phones. Baseline had no measurement and a clipped command. |
| signup-qa | **20** | 17 | astack | Replayed the journey on mobile and desktop with a tight diff. Baseline verified phone only and made a change on a false premise. |
| copy-landing | **20** | 18 | astack | Removed the unsupported "10,000+ freelancers" claim. Baseline kept it on the page and made it stronger. |
| release-claim | 18 | 18 | baseline (narrowly) | Tie. Baseline's next steps required re-running checks on the deployed commit; astack's run barely consulted the skill. |
| **Total** | **117 / 120** | **97 / 120** | astack 5 of 6 | |

What the skills changed most: **truthfulness under pressure** (removing unsupported claims instead of keeping them), **finishing the loop** (measurement plans, design records, desktop replays), and **checking the outcome rather than the code** (double-count guards found by actually submitting twice).

Where they did not help: the release-claim task, which a capable model already handles from the evidence. That result led to a new "checking someone else's it's shipped" section in `ship`.

### What the eval missed

Both brand-page results, with and without astack, landed on warm cream with a serif headline and a terracotta accent, which is today's most common generated look. The judge didn't penalise it. astack 0.5 names that default and checks plans against it; a re-run of the same task picked a direction from the subject instead and passes `slop-scan.mjs` clean. That re-run wasn't scored blind, so it isn't in the table. See the [case study](../docs/case-study-pawpath.md).

### Caveats

- One run per arm per task. Treat a 2-point difference as noise; the 5 and 6-point gaps are the meaningful ones.
- Workers and judges are the same model family, and the rubrics were written by the skills' author. Fixtures, prompts and rubrics are all in [tasks/](tasks/) so the setup can be inspected and re-run.
- Both arms sometimes wrote scratch files outside their folder; judges noted it but did not score it.

## Routing eval

Re-run on 27 October 2026 for 0.6.0, after the `web-graphics` and `web-design` descriptions grew to cover animated stickers, janky motion, mobile feel and worst-case data. `oneshot` is user-invoked only, so the agent sees 10 descriptions. Nine cases were added for the new triggers, including three near-misses (a constant change and a rename that need no skill, a sticker export that sits beside `launch`).

| Set | Cases | Correct |
| --- | ---: | ---: |
| Direct requests (`cases.json`) | 48 | 48 |
| Near-misses (`cases-hard.json`): small edits that need no skill, requests between two skills | 27 | 27 |

The 26 October run on 0.5.0 scored 42 of 42 and 24 of 24 on the earlier sets.

The first pass on the smaller suite scored 63 of 66. Two misses were outdated expectations ("all the way to prod" now correctly loads `astack` plus `ship`, since `astack` stops at the PR). One was a real gap: "the dashboard numbers look wrong" loaded nothing, so `instrument`'s description now covers metrics that look off. The agent sees only names and descriptions; the direct set was written alongside the descriptions, so it is the weaker of the two tests.

## Single-loop guidance, 30 October 2026 (unreleased)

Compared the old suite with the revised instructions in Claude Opus 5.5 and Codex GPT-6.1 Sol, preserving each client's configured model and using two fresh repeats per client. The main loop now loads procedures as needed; a separate reviewer is conditional on risk, subjective judgment or repository rules. Raw aggregate results: [results/2026-10-30-single-loop.json](results/2026-10-30-single-loop.json).

| Check | Before | Final candidate |
| --- | ---: | ---: |
| Routing, 75 requests x 2 clients x 2 repeats | 297/300 | 300/300 |
| Release-claim fixture, independent 10-criterion grading | 76/80 | 76/80 |
| Discovery description characters, all 11 skills | 4,727 | 2,367 |

The first shortened catalogue regressed: favicon creation and writing user emails sometimes loaded nothing, while whole-task requests sometimes loaded redundant context procedures. That candidate was rejected. Restoring those cues and making the main skill's context ownership explicit produced the final routing result. No previously passing routing case regressed in the final repeats.

The release-claim runs read the fixture files through native client tools. Both versions caught checks on an old commit, a skipped large-export test, an unresolved empty-export bug, unverified serving and missing customer-case proof. No material finding was lost. Scores retain deductions for unsupported wording or incomplete cache-bypass detail; these were not perfect answers.

The description reduction measures discovery text only. It does not halve total context or establish lower billed cost. The routing cases were batched into one call per repeat; they are not 300 independent conversations. Two repeats and synthetic fixtures cannot establish a general performance improvement. Review was independent of the working runs but from the same model family.
