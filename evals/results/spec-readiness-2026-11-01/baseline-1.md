**Task A: implementation should not start as specified.**

The inspected source and localhost responses contradict several premises:

- `src/rates.mjs` does not exist; “relay-ready” has no defined contract.
- `/api/feed` returns `reference.source: "settled-fills"` and currencies `["USD","GBP"]`; it contains no FX oracle.
- The global guard rejects POST with 405 and `Allow: GET, HEAD`, confirmed live.
- `/sell?amount=100` returns exactly the same document as `/sell`, with an empty amount field and no script.
- Counting returning visitors once across processes requires a visitor identity and shared memory of prior visits. Neither exists, and the stated constraints provide neither.

Next action: resolve the model/data contract, HTTP-method conflict and visitor-counting requirement before building dependent slices. A feasible read-only projection is specified in Task B. Query-based form prefill would require its own explicit implementation and verification. Sensible schemas and tests cannot resolve these contradictions.

**Task B: ready to implement.**

The named **new** files are proposed additions; their absence is expected. The existing feed and server support the specified approach.

Next actions:

1. Add `src/board.mjs` with the exact projection, without modifying the feed.
2. Add GET/HEAD `/api/board` after the global method guard, returning JSON with `Cache-Control: no-store`.
3. Add the specified Node tests using an isolated loopback server: exact USD/GBP projection and unchanged input, endpoint JSON/header, POST 405/Allow, unknown-route 404 and unchanged feed.
4. Run `node --test tests/board.test.mjs`; verify running GET returns the exact projection and HEAD returns matching status/headers with no body.
5. Merge source only after checks pass. No release or publication.

Current evidence: board GET/HEAD return 404, POST returns the required 405/Allow, unknown routes return 404, and the feed matches the proposed input. Post-change evidence remains pending.

**Task C: ready to implement directly; no separate plan or independent review needed.**

`public/sell.html` contains exactly `<title>Sell</title>`, and live `/sell` confirms it. Replace only that string with `<title>Sell USDC</title>`. Check the diff contains only that replacement, then fetch `/sell` to confirm the new title and unchanged heading/form; preserve GET and query-string behavior. Merge source only after verification.

No files were changed, tests run, merges performed or releases made.
