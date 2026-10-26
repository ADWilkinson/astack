# Verification

## Payload hygiene before transport

- List the allowed properties per event; everything else is dropped.
- SDK autocapture and `$current_url`-style defaults collect full URLs. Strip query strings and fragments, or redact known secret-bearing parameters (`token`, `code`, `key`, `email`, `redirect`, nested return URLs).
- Test with synthetic secret-shaped values (`?token=TEST_SECRET_123`, an email in a path segment, a nested `?next=` URL) and inspect the real outbound request, including the first event fired during SDK initialisation.
- Apply the same sanitiser to every sink (analytics, error tracking, logs, warehouse).

## Exercise cases

| Case | Expect |
| --- | --- |
| Success | One outcome event with correct properties, in the right project/environment. |
| Validation error / cancel / server failure | No success event. Failure event if the taxonomy has one. |
| Retry, reload, double submit, rerender | Still exactly one success per entity. |
| Sign in mid-journey | The journey stays attributed to one person; unrelated users are not merged. |
| Test account / localhost | Excluded, or routed to a dev project. |

Record the time and entity id of each controlled action so you can find it in the provider.

## Query correctness

- Population: only eligible users or entities; test and internal traffic excluded by a filter that is actually applied.
- Users vs events: a funnel of users and a count of events answer different questions.
- Window maturity: for "converted within 7 days", include only cohorts whose 7 days have fully elapsed. Recent cohorts are pending, not 0%.
- Empty denominator is "no data", not 0%.
- Event or identity semantics changed mid-period: split the series or say why the comparison is still valid.

## Multiple sinks

When one action is sent to several tools, check the same meaning, identity and timestamp policy at each. Provider-specific names are fine through an explicit mapping; silent drift is not.

## What tracking proves

A verified pipeline gives you a measurement. It does not show the change caused an improvement; that needs a comparison window, a guardrail and the other releases in the period accounted for.
