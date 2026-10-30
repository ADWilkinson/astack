# Contributing

Issues and PRs are welcome.

The best issue is a real session where a skill made the agent do the wrong thing, or failed to stop it doing the wrong thing. Include the skill, what you asked, what happened, what you expected, and your client and model. Strip anything private first.

For a PR:

1. Read [AGENTS.md](AGENTS.md) and [SCOPE.md](SCOPE.md).
2. Make the change in the skill's own folder, or in `shared/` for a shared script.
3. Run `bun run metadata` and `bun run check`.
4. If you changed how a skill behaves, say how you checked it actually behaves better: an eval run, a before and after, or a transcript.

## Checks

`bun run check` is the required CI gate (the `package` job). It runs:

- `scripts/check.ts`: metadata, manifests, the published set and skill-local links match the catalogue.
- `tests/package.test.ts`, kept because unit-level cases are the only way to plant the failures it guards: generated metadata integrity, single-skill portability (no cross-skill or symlinked resources), and release and npm boundaries (ignored private files and `.env` never ship, no install hooks or runtime dependencies).
- `tests/install.test.ts`, kept because it is the only guard for the installer's protection of user files: rollback after a failed install, conflict refusal without `--force`, and refusal of symlinked destinations.
- `scripts/smoke.ts`: the consumer journey. It packs the CLI, installs the tarball offline into a temporary project, lists, installs every skill for both agents byte for byte, refuses a traversal name, runs each installed script's `--help`, and checks the routing eval cases name real skills.

The routing and task evals need a model and a judge, so they are not in the gate. Run them for any change to how a skill behaves.

`bun test` runs the full optional suite, including the installer edge cases and the Chrome and ffmpeg script tests. For new behaviour, add smoke, contract or eval coverage rather than a unit test.

Keep PRs to one idea. New skills need a real use case that a capable model gets wrong without them; see [SCOPE.md](SCOPE.md).
