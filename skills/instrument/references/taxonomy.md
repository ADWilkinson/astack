# A small event taxonomy

A starting point for products without one. Ten generic events plus a handful of domain outcomes answer most questions; hundreds of bespoke events answer none because nobody trusts them.

## Generic events

| Event | Properties | Fires when |
| --- | --- | --- |
| `page_viewed` | `path` (no query), `referrer_host` | Route renders (often the SDK default; sanitise it) |
| `cta_clicked` | `id` (stable, e.g. `hero_start`), `surface` | A tracked call to action is pressed |
| `funnel_step` | `funnel`, `step`, `step_index` | A user reaches a numbered step of a named flow |
| `form_submitted` | `form`, `surface` | Submit is attempted |
| `error_shown` | `code` (stable lowercase), `surface`, `reason` | A user-visible error renders |
| `search_performed` | `surface`, `results_count`, `has_filters` | A search returns |
| `feature_used` | `feature`, `surface` | A non-navigational feature is used |
| `signed_up` | `method` | Account creation succeeds (server) |
| `signed_in` | `method` | Sign-in succeeds |
| `share_clicked` | `target`, `surface` | A share control is used |

## Domain outcomes

Name them `object_verb` in the past tense for things that happened: `order_created`, `listing_published`, `invoice_sent`, `report_exported`. Fire them where the outcome is confirmed, with the entity id as a property for dedupe.

Distinguish stages that can fail independently rather than one "success": `order_submitted`, `order_accepted`, `order_fulfilled`.

## Property rules

- Primitive values only: string, number, boolean. No nested objects or arrays unless the provider handles them well and you query them.
- Enumerations are lowercase snake_case constants in code, not user-facing labels (translations change; `code` must not).
- Money as a number in minor units or with an explicit `currency` property.
- No PII or secrets: email, name, phone, address, tokens, full URLs with query strings or fragments, free-text inputs.
- Include `surface` (where in the product) so one event can serve several placements.

## Enforcement

- One producer function per event, typed. A contract test asserts each event's property set.
- Changing an event's meaning gets a new name or a `version` property and a note on the dashboard; never silently.
- A short `ANALYTICS.md` lists the events, owners and the saved queries that depend on them.
