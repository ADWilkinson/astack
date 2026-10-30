---
name: oneshot
description: "Use only when explicitly requested as \"oneshot\" or \"full send\": implement, merge, deploy and verify live within the user's scope, then send any authorized delivery update."
disable-model-invocation: true
---

# oneshot

Own the work from its current state to the authorized live result, with serving proof and any authorized delivery update.

If the user did not clearly ask for oneshot, do not assume this level of autonomy; use `astack` instead.

`<skill-dir>` means this skill's folder. Run its scripts from the project root.

## The grant

An explicit oneshot request sets the end-to-end delivery intent for this task. Follow the user's actual scope, repository gates and any narrower authority. The delivery path may include:

- do everything `astack` may do without asking;
- merge the PR once the merge gate passes, with the repo's merge method;
- force-push the PR's own branch with `--force-with-lease` after a rebase;
- deploy through the repo's documented pipeline to the target the user named, or to production when the repo deploys on merge;
- post a delivery update when the user authorized that destination;
- use proportionate test methods, including browsers, simulators and running the app, within the task's existing testing authority.

It does not cover: deleting data, spending money, changing secrets or permissions, touching other repos or other people's branches, or messaging anyone else. A harness approval prompt still applies.

## Steps

Keep one working plan with the acceptance criteria and evidence. Load supporting skills only for procedures the current step needs.

1. **Implement and verify**: settle context that changes the work, build in the repo's conventions, exercise the real journey, verify relevant measurement and clean the diff. Required checks and affected behavior decide whether the change works. Add independent review when risk, subjective quality or repository rules call for it.
2. **Open the PR** and get it to no blockers with `ship`: CI classified and fixed, every review thread fixed or answered with a reason.
3. **Merge gate.** All true on the latest head: proof covers every change in the diff; required checks green; any required independent review covers this head with no unresolved defects; review bots finished and each finding fixed or dismissed with a reason; no human review requesting changes; branch up to date and mergeable. `git fetch` and re-read the PR immediately before merging. Never `--admin` or any bypass.
4. **Merge, then read it back.** A queued merge or armed auto-merge is not a merge; stay until GitHub reports the PR merged.
5. **Deploy and prove it.** Deploy the way the repo deploys, then `node <skill-dir>/scripts/verify-live.mjs` must find the deployed commit or the changed content at the real URL, and you exercise the changed behaviour there.
6. **Send an authorized update** to the destination the user approved: what users can now do, the state that is true (live, merged, blocked), and the PR and live links. Check for an earlier update about the same change, scan for secrets and private data, send once, read it back and keep the permalink. If no destination is authorized, report here.
7. **Report** in your final message: outcome, PR and merge commit, live proof, verification method and any independent verdict, decisions you made, anything not verified.

## Never stop early

Ending your turn while checks, reviews, a merge queue or a deploy are pending ends the work. Wait with `node <skill-dir>/scripts/pr-state.mjs --watch` and `node <skill-dir>/scripts/verify-live.mjs <url> --expect <sha> --poll 900`, run as background tasks or under your harness's monitor.

## Asking the user

Use the client's available question mechanism with the PR link, the blocker and your recommendation. Reuse existing authority. Ask only when:

- you cannot prove a change;
- the merge gate cannot pass and you cannot fix it yourself;
- the deploy fails in a way you cannot diagnose and fix, or would need a rollback;
- the next step is outside the grant;
- the goal is ambiguous in a way that changes the result.

If no question tool exists or nobody answers, take the safe path: leave the PR open and unmerged (or the deploy on its last good revision) and start your final message with the question.
