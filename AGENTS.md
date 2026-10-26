# Working on astack

This repo is the astack skill suite. These notes are for agents changing the suite itself, not for using it.

- One canonical copy of each skill lives in `skills/<name>/`. Claude Code and Codex read the same tree.
- Every skill folder must work on its own. Links stay inside the folder. Scripts used by more than one skill live in `shared/` and are copied in by `bun run metadata`; edit the shared copy, never a skill's copy.
- When you add, rename or remove a skill, update `catalog.json`, `.claude-plugin/plugin.json` and the README table, then run `bun run metadata`.
- Keep `SKILL.md` short and concrete: a trigger-rich description, numbered steps, named things to refuse, and what "done" looks like. Put long material in `references/`.
- Scripts are plain Node 22 with no dependencies, print usage with `--help`, use meaningful exit codes, and come with tests in `tests/scripts.test.ts`.
- Run `bun run check` before committing. Run `slop-scan.mjs` on any prose you change; the repo should pass its own deslop.
- A change to how a skill behaves should be backed by an eval run (see `evals/`), not just a passing check.
- Never commit secrets, private transcripts, customer data or anyone's personal account details. Fixtures are synthetic.
- Use Bun for repo tooling. No telemetry, install hooks, remote code or MCP registration in the package.
