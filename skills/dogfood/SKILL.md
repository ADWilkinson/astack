---
name: dogfood
description: "Walk real product journeys, fix authorized problems and replay through the outcome. Use for end-to-end QA, signed-in mobile checks, pre-launch testing and repeated trials of AI features. Review-only requests produce findings."
---

# Dogfood

Tests check what the author thought of. Dogfooding finds what a user hits. The output is fixed journeys, not a list of complaints.

`<skill-dir>` below means this skill's own folder. Run its scripts from the project root so output lands in the project, not in the installed skill.

## 0. Pick the mode

- **Diff-aware** (default on a branch): start from what the branch changed (`git diff origin/main...HEAD --stat`), map each change to the screens and journeys it touches, and test those first.
- **Full**: the product's core journeys end to end, for pre-launch or "QA the app".
- **Regression**: re-run journeys that broke before, from the findings of a previous run.

## 1. Pick journeys that matter

Two to five, each written as a user with a goal and an observable end:

> New seller, signed in, no listings → publishes first listing → sees it on the public page with the right price.

Include at least one recovery path (bad input, expired session, failed payment) and the mobile version of the main journey. Start from a stated state: which account, what data, which environment and revision.

Use the browser session and account the user selected; never sign in as someone else or create accounts to reach a state unless that is the task. Note side effects before acting (emails sent, money moved, records created) and use test modes or test data for them.

## 2. Walk the journey for real

- Real clicks and typing in a real browser, at real speed. No mocked responses, no seeding past the hard part.
- Follow through to the outcome: the record exists, the email arrived, the export opens and contains the right rows, the public page shows the change.
- Look at each screen. Capture the important ones at phone and desktop width with [`scripts/shoot.mjs`](scripts/shoot.mjs) when the URL is reachable without your session; use the browser tool's screenshots for signed-in states.
- When the journey waits on data, capture the waiting page and the settled page and compare them: `node <skill-dir>/scripts/shoot.mjs <waiting> --shift <settled> --widths 390 --themes light`. Exit 1 is a finding (a marked region or the document moved). Exit 2 means the regions were not marked, so the jump was not measured. Read the phone lines on that capture too: input size, zoom lock, ungated hover, selectable controls, tap highlight. A 390px picture can look aligned and still jump, zoom and stick. The lines that need a physical phone (a hover that stays after a tap, the notch, the keyboard) stay named as unverified.
- Keep the console and network panel open. A 500 behind a friendly toast is a finding.
- Note friction as well as failure: a step that needs thinking, a label that misleads, a wait with no feedback.

## 3. Keep a frontier

Track it in a short file or in the reply, using [the journey loop](references/journey-loop.md) format:

```
[ ] J1 first listing, mobile          — found F2, F3
[x] J2 first listing, desktop         — passes after F1
[ ] F2 price field accepts "1,000" as 1  (repro: …)   cause: parseFloat   status: fixed, needs replay
```

New findings join the frontier only if they affect these journeys or the fix's blast radius. Everything else gets one line at the end.

## 4. Fix, replay, widen

For each finding: reproduce it, find the cause in code, and where the repo has a test setup, write a test that fails on the current code first. Then make the smallest coherent fix, watch the test pass, and commit that fix on its own (one finding, one commit) so it can be reviewed and reverted alone. Replay the original journey and its neighbours. A fix that changes shared code re-opens every journey that uses it.

Review-only request? Stop at reproducible findings with causes and suggested fixes; do not edit.

## 5. Verify where users are

If the task includes release, ship it and replay the decisive journey on the deployed target. Local passing is not production passing.

## AI features

Model-backed features need repeated, fresh-conversation trials and checks at each layer (stream, tool call, answer, what renders). See [AI journeys](references/ai-journeys.md).

## Finish

Lead with one line: **found N, fixed M, still open K.** Then the journeys run (account type, environment, revision, widths), what was fixed with commit links, what still fails with repro steps, and what you could not reach. "No issues found" is a valid result when the journeys genuinely pass; say what you tried.
