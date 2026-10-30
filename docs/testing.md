# Testing

## The package

```sh
bun run check
```

Validates the catalogue, both client manifests, versions, picker metadata, that every skill's links resolve inside its own folder, and that each skill's copy of a shared script matches `shared/`. The required gate runs the package and installer boundary tests, followed by the packed consumer smoke:

- `tests/package.test.ts`: the validator rejects broken packages (bad metadata, missing or escaping links, version drift).
- `tests/install.test.ts`: the installer against throwaway projects (conflicts, `--force`, symlinks, the compiled Node build).
- `scripts/smoke.ts`: packs the CLI, installs the tarball offline into a temporary project, compares both installed client views byte for byte and runs every installed script's help.

`bun test` is the full optional suite. In addition to the boundary tests it includes:

- `tests/routing.test.ts`: the routing scorer rejects incomplete runs and reveals per-case flips even when totals tie.
- `tests/scripts.test.ts`: every bundled script run the way a user runs it, against a local fixture server. The `shoot.mjs` test drives a real headless Chrome and is skipped when none is installed. `pr-state.mjs` needs GitHub, so only its help path is exercised by that test.

`claude plugin validate . --strict` checks the Claude manifests with the client's own validator.

## The skills

Structural checks don't show a skill makes the agent better. The [evals](../evals/README.md) compare realistic tasks with and without astack and test routing from the descriptions. For behavior changes, compare old and candidate versions with repeated runs. Record the result in `evals/RESULTS.md`, including the runs where astack didn't help.
