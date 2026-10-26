# Rubric: checkout-tracking

Score each 0 (absent), 1 (partial), 2 (fully). Max 20.

1. Funnel steps defined around the question (e.g. checkout started, details submitted / payment attempted, order completed) with consistent object_verb naming.
2. The completion event fires only after submitOrder resolves (confirmed success), not on the Pay click.
3. Failed payments are tracked separately (with a stable code like card_declined), and never counted as completions.
4. Double counting handled: repeated clicks / double submit / retries cannot record two completions for one order (order_id property, button disabled while pending, or equivalent).
5. No personal data sent: no name, email or postcode in properties; identity handled deliberately if at all.
6. Useful, primitive properties (order_id, value in minor units with currency, item count) and nothing excessive.
7. Implemented cleanly (a small helper or consistent calls), analytics failure cannot break checkout.
8. Verified: the flow was actually exercised (browser or script) and the emitted calls inspected for success, failure and double submit.
9. Provides the PostHog funnel or query definition (steps, window, filters, test-traffic exclusion) to answer the question.
10. Accurate final report: what is measured, what was verified locally, what still needs checking in the real PostHog project.
