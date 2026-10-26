---
name: oneshot
description: Trigger this only when the user says "oneshot" (or "oneshot this", "full send"). The user is not watching and wants the task taken all the way, from idea to merged, deployed, verified live in production and reported to the team, with no further prompting.
disable-model-invocation: true
---

# oneshot

The user said oneshot because they are not watching this thread. Your updates and final message go unread until long after you stop. You own the work from its current state to a change that is live, proven and announced.

If the user did not clearly ask for oneshot, do not assume this level of autonomy; use `astack` instead.

`<skill-dir>` means this skill's folder. Run its scripts from the project root.

## The grant

Saying oneshot gives you permission, for this task only, to:

- do everything `astack` may do without asking;
- merge the PR once the merge gate passes, with the repo's merge method;
- force-push the PR's own branch with `--force-with-lease` after a rebase;
- deploy through the repo's documented pipeline to the target the user named, or to production when the repo deploys on merge;
- post the delivery update to the channel or thread where the work was requested;
- use any test method the proof needs, including browsers, simulators and running the app, even where project files say to ask first. Rules about *how* to test still apply.

It does not cover: deleting data, spending money, changing secrets or permissions, touching other repos or other people's branches, or messaging anyone else. A harness approval prompt still applies.

## Steps

Copy these into your todo list first. Close each with proof or `skip: <reason>`.

1. **Run the astack stages** 1 to 7: context, plan, build, use it, measure, clean, independent verification. Read `astack`'s SKILL.md if it is installed; the stages are listed there.
2. **Open the PR** and get it to no blockers with `ship`: CI classified and fixed, every review thread fixed or answered with a reason.
3. **Merge gate.** All true on the latest head: proof covers every change in the diff; required checks green; the independent verdict is PASS for this head; review bots finished and each finding fixed or dismissed with a reason; no human review requesting changes; branch up to date and mergeable. `git fetch` and re-read the PR immediately before merging. Never `--admin` or any bypass.
4. **Merge, then read it back.** A queued merge or armed auto-merge is not a merge; stay until GitHub reports the PR merged.
5. **Deploy and prove it.** Deploy the way the repo deploys, then `node <skill-dir>/scripts/verify-live.mjs` must find the deployed commit or the changed content at the real URL, and you exercise the changed behaviour there.
6. **Tell the team** in the thread or channel where the work was requested: what users can now do, the word that is true (live, merged, blocked), and the PR and live links, in two or three lines. Check the thread for an earlier update about the same change first, scan the text for secrets and private data, send once, read it back and keep the permalink.
7. **Report** in your final message: outcome, PR and merge commit, live proof, the independent verdict, decisions you made, anything not verified.

## Never stop early

Ending your turn while checks, reviews, a merge queue or a deploy are pending ends the work. Wait with `node <skill-dir>/scripts/pr-state.mjs --watch` and `node <skill-dir>/scripts/verify-live.mjs <url> --expect <sha> --poll 900`, run as background tasks or under your harness's monitor.

## Asking the user

A normal message goes unseen. Use the harness's question tool, with the PR link, what blocks you, and the options with your recommendation first. Ask only when:

- you cannot prove a change;
- the merge gate cannot pass and you cannot fix it yourself;
- the deploy fails in a way you cannot diagnose and fix, or would need a rollback;
- the next step is outside the grant;
- the goal is ambiguous in a way that changes the result.

If no question tool exists or nobody answers, take the safe path: leave the PR open and unmerged (or the deploy on its last good revision) and start your final message with the question.
