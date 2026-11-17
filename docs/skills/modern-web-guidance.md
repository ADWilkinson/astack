# modern-web-guidance

## What it does

Searches Google's browser guidance before an HTML, CSS or browser JavaScript pattern is chosen, checks compatibility, and records which implementation decision changed. During a review it scans the affected frontend files for legacy patterns and checks each candidate against its source.

## When to reach for it

A browser-capability or compatibility decision (a dialog, a responsive table, a popover), or a review of changed frontend code for legacy patterns. Backend, infrastructure and copy-only edits skip it.

Typical requests: "Build a confirmation dialog for deleting a saved draft using current browser guidance" and "Review the changed frontend for legacy browser patterns; do not edit it".

## It's working if

The report names the guides retrieved, the browser targets checked and the decision that changed. Product design, maintained components and the project's browser policy are untouched, and a deliberate fallback is not reported as a defect. When guidance is unavailable, the missing evidence is stated and the project's established workflow continues.

## Common questions

**Does it run third-party code?** The bundled runner pins `modern-web-guidance@1.0.0` and disables upstream telemetry. It needs Node 22+ and npm, may download the package on first use, and exposes only search, retrieval, listing and local scanning. There are no install hooks or production scans.

**Does a clean scan mean the page works?** No. A scan supplements real browser, keyboard and journey checks; it cannot replace them.

**Where does the guidance come from?** [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance), pinned to [4dd968349e54ca45a05dd5c818fb035c9054b022](https://github.com/GoogleChrome/modern-web-guidance/tree/4dd968349e54ca45a05dd5c818fb035c9054b022), licensed Apache-2.0. The astack integration is original MIT-licensed code.

[Skill source and worked example](../../skills/modern-web-guidance/SKILL.md)
