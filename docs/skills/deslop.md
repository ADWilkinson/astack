# deslop

## What it does

Finds and fixes the tells of generated copy, UI and code with a scanner plus repair rules, and can build a voice profile from real writing.

## When to reach for it

"This sounds like AI", before publishing anything, before merging UI, or when you want writing in your own voice.

## It's working if

The scanner's medium and high hits are fixed or dismissed with reasons, every fact and disclosure survived, and the piece reads well start to finish.

## Common questions

**Is it a word ban list?** No. Hits are leads to read in context; the user's own deliberate style stays.

**Can I use it in CI?** Yes: slop-scan.mjs --fail-on high exits 2 on a high-severity hit, and errors on bad arguments so a gate cannot pass silently.

[Skill source](../../skills/deslop/SKILL.md)
