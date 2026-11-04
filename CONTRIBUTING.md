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

## Publish to npm

Bump the version with its changelog and merge to `main`, then wait for `Check package` on that commit. Publish through the `publish.yml` workflow, which authenticates with npm trusted publishing and uses no npm token. It runs only from `main`, requires a green check on the exact commit, and npm refuses an existing version. Check first with the default dry run:

```bash
gh workflow run publish.yml -R ADWilkinson/astack
gh workflow run publish.yml -R ADWilkinson/astack -f dry_run=false
```

Verify with `npx --prefer-online astack-skills@<version>`, then attach the published archive (`npm pack astack-skills@<version>`) to the GitHub release `v<version>`. Do not publish an unchanged version.

**First release under trusted publishing:** the owner creates the trusted publisher with 2FA, then the release must follow within 2 days, because npm expires a configuration that has not completed a publish by then. A 2FA-bypass token cannot do this. From the home directory, not the personal workspace, whose `.npmrc` would override the login:

```bash
U=$(mktemp); npm login --userconfig "$U" --auth-type=web && npm trust github astack-skills --userconfig "$U" --repo ADWilkinson/astack --file publish.yml --env npm-release --allow-publish --yes; rm -f "$U"
```

Once that release has landed, set the package's npm **Settings → Publishing access** to "Require two-factor authentication and disallow tokens".

If Actions is unavailable, stage from a clean dappnode clone with `npx -y npm@11.21.1 stage publish --access public`; it goes live only when the owner approves it with 2FA on npmjs.com. npm removes direct publishing by 2FA-bypass tokens around January 2027.
