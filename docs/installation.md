# Installation

## npm

```sh
npx astack-skills@latest install --agent all              # this project
npx astack-skills@latest install --agent all --scope global
npx astack-skills@latest install --agent claude --skill ship,deslop
npx astack-skills@latest install --agent all --dry-run    # print the plan without writing
npx astack-skills@latest list
```

Project installs go to `.claude/skills/` (Claude Code) and `.agents/skills/` (Codex). `--scope global` uses the same folders in your home directory. An unchanged skill is skipped. If a selected folder differs, the command stops and writes nothing, including `--dry-run`, until you pass `--force` to replace that folder. Symlinked destinations are always refused. The installer has no network calls, background processes, telemetry or install hooks, and running it with no arguments only prints help. `list` prints the catalogue and accepts only `--json`. `--version` prints the package version.

To update, run the same command again with `@latest`. To remove, delete the skill folders it copied.

## Plugins

```text
/plugin marketplace add ADWilkinson/astack
/plugin install astack@adwilkinson
```

```sh
codex plugin marketplace add ADWilkinson/astack
codex plugin add astack@adwilkinson
```

Claude Code prefixes plugin skills, so `ship` becomes `/astack:ship`. Pick one route per client, npm or plugin, so skills aren't discovered twice. Start a new session after installing.

## skills CLI

The [skills](https://skills.sh) CLI reads this repository's `skills/` folder and installs into Claude Code, Codex, Cursor, Gemini CLI and the other agents it supports:

```sh
npx skills@latest add ADWilkinson/astack
npx skills@latest add ADWilkinson/astack --skill ship --skill deslop
```

It installs from GitHub `main`, not the npm release, so use one route per client.

## Copying by hand

Copy any folder from `skills/` into your client's skills directory. Keep each folder whole: its `references/` and `scripts/` travel with it.

## What the tools need

| Script | Needs |
| --- | --- |
| `shoot.mjs` | Node 22+ and a local Chrome or Chromium (found automatically; override with `CHROME_PATH`) |
| `pr-state.mjs` | Node 22+ and an authenticated GitHub CLI (`gh`) |
| `verify-live.mjs`, `page-audit.mjs` | Node 22+ and network access to the URL |
| `slop-scan.mjs`, `iso.mjs` | Node 22+ |

Each prints usage with `--help`. Run them from your project root, for example `node .claude/skills/ship/scripts/pr-state.mjs`.

## What the skills need from you

They use whatever your agent already has: the repo, a shell, a browser, Slack, analytics, your hosting CLI. astack doesn't provide those or their credentials. When something is missing, the skill says what it couldn't check instead of pretending.

`oneshot` only runs when you ask for it by name, because it merges and deploys. Everything else that has an outward effect (posting, messaging, production deploys, spending) waits for you to say so for that specific thing.
