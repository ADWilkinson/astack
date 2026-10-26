# oneshot

## What it does

Everything `astack` does, then merges, deploys, proves production is serving the change, exercises it there and tells the team. It waits on CI, reviews and the deploy in the background instead of stopping halfway.

## When to reach for it

You're handing work over and walking away. "oneshot this: add annual pricing and get it live." It only runs when you say `oneshot` (or "full send"); the agent never picks it on its own, because it merges and deploys.

## It's working if

The final message has a merged PR, the deployed commit found at the live URL, the changed behaviour exercised there, an independent PASS on the merged head, and a link to the team update. Anything it couldn't verify is listed plainly.

## Common questions

**What won't it do even then?** Delete data, spend money, change secrets or permissions, or touch other repos. Those still need you.

**What if it gets stuck?** It asks through your client's question tool. If nobody answers, it leaves the PR open and unmerged and leads its final message with the question.

[Skill source](../../skills/oneshot/SKILL.md)
