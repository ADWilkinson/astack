# Execution policy

The main agent keeps the task context and owns the result. It reads a skill when the next step needs that procedure. The delivery stages describe outcomes to prove; they do not require a sequence of model handoffs or loading every supporting skill.

Another context is useful for independent parallel work, reading that would crowd out the main task, or judgment that benefits from an independent reviewer. Keep ownership explicit and return source evidence and limits. Required repository checks, review rules and release proof still apply.

Skills carry procedure. Executable helpers validate the inputs and outcomes they can observe: PR state on the current head, serving revisions, rendered fonts and copy. Prompts cannot replace access control, grant authority or establish an unobserved outcome. Where the client supports tool search, discover the relevant tools rather than pasting provider manuals into a skill.

The approach follows [Anthropic's discussion of folding subagents into the main loop](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop). The useful test is whether repeated task outcomes hold up. Preserve a separate agent when it improves those outcomes; a simpler diagram is not evidence.

Claude Code and Codex use the same skill sources. Client-specific metadata controls invocation, not a different execution policy. `oneshot` remains explicitly invoked, and an explicit user target and existing authority govern delivery.

Before changing this policy, run the [comparison procedure](../evals/README.md) and inspect task flips as well as totals. Do not delete a skill merely because a small transcript sample did not show it being loaded.
