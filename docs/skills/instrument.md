# instrument

## What it does

Adds analytics that answer a stated question: events on confirmed success, deduplicated, without personal data, seen arriving, and read by a saved query.

## When to reach for it

"Can we measure this?", new features whose impact matters, funnels, PostHog/Amplitude/Mixpanel/GA setup.

## It's working if

You can name the question, the events and where each fires, you saw them arrive (or the local equivalent), and there is a query with its first valid read date.

## Common questions

**Does it prove the feature worked?** No. It proves the measurement works. Causation needs a comparison window and accounting for other changes.

[Skill source](../../skills/instrument/SKILL.md)
