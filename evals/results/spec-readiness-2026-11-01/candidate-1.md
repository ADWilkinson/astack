I used the supplied astack skill and its planning/readiness references. No files were changed, no workers were launched, and probes stayed on the supplied localhost product.

### Task A — FAIL: implementation should not start

**Restatement:** Add a rate-board model and POST endpoint, prefill the sell form, and deduplicate returning visitors across processes while keeping the product read-only and using no persistence or cookies.

**Evidence and gaps:**

| Claim | Finding |
|---|---|
| Existing `src/rates.mjs` | **Contradicted:** only `src/feed.mjs` exists under `src`. |
| `/api/feed` provides an FX oracle | **Contradicted:** source and live JSON identify `settled-fills`; there are no exchange rates or oracle data. |
| “Relay-ready model” defines an implementable shape | **Unavailable, major:** the request and fixture supply no definition or consumer contract. |
| Linking `/sell?amount=100` prefills the form | **Contradicted:** the live response contains `value=""`; the server ignores query parameters and the page has no script. |
| POST fits the current method contract | **Contradicted:** the global guard returns 405 with `Allow: GET, HEAD`, including for `/api/board`. A read-only POST would require an explicit method-contract change. |
| Returning visitors can be counted once across processes under these constraints | **Blocker:** there is no identity or shared deduplication state. In-memory counting cannot establish cross-process uniqueness; no permitted alternative is specified. |

**Material decisions left open:** board/model schemas; the actual rate-data source and unavailable-data behavior; POST compatibility; validation limits and errors; prefill parsing; visitor identity, privacy and cross-process state.

**Next actions:** Resolve those contradictions in the existing Task A contract before building its dependent slices. Document an implementable measurement contract or remove that requirement explicitly; identify a real data source; define the model and endpoint behavior; specify the prefill change. Recheck the changed findings with a fresh reader. This review does not authorize silently substituting different requirements.

**Required proof:** model and partial-data cases; exact API success/error/method contracts; unchanged `/api/feed`; form prefill for valid, invalid and boundary values; and, if retained, demonstrated deduplication across processes and repeat visits. “Add tests” currently leaves these assertions unspecified.

### Task B — PASS: implementation can start

**Restatement:** Add a pure projection and GET/HEAD endpoint without changing the existing feed or global method guard.

**Readiness evidence:**

- `server.mjs`, `src/feed.mjs` and their cited behavior exist.
- The live feed is exactly `{"reference":{"source":"settled-fills","unit":"USDC"},"currencies":["USD","GBP"]}`.
- `/api/board` currently returns 404, confirming the proposed route is additive.
- POST `/api/board` returns 405 with `Allow: GET, HEAD`; an unknown route returns 404.
- `src/board.mjs` and `tests/board.test.mjs` are explicitly proposed new files. Their absence is expected.

No blockers, majors or material behavior decisions remain. Routine test-process setup can follow Node conventions.

**Next actions:** Create the projection module; add the route after the existing method guard; add the specified tests using an isolated loopback server on an ephemeral port, with cleanup. Run `node --test tests/board.test.mjs`.

**Required proof:** exact `{referenceSource:"settled-fills",currencies:["USD","GBP"]}` projection with unchanged input; GET JSON and `Cache-Control: no-store`; HEAD 200 with corresponding headers and no body; preserved POST 405/Allow, unknown-route 404 and exact feed payload. After implementation, probe GET and HEAD on the updated local server, then deliver the source-only merge with no release or publication.

### Task C — implementation can start

This one-file copy correction does not trigger the readiness review threshold.

**Evidence:** Both source and live `/sell` contain `<title>Sell</title>`, `<h1>Sell USDC</h1>` and the existing empty amount form.

**Next actions:** Replace only the title text. Inspect the diff to establish that the heading and form are untouched; fetch `/sell` to verify `<title>Sell USDC</title>`, unchanged form markup and successful GET behavior. Deliver the source-only merge.

No implementation, tests, merges or post-change verification were performed in this read-only trial.
