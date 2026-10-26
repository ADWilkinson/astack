# astack

## What it does

Runs a product task up to a pull request you'd be happy to merge: context, plan, build, use it like a customer, measure, deslop, an independent check by a second agent, and a green PR with no open threads. It writes the stages into its todo list and closes each one with proof or a written reason for skipping.

## When to reach for it

You have a feature, fix, page or experiment and want it finished, not planned. "astack this: add annual pricing and ship it to staging."

## It's working if

You didn't have to ask about mobile, tracking or CI. The final message links the PR, the checks, the independent verdict and the screenshots, lists the decisions it made for you, and says plainly what it didn't verify.

## Common questions

**Does it always run every stage?** No. Small tasks compress the loop; a stage is skipped with a one-clause reason, never silently.

**Will it merge or deploy?** No. It stops at a review-ready PR. Say `oneshot` when you want it taken all the way.

[Skill source](../../skills/astack/SKILL.md)
