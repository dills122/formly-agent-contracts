# Project Delivery Process

## Goal

Keep delivery fast, visible, and reversible while protecting the small public
contract that future versions will build upon.

## Sources of Truth

| Question | Source |
| --- | --- |
| What are we building now? | `docs/mvp-spec.md` |
| In what order will we build it? | `docs/implementation-plan.md` |
| What are we doing and what happened? | `docs/planning/mvp-2026-08-26/` |
| Why did an architectural boundary change? | `docs/decisions/` |
| How does the system fit together long-term? | `docs/architecture-overview.md` |
| What should a new user run? | `README.md` |

The MVP spec wins if a backlog item or long-term architecture idea conflicts
with tomorrow's scope.

## Work Loop

For each task:

1. Re-read the task acceptance criteria and only the relevant contract/source
   files.
2. Add or identify the failing test for the behavior.
3. Make the smallest implementation change that passes it.
4. Run the focused test, then the affected package checks.
5. Update the progress log and task checkbox.
6. Commit a coherent, reviewable change on a feature branch.

Only one implementation task should be in progress at a time. Research can be
noted ahead of implementation, but a downstream package does not start before
its contract dependency is decided.

## Checkpoints and Scope Control

Each checkpoint in the implementation plan is a real stop/go decision. At a
checkpoint:

- run the listed verification commands;
- compare the output with the MVP success criteria;
- capture failures and decisions in Markdown;
- cut optional work before moving the shipping gate; and
- update the README if the user-visible workflow changed.

New ideas go to the post-MVP list. They enter the active plan only if the MVP
cannot satisfy an existing success criterion without them.

## Decision Records

Add a short numbered file under `docs/decisions/` when changing:

- the contract or extraction boundary;
- the supported Angular/Formly pairing;
- runtime dependencies of public packages;
- stable node identity or serialization rules; or
- the separation between parser, CLI, and MCP code.

Each record states context, decision, consequences, and evidence. A superseding
record replaces a decision; old records remain for history.

## GitHub Issues

Use GitHub issues after a behavior has been reproduced or follow-up work has
been explicitly accepted. Do not duplicate the active Markdown task plan as a
large issue backlog.

Useful issue labels after repository publication:

- `bug`: reproducible deviation from documented behavior
- `compatibility`: Angular, Formly, Node, or TypeScript pairing
- `contract`: proposed public schema or identity change
- `enhancement`: accepted post-MVP capability
- `documentation`: user-facing setup or explanation gap

## Definition of Done

A task is done only when:

- its acceptance criteria are met;
- its verification evidence is recorded;
- public or setup behavior is documented;
- no private data or secret was added; and
- remaining limitations are explicit rather than silently deferred.

The MVP is ready to publish when Checkpoint C and the final release checkpoint
in `docs/implementation-plan.md` are green. The experimental MCP inspector is
not part of that definition.
