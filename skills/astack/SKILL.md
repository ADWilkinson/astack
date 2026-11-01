---
name: astack
description: "Own context, planning, implementation, real use, measurement and checks through a review-ready PR. Use for \"astack this\", \"own this\" or a product task to finish end to end. Load further procedures only as needed. Honor an explicit delivery target."
---

# astack

By default, own the outcome up to a PR the user can review and merge with confidence. Honor an explicit target and existing authority. Nobody should have to come back and ask "did you check mobile", "is the event firing" or "did CI pass".

`<skill-dir>` means this skill's folder. Run its scripts from the project root.

## Own the work in one loop

Keep context, decisions and execution in the main agent. Load another skill or reference only when its procedure changes the next step; the names below are options, not a required chain. Small fixes need only the relevant checks. For sustained work, track the acceptance criteria and their evidence in the existing plan or PR.

1. **Context**: outcome, decisions already made, starting state, the one unknown that could change the approach. (`context`)
2. **Plan**: every requirement has a change, a proof and a target. Measurement and delivery are in it. ([planning](references/plan.md); small fixes need three lines)
   Before build, run [spec readiness](references/spec-readiness.md) when the plan meets its size or boundary threshold.
3. **Build**: in the repo's conventions, slice by slice, each slice checked. (`web-design`, including its motion reference, and `web-graphics` for UI)
4. **Use it**: the real journey, in a browser or runtime, to the real outcome; fix and replay. (`dogfood`)
5. **Measure**: the success action fires once, on real success, and arrives. (`instrument`, when there is a success action)
6. **Clean**: `deslop` scan on changed copy, UI and code; every medium or high hit fixed or dismissed with a reason.
7. **Verify**: run the repo's required checks and exercise the affected behavior. Use an independent reviewer when subjective quality, security, money, migrations or unresolved uncertainty warrants a separate perspective. Give it acceptance criteria and source evidence, not your conclusions. For visual work, inspect renders against the product's design and the user's references.
8. **PR ready**: `node <skill-dir>/scripts/pr-state.mjs` reports no blockers on the current head; the PR body says what changed, how it was proven, and what was not verified. (`ship`)

For visual changes, capture 390 and 1440 with [`scripts/shoot.mjs`](scripts/shoot.mjs) and inspect the images, including the themes and states the product supports. Read [completion checks](references/completion-checks.md) when reconciling a larger change before delivery.

Delegate when parallel work needs independent context, reading would crowd out the main task, or an independent verdict matters. Keep ownership separate and return evidence, limitations and affected files. A specialist name alone is no reason to start another agent.

## What you may do without asking

Within the user's authorized task and target: create a branch, run the app and dev servers, drive a browser, take screenshots, run tests, install dev dependencies the repo already declares, push the branch, open or update the PR, and re-run CI after a diagnosis. External replies still need authority for that destination. A skill describes procedure; it does not expand the user's grant.

## Ask only when

- you cannot find a way to prove a change;
- the goal is ambiguous in a way that changes the result;
- the next step is outside the existing grant, such as merging, production deployment, deleting data, spending money or messaging people;
- another PR or decision makes this one obsolete.

Reuse authority already given for the same action and target. If a material decision remains, use the client's available question mechanism and explain what it changes. Continue independent work while waiting. Without required authority, leave the result concrete and reviewable at the authorized target. Decide routine implementation details yourself.

## Do not stop early

Ending your turn while checks or reviews are pending ends the work, because nobody will prompt you again. Wait with `node <skill-dir>/scripts/pr-state.mjs --watch` (run it as a background task or under your harness's monitor), act when it exits, and watch again after every push. When an event needs no action, stay quiet; never post "still waiting".

## Finish

- **Outcome**: one sentence at the agreed target, defaulting to PR-ready.
- **Proof**: PR link, verification method and any independent verdict, screenshots or queries, each with how it was observed.
- **Decisions you made** for the user.
- **Not verified**: the exact gap and next step, if any.

Further delivery follows the user's explicit target and existing authority; `oneshot` requests the full path.
