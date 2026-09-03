---
title: Evaluate the project
description: Decide whether Formly Contract fits your Angular/Formly integration before changing application code.
---

Formly Contract turns selected Angular Formly field trees into deterministic,
versioned JSON. The output gives test authors and coding agents a semantic view
of a form without asking them to inspect live Formly objects or invent DOM
selectors.

<div class="status-line">
  <span class="status status--current">Current product</span>
  <span>Parser, contract, workspace runner, Angular JIT host, and CLIs</span>
</div>

## The shortest honest evaluation

1. Confirm the [supported toolchain](./installation/#supported-baseline).
2. Read the [product status](./product-status/) before assuming an MCP or
   Playwright generator exists.
3. Run the maintained demo from the repository root:

   ```sh
   pnpm install --frozen-lockfile
   pnpm demo
   ```

4. Follow [one maintained Formly form end to end](./end-to-end/), from its
   Angular code through repeatable contract generation and inspection.

The strongest tested pairing is Angular `20.3.29` with Formly `6.1.8`. The full
Angular runtime host supports Angular 20.x and Formly 6.x; other minor or patch
combinations do not carry the same compatibility evidence.

## What a contract answers

A generated contract can describe:

- ordered controls, groups, display content, and repeatable templates;
- model paths, Formly types, labels, constraints, and choices;
- declared or scenario-resolved visibility, required, readonly, and disabled
  state;
- exact or application-derived test-locator candidates;
- reviewed interaction semantics for custom field types; and
- diagnostics and explicit unknowns where safe projection stops.

It does not prove that a declared effect happened in a live browser, discover
arbitrary exports automatically, or supply a production Playwright driver.

:::note[Canonical source]
The [repository README](https://github.com/dills122/formly-contract/blob/main/README.md)
defines the public product summary. The
[workplace pilot guide](https://github.com/dills122/formly-contract/blob/main/docs/workplace-pilot.md)
is the canonical private-repository evaluation path.
:::

## Choose your next path

- First integration: [choose a GitHub pilot RC or local install](./installation/).
- Real monorepo wiring: [follow one form end to end](./end-to-end/).
- Programmatic integration: [choose a public API entry point](../reference/api/).
- Architecture review: [understand the evidence model](../concepts/architecture/).
- Current versus future: [read the capability matrix](./product-status/).
