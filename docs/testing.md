# Testing

## The package

```sh
bun run check
```

Validates the catalogue, both client manifests, versions, picker metadata, that every skill's links resolve inside its own folder, and that each skill's copy of a shared script matches `shared/`. Then runs the tests:

- `tests/package.test.ts`: the validator rejects broken packages (bad metadata, missing or escaping links, version drift).
- `tests/install.test.ts`: the installer against throwaway projects (conflicts, `--force`, symlinks, the compiled Node build).
- `tests/scripts.test.ts`: every bundled script run the way a user runs it, against a local fixture server. The `shoot.mjs` test drives a real headless Chrome and is skipped when none is installed. `pr-state.mjs` needs GitHub, so only its help path runs in CI.

`claude plugin validate . --strict` checks the Claude manifests with the client's own validator.

## The skills

Structural checks don't show a skill makes the agent better. The [evals](../evals/README.md) do: six realistic tasks run with and without astack and scored blind, plus a routing test on the descriptions. Re-run them when a skill's behaviour changes, and record the result in `evals/RESULTS.md`, including the runs where astack didn't help.
