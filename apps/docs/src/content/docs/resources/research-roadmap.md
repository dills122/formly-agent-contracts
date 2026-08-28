---
title: Research and roadmap
description: Navigate Formly Contract specifications, ADRs, hardening research, and planned delivery without mistaking plans for shipped APIs.
---

The repository uses specifications, ADRs, research notes, and implementation
plans for different kinds of decisions. Read their status before treating them
as product behavior.

## Start with current contracts

- [Architecture overview](https://github.com/dills122/formly-contract/blob/main/docs/architecture-overview.md)
- [Workspace configuration](https://github.com/dills122/formly-contract/blob/main/docs/workspace-configuration.md)
- [MVP specification](https://github.com/dills122/formly-contract/blob/main/docs/mvp-spec.md)
- [v0.2 real-world semantics](https://github.com/dills122/formly-contract/blob/main/docs/v0.2-real-world-semantics-spec.md)
- [v0.3 test locators](https://github.com/dills122/formly-contract/blob/main/docs/v0.3-test-locators-spec.md)
- [v0.4 E2E authoring metadata](https://github.com/dills122/formly-contract/blob/main/docs/v0.4-e2e-authoring-metadata-spec.md)

## Architecture decisions

The [ADR directory](https://github.com/dills122/formly-contract/tree/main/docs/decisions)
records accepted boundaries for first-delivery scope, controlled Formly builds,
schema and node identity, trusted scenarios, locators, distributed discovery,
package naming, and releases.

## Hardening research

The [hardening research index](https://github.com/dills122/formly-contract/tree/main/docs/research/hardening)
covers:

- agent-to-E2E context flow;
- form behavior and cross-field effects;
- factory harness and value semantics;
- Angular custom-field profile authoring; and
- form identity and source lineage.

These documents provide evidence and constraints. They do not create package
exports.

## Planned delivery direction

<div class="status-line">
  <span class="status status--planned">Planned</span>
  <span>Read-only query → typed intent → deterministic driver → parity evidence</span>
</div>

The [agent-context delivery plan](https://github.com/dills122/formly-contract/blob/main/docs/planning/v0.4-e2e-authoring/agent-context-delivery-plan.md)
describes bounded pilots and stop/go gates for future MCP and Playwright work.
Use the [product status page](../start/product-status.md) to check what is
actually available before integrating.
