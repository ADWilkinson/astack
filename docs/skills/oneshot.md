# oneshot

## What it does

Everything `astack` does, then merges, deploys, proves production is serving the change, exercises it there and sends any authorized update. It waits on CI, reviews and the deploy in the background instead of stopping halfway.

## When to reach for it

You're handing work over and walking away. "oneshot this: add annual pricing and get it live." It only runs when you say `oneshot` (or "full send"); the agent never picks it on its own, because it merges and deploys.

## It's working if

The final message has a merged PR, the deployed commit found at the live URL, the changed behaviour exercised there, verification evidence for the current head, and a permalink when an update was authorized and sent. Anything it couldn't verify is listed plainly.

## Common questions

**What won't it do even then?** Delete data, spend money, change secrets or permissions, or touch other repos. Those still need you.

**What if it gets stuck?** It uses the client's available question mechanism for material decisions. If nobody answers, it leaves the PR open and unmerged and leads its final message with the question.

[Skill source](../../skills/oneshot/SKILL.md)
