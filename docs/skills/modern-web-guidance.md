# Modern Web Guidance

Use this before choosing HTML, CSS or browser JavaScript patterns, and when reviewing changed frontend code. It searches Google's browser guidance and checks local legacy-pattern candidates. Product design, maintained components and browser targets stay with the project.

```text
Build a confirmation dialog for deleting a saved draft using current browser guidance.
Review the changed frontend for legacy browser patterns; do not edit it.
```

The skill searches one generic capability, retrieves matching guides, checks compatibility and records which implementation decision changed. During review it scans the affected local frontend file or directory and checks each candidate against its source. A deliberate fallback is not automatically a defect.

The bundled runner pins `modern-web-guidance@1.0.0` and disables upstream telemetry. It needs Node 22+ and npm, may download the package on first use, and exposes only search, retrieval, listing and local scanning. There are no install hooks or production scans.

Backend, infrastructure and copy-only edits skip it. When guidance is unavailable, report the missing evidence and continue the project's established workflow. A scan supplements real browser, keyboard and journey checks; it cannot replace them.

See the [skill and worked example](../../skills/modern-web-guidance/SKILL.md). The upstream project is [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance), pinned to [4dd968349e54ca45a05dd5c818fb035c9054b022](https://github.com/GoogleChrome/modern-web-guidance/tree/4dd968349e54ca45a05dd5c818fb035c9054b022), licensed Apache-2.0. The astack integration is original MIT-licensed code.
