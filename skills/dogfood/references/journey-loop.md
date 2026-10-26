# Journey loop

## Frontier format

```md
# Dogfood: <product> @ <revision> on <environment>
Account: <role, state>   Data: <seeded / real test data>   Widths: 390, 1440

## Journeys
- [ ] J1 <user> <goal> → <observable end>        findings: F1, F3
- [x] J2 …                                        passes (replayed after F1 fix)

## Findings
- F1 [blocker] <one line>
  repro: 1. … 2. … 3. …
  expected: …   observed: …   evidence: screenshot/console/network
  cause: file:line, why
  status: fixed in <commit> · replayed J1, J2 ✓
- F2 [friction] …
- F3 [visual] …

## Out of scope (noted, not fixed)
- …
```

Severity: **blocker** (cannot reach the outcome, or wrong outcome), **friction** (reaches it with confusion or extra work), **visual** (layout, contrast, polish). Fix blockers first.

## Rules

- Same starting state for before and after. Cached data or a completed onboarding makes a fix look better than it is.
- Check the outcome, not the toast. Open the record, the email, the file.
- Before retrying a submission that timed out, check whether it went through. A spinner that never stopped may have created the order.
- Deduplicate by cause: five screens broken by one component is one finding.
- Converge. When the agreed journeys pass and their neighbours do not regress, stop. A whole-product sweep is a different task.
- Clean up test data you created, or list it.
