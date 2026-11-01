# astack

## What it does

Runs a product task up to a pull request you'd be happy to merge: context, plan, build, use it like a customer, measure, clean the diff, and verify the affected behavior with a green PR. The main agent keeps the context and loads supporting procedures when needed. Independent review is for risk or judgment that checks cannot settle.

Before building a substantial plan, a fresh reader checks comprehension and implementation readiness against the repository and live evidence. The author resolves blockers and major gaps in the existing contract. Small copy and mechanical fixes keep the shorter loop; [spec readiness](../../skills/astack/references/spec-readiness.md) states the threshold.

## When to reach for it

You have a feature, fix, page or experiment and want it finished, not planned. "astack this: add annual pricing and ship it to staging."

## It's working if

You didn't have to ask about mobile, tracking or CI. The final message links the PR, the checks, the verification evidence and relevant screenshots, lists the decisions it made for you, and says plainly what it didn't verify.

## Common questions

**Does it always run every stage?** No. Small tasks compress the loop; only relevant procedures are loaded; remaining verification gaps are stated.

**Will it merge or deploy?** The default is a review-ready PR. An explicit delivery target and existing authority govern any further work.

[Skill source](../../skills/astack/SKILL.md)
