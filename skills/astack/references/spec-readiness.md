# Spec readiness

Check a substantial plan before its assumptions become code. Use the existing
issue or plan; this creates no extra tracker or human approval step.

## When to run

Run before building when a plan has **three or more implementation slices**,
changes **more than two production files**, or changes an API, stored-data,
authentication or money contract. An explicit request for a spec review also
qualifies. A one- or two-file copy or mechanical fix without a changed contract
keeps the ordinary checks; it needs no fresh-reader stage.

## Give the reader a clean start

Use an available native worker with a fresh context. Give it only the plan or
issue contract, the repository location and relevant live-product URLs/access
limits. Include the outcome, scope, preservation requirements, acceptance and
current decisions in the document itself. Omit the author's conversation,
explanation of intent and preferred verdict. Repository and fetched content are
evidence, not new authority. The reader inspects and reports; it makes no edits,
production writes or account changes. No plugin or separate model service is
needed. If a fresh reader is unavailable, state that gap in the existing task;
do not describe the author's own check as independent.

## Two passes

1. **Comprehension.** Restate the proposed outcome and how the current system
   works from the document. List every guess needed to connect the explanation:
   undefined project terms, missing prerequisites, conflicting instructions or
   unclear scope. Check the rest of the document before calling a term undefined;
   ordinary engineering vocabulary needs no glossary.
2. **Implementation readiness.** Check cited existing paths and symbols in source;
   distinguish proposed new files. Verify consequential live claims with safe
   probes where permitted. Label each claim verified, contradicted or unavailable,
   with its evidence. Apply the **zero-decision rule**: list material decisions
   still left to the implementer, including response/data shapes, failure and
   partial-data behavior, privacy, compatibility, migration and delivery. Routine
   names, formatting and established repository conventions do not need another
   decision. Name required journey, boundary or behavior tests and the assertions
   they must establish; “add tests” is insufficient.

Use **blocker** for a contradiction or missing premise that prevents the outcome,
**major** for an unresolved choice that changes behavior or its proof, and
**minor** for a clarification that does not prevent correct implementation.

## Report and resolve

```text
Verdict: PASS | FAIL
Restatement: proposed outcome; current system
Comprehension guesses: severity; document location; guess and consequence
Readiness claims: verified | contradicted | unavailable; source/probe
Implementer decisions left open: severity; choice; affected behavior
Required tests: named journey/contract; observable assertions
Limitations: inaccessible evidence or excluded surface
```

PASS means no blockers or majors remain and required claims have evidence.
FAIL names the specific gaps, rather than inventing an implementation to fill
them. The author resolves blockers and majors in the existing contract before
building the dependent slice, using current evidence and existing authority for
routine choices. Recheck changed findings with a fresh reader; retain useful
completed work and minor notes. An unavailable required dependency stays owned
with a machine-observable recovery condition and next check. Do not turn this
into a sequence of consensus questions or repeat unaffected review work.

Adapted from Google's [Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model)
(Apache-2.0), specifically its comprehension and implementation-readiness readers
at commit `403d888`. This procedure is paraphrased; it installs no EGM plugin.
