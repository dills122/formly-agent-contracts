# Nx Fixture Libraries

These libraries form the project graph for the
[maintained Nx workspace fixture](../README.md):

```text
feature-lib -> forms-kit -> formly-kit
```

| Library | Browser responsibility | Contract responsibility |
| --- | --- | --- |
| `formly-kit` | native Formly type components and base registration | configuration-only ownership boundary |
| `forms-kit` | shared organization/contact forms and interaction components | owns reusable sources and the reviewed type/wrapper registry |
| `feature-lib` | renders the microgrid deployment workflow | owns eight workflow forms, seventeen cases, source lineage, and effects |

Every directory is also a real Nx project with a `project.json`. Its adjacent
`formly-contracts.project.ts` records Formly Contract ownership; these are
related but separate graphs. A project may participate without owning a source,
and a consuming library needs a discovered contract project boundary for exact
source-usage ownership.

Normal Angular exports live under `src/index.ts`. Contract entrypoints are kept
Node-safe in `src/contracts.ts`, while browser-safe factories may be shared
through `src/forms.ts`. Return to the fixture [README](../README.md) for the
complete corpus, commands, cache behavior, and support boundaries.
