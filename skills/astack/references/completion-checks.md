# Completion checks

Run this before writing "done". Every line is either checked, not applicable (say why in a clause), or reported as the remaining gap.

## The change

- [ ] Final diff re-read against the acceptance, not against the first plan. Deferred scope is named.
- [ ] Unrelated files untouched; nothing staged that you did not mean to ship (`git status`, `git diff --stat`).
- [ ] The original case reproduced before the fix and passes after it, from a stated starting state.
- [ ] Neighbouring paths exercised: empty, error, retry, long content, signed-out or other role where it applies.

## The experience (visual changes)

- [ ] Captured at 390 and 1440, light and dark, reduced motion on (`node <skill-dir>/scripts/shoot.mjs <url>`), and the screenshots were looked at.
- [ ] No horizontal overflow, stranded single words in headings, tap targets under 44px or text under 12px that you did not choose on purpose.
- [ ] Loading, empty, error and success states seen, not assumed.
- [ ] `deslop` scan run on changed copy and UI; every medium/high hit fixed or dismissed with a reason.

## Measurement (when the change has a success action)

- [ ] One event per real success, fired where success is known (server or confirmed response), not on click.
- [ ] Seen arriving in the correct project with the expected properties and identity.
- [ ] A saved query or funnel answers the question; its first valid comparison window is stated.

## Delivery

| Target | Proof required |
| --- | --- |
| Local | Files saved, local checks green. |
| PR-ready | `pr-state.mjs` reports no blockers on the current head. |
| Staging / production | `verify-live.mjs` finds this revision or the changed content at the target URL, and the changed behaviour was exercised there. |
| Update sent | Permalink to the message in the right channel or thread. |
| Automation | The installed job has run once through its scheduler and its output was read. |

## The report

- [ ] Leads with the outcome at the agreed target.
- [ ] Every claim has a link or names how it was observed.
- [ ] Anything unverified is said plainly with the exact next step. No "should work".
