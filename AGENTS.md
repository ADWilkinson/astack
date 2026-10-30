# Working on astack

This repo is the astack skill suite. These notes are for agents changing the suite itself, not for using it.

- One canonical copy of each skill lives in `skills/<name>/`. Claude Code and Codex read the same tree.
- Every skill folder must work on its own. Links stay inside the folder. Scripts used by more than one skill live in `shared/` and are copied in by `bun run metadata`; edit the shared copy, never a skill's copy.
- When you add, rename or remove a skill, update `catalog.json`, `.claude-plugin/plugin.json` and the README table, then run `bun run metadata`.
- Keep `SKILL.md` short and concrete: a specific description, the useful procedure, real boundaries and what "done" looks like. Put conditional material in `references/`; another skill is not a mandatory stage.
- Scripts are plain Node 22 with no dependencies, print usage with `--help` and use meaningful exit codes. `bun run smoke` runs every installed script's `--help`; prove new script behaviour with a run against a synthetic fixture or an eval, not a new unit test. `tests/scripts.test.ts` stays as the optional `bun test` suite.
- Run `bun run check` before committing. It is the CI gate: structure validation, the package-boundary tests and the packed-CLI smoke (see CONTRIBUTING.md). Run `slop-scan.mjs` on any prose you change; the repo should pass its own deslop.
- A change to how a skill behaves should be backed by a before/after eval (see `evals/`), not just a passing check. Repeat representative tasks and inspect individual regressions even when the total improves. Keep independent review for risk or judgment that deterministic checks cannot settle.
- Never commit secrets, private transcripts, customer data or anyone's personal account details. Fixtures are synthetic.
- Use Bun for repo tooling. No telemetry, install hooks, remote code or MCP registration in the package.
