# dogfood

## What it does

Walks real user journeys to the real outcome, keeps a findings frontier, fixes what breaks and replays until the journeys pass. Each fix gets a test of the kind that catches the class of bug: the journey end to end, a property test for a rule that must always hold, or a differential run for a rewrite.

## When to reach for it

"Test it like a customer", pre-launch QA, after a big change, AI features that need repeated trials.

## It's working if

Each journey ends at a checked outcome (the record, the email, the page), each finding has a repro, cause, fix and replay, and anything unreachable is named. A wait on data was compared with `shoot.mjs --shift`, and the phone lines were read.

Screenshot reviews also report unnamed controls from Chrome’s accessibility tree. An icon can look right on a phone while its button has no name for someone using a screen reader.

## Common questions

**Will it sign in as someone else?** No. It uses the account and session you selected.

[Skill source](../../skills/dogfood/SKILL.md)
