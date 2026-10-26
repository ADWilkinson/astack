---
name: instrument
description: Add product analytics that answer a real question, such as events, funnels, conversion and activation metrics, and prove them end to end, so the event fires once on real success, arrives in the right project with clean properties and identity, and a saved query reads it. Use when adding tracking, "can we measure this", setting up PostHog/Amplitude/Mixpanel/GA events, building a funnel, when a dashboard number looks wrong or changed suddenly, or before shipping a feature whose impact matters.
---

# Instrument

`posthog.capture()` in the code is not measurement. Measurement is an event you have seen arrive, meaning exactly one thing, read by a query that answers a question.

## 1. Start from the question

Write it as a decision: "Do buyers who see the shipping cost up front still check out at the same rate?" Then define:

- **Success action**: the confirmed outcome (order created), not the click (button pressed).
- **Population and denominator**: who is eligible, counted as users or as entities.
- **Window**: conversion window and the first period you can compare.
- **Guardrail**: the number that must not get worse.

Check existing events and dashboards first. Reuse an event whose meaning matches; do not add `checkout_completed_v2` next to `order_created`.

## 2. Design the events

Follow the project's taxonomy if it has one. If not, use [taxonomy](references/taxonomy.md): a small set of canonical events with typed, primitive properties, named `object_verb` in snake_case.

For each event, decide:

- **Where it fires**: where success is known. Server-side or on the confirmed response for outcomes; client-side for pure UI intent.
- **Identity**: the user/anonymous id and any group (team, account). Check the anonymous-to-signed-in merge in your provider so funnels do not split.
- **Dedupe**: what stops a rerender, retry, reload or client+server double fire from counting twice. Use the entity id as a property and fire from one owner.
- **Properties**: only what the question needs. No emails, names, tokens, full URLs with query strings, or free text. Error codes are stable lowercase strings, never translated copy.

## 3. Implement

- One typed helper per event (or one typed `track(event, props)` with a union type) so names and properties cannot drift.
- Analytics never breaks the product: wrap the SDK, never `await` it on the critical path.
- No tracking on localhost, previews, or for automated clients and test accounts, unless deliberately routed to a dev project.
- Redact before transport, including SDK autocapture of URLs ([verification](references/verification.md) covers payload checks).

## 4. Prove it end to end

1. Do the real action with a controlled account. Note the time and entity id.
2. Watch the outbound request (browser network panel or server log): one request, right name, right properties, no private data.
3. Do the failure and cancel paths: no success event.
4. Reload, retry, double-click: still one success.
5. Find the event in the provider, in the right project and environment. In PostHog, for example:

```sql
SELECT timestamp, event, distinct_id, properties.order_id, properties.shipping_shown
FROM events
WHERE event = 'order_created' AND timestamp > now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC LIMIT 20
```

Allow for ingestion delay; absence after a few minutes is a failure to investigate, not a pass.

## 5. Make it readable

Create or update the saved insight, funnel or query. Read it back and check the steps, filters, test-account exclusion, window and that it counts users vs events as intended. Write down where it lives, what it measures, the coverage start date and when the first comparison is valid. New instrumentation has no history; say so instead of comparing to nothing.

## Finish

Report: the question, events (name, where fired, properties), proof of arrival, the query link and its first valid read date. A working pipeline measures; it does not prove the feature worked. Say which.
