# Contributing

Issues and PRs are welcome.

The best issue is a real session where a skill made the agent do the wrong thing, or failed to stop it doing the wrong thing. Include the skill, what you asked, what happened, what you expected, and your client and model. Strip anything private first.

For a PR:

1. Read [AGENTS.md](AGENTS.md) and [SCOPE.md](SCOPE.md).
2. Make the change in the skill's own folder, or in `shared/` for a shared script.
3. Run `bun run metadata` and `bun run check`.
4. If you changed how a skill behaves, say how you checked it actually behaves better: an eval run, a before and after, or a transcript.

Keep PRs to one idea. New skills need a real use case that a capable model gets wrong without them; see [SCOPE.md](SCOPE.md).
