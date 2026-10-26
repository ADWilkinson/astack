# Planning

A plan is a list of things that will be true at the end, each with how you will know. Steps are secondary.

An obvious one- or two-file change with a clear approach needs no plan. Say so and start.

## 1. Define the finish

One sentence each:

- **User outcome**: what someone can do afterwards that they cannot today.
- **Target**: local, PR-ready, staging or production. Pick one; do not let it drift upward.
- **Not in scope**: the adjacent thing someone will assume is included.

## 2. Kill the riskiest unknown first

Settle open questions by trying them, not by asking: a throwaway prototype, a script, a rendered sketch. Ask the user only about a product or preference call that no experiment can settle.

Name the assumption that would most change the plan if wrong (an API that may not support the call, a layout that may not fit mobile, data that may not exist). Settle it with the smallest probe that can fail: a script, a curl, a throwaway branch, a rendered prototype. Plan after the probe, not before.

## 3. Write the acceptance table

| Requirement | Change | Proof | Where |
| --- | --- | --- | --- |
| Buyer sees shipping before paying | `CheckoutSummary` shows shipping row | Screenshot 390/1440 light/dark; unit test on shipping calc | Staging |
| Shipping shown matches shipping charged | Use `quote.shipping`, not a client estimate | Place a test order; compare row to receipt | Staging |
| We can tell if showing shipping changes drop-off | `order_created {shipping_shown}` server-side | Event seen in project; funnel saved | Prod |

Every row needs a proof you can actually run. "Works" and "looks good" are not proofs.

Include rows for whatever applies:

- the real user journey end to end, not only the unit
- mobile and dark mode for any visual change
- empty, error, loading and long-content states
- measurement: event, where it fires, the query that will read it
- review and CI on the final head
- rollout: flag, migration order, rollback path
- the update: who needs to hear, where

## 4. Order the slices

1. Anything that can invalidate the plan (the probe, migrations, contracts).
2. The thinnest end-to-end path that a user could touch.
3. States, polish, measurement.
4. Review, ship, verify, report.

Each slice ends in something checkable. Parallelise only across files and owners that do not overlap, and name where the pieces join.

## 5. Write it where the work lives

Small task: five lines in the reply, then start. Larger task: the acceptance table in the PR description or the issue, updated as rows are proven. Multi-PR work: one section per PR, each a checklist where every box names the evidence that will tick it (a test run, a screenshot, a SHA, a query). A box with no nameable evidence is not a requirement yet. Do not start a new planning document or tracker when one exists.

If the user asked only for a plan, stop at the plan. Otherwise start slice 1.

## Smells

- A plan with no proof column.
- "Add tests" or "polish UI" as a step with no named case or state.
- Production in the plan when the ask was a PR.
- Measurement added after launch "once we see how it goes".
- A ten-step plan for a two-line fix.
