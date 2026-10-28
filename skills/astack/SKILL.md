---
name: astack
description: Take a product task from "here's the idea" to a pull request that is proven, green and ready for review, covering context, plan, build, real use, measurement and cleanup, without being walked through each step. Use when the user says "astack this", "take this end to end", "do this properly", or hands over a feature, fix, page or experiment and expects it finished rather than planned. Stops before merge; for all the way to production use oneshot.
---

# astack

You own the outcome up to a PR the user can review and merge with confidence. Nobody should have to come back and ask "did you check mobile", "is the event firing" or "did CI pass".

`<skill-dir>` means this skill's folder. Run its scripts from the project root.

## Start by writing the stages into your todo list

Copy these eight lines into your todo list before any task-specific items. Close each one with its proof, or leave it in the list as `skip: <one-line reason>`. A stage that silently disappears is a stage you didn't do.

1. **Context**: outcome, decisions already made, starting state, the one unknown that could change the approach. (`context`)
2. **Plan**: every requirement has a change, a proof and a target. Measurement and delivery are in it. ([planning](references/plan.md); small fixes need three lines)
3. **Build**: in the repo's conventions, slice by slice, each slice checked. (`web-design`, including its motion reference, and `web-graphics` for UI)
4. **Use it**: the real journey, in a browser or runtime, to the real outcome; fix and replay. (`dogfood`)
5. **Measure**: the success action fires once, on real success, and arrives. (`instrument`, when there is a success action)
6. **Clean**: `deslop` scan on changed copy, UI and code; every medium or high hit fixed or dismissed with a reason.
7. **Verify independently**: a fresh agent that did not write the change exercises it and returns PASS or FAIL with evidence. For visual work it also scores its own renders with `web-design`'s review rubric and gives ship, fix or rework. (`ship`; docs-only or trivial changes may skip)
8. **PR ready**: `node <skill-dir>/scripts/pr-state.mjs` reports no blockers on the current head; the PR body says what changed, how it was proven, and what was not verified. (`ship`)

For visual changes, capture 390 and 1440 in light and dark with [`scripts/shoot.mjs`](scripts/shoot.mjs) and look at the images. Use [completion checks](references/completion-checks.md) as the final gate.

## What you may do without asking

Invoking astack is the permission for everything reversible that the stages need: create a branch, run the app and dev servers, drive a browser, take screenshots, run any test method, install dev dependencies the repo already declares, push the branch, open or update the PR, reply to review threads with fixes, and re-run CI after a diagnosis.

## Ask only when

- you cannot find a way to prove a change;
- the goal is ambiguous in a way that changes the result;
- the next step is outside the grant: merging, deploying to production, deleting data, spending money, messaging people, changing anything outside the repo;
- another PR or decision makes this one obsolete.

Ask with the harness's question tool (`AskUserQuestion` in Claude Code, `request_user_input` in Codex), not in a normal message, or the thread looks finished. Put the context and your recommendation in the question. If no tool exists or nobody answers, take the safe path: leave the work on its branch or open PR, and start your final message with the question. Decide everything else yourself and list those decisions in the report.

## Do not stop early

Ending your turn while checks or reviews are pending ends the work, because nobody will prompt you again. Wait with `node <skill-dir>/scripts/pr-state.mjs --watch` (run it as a background task or under your harness's monitor), act when it exits, and watch again after every push. When an event needs no action, stay quiet; never post "still waiting".

## Finish

- **Outcome**: one sentence, at the PR-ready target.
- **Proof**: PR link, checks, the independent verdict, screenshots or queries, each with how it was observed.
- **Decisions you made** for the user.
- **Not verified**: the exact gap and next step, if any.

To take it further (merge, deploy, verify live, tell the team) the user says `oneshot`.
