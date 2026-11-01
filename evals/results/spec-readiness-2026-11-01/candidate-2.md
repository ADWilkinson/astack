Applied the supplied astack readiness procedure. No files were changed, no workers launched, and probes stayed on the supplied localhost product.

**Task A — FAIL: implementation should not start.**

Restatement: add a rate model and POST board endpoint, prefill selling from a link, and deduplicate returning visitors across processes while retaining a read-only server.

Source and live checks contradict key premises:

- **Blocker:** existing `src/rates.mjs` does not exist. The only model is `src/feed.mjs`.
- **Blocker:** `/api/feed` provides `reference.source: "settled-fills"`, `unit: "USDC"` and `currencies: ["USD","GBP"]`; it contains no FX oracle or conversion rates. Both source and live JSON confirm this.
- **Blocker:** exact returning-visitor counting across processes has no supplied identity or shared-state mechanism. The fixture has no sessions, cookies, persistence or analytics store.
- **Major:** “relay-ready” has no definition in the supplied contract or repository, so its model and observable correctness are unspecified.
- **Major:** POST requires changing the server’s global GET/HEAD-only contract. Live POST `/api/board` currently returns `405` with `Allow: GET, HEAD`. POST need not mutate data, but its intended read-only semantics and method exception need an explicit contract.
- **Verified prerequisite gap:** `/sell?amount=100` returns an input with `value=""`. Linking alone cannot prefill it.

Next actions: correct the source/model premise; define relay-ready output and its actual data source; settle the method contract; specify visitor identity, deduplication scope and allowed state; and define how prefill occurs. Retain those resolutions in the existing contract, then recheck the changed findings before dependent implementation. These are specification gaps, not approval gates.

Required evidence after resolution: exact board schema and partial/error cases; chosen method behavior; actual amount prefill plus unchanged ordinary selling behavior; deduplication exercised across processes under the agreed identity/state rules; and feed compatibility. “Add tests” does not currently identify sufficient assertions.

**Task B — PASS: implementation can start.**

Restatement: add an immutable feed projection and a read-only GET/HEAD endpoint, preserving existing consumers and routing behavior.

Claims checked:

- **Verified:** `server.mjs` and `src/feed.mjs` exist; the feed contains the specified USD/GBP data.
- **Verified:** `src/board.mjs` and `tests/board.test.mjs` are proposed new files, not missing prerequisites.
- **Verified:** the global method guard returns `405` and `Allow: GET, HEAD`; unknown GET routes return `404`.
- **Verified:** live `/api/feed` matches source. GET and HEAD `/api/board` currently return `404`, as expected before implementation.
- No material implementer decisions remain. Invalid-input behavior is outside this endpoint’s supplied internal-feed contract.

Next actions: add `board(feed)` with the exact projection; add the route after the existing method guard; create the isolated Node tests; then run `node --test tests/board.test.mjs`.

Required proof: exact projection and unchanged input; GET JSON, status and `no-store`; HEAD status/headers with no body; POST 405 and exact Allow header; unknown-route 404; unchanged feed payload. After implementation, verify live GET and HEAD against the candidate server. Delivery remains source merge only, with no release or publication.

**Task C — implementation can start; no spec-readiness stage needed.**

The existing file and live `/sell` both contain `<title>Sell</title>`, heading `Sell USDC`, and the amount form. This meets the skill’s exemption for a one-file copy correction.

Next action: replace only the title text. Prove the diff contains only that replacement, then fetch `/sell` and assert `Sell USDC` in the title, unchanged heading/form, and successful GET behavior. No new plan, test suite or independent review is warranted.

All implementation, post-change tests, merges and candidate live verification remain unperformed because this trial explicitly stops before editing.
