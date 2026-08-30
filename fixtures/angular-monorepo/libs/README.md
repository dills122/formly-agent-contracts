# Angular CLI Fixture Libraries

These libraries demonstrate separate ownership boundaries inside the
[maintained Angular CLI workspace fixture](../README.md).

| Library | Browser responsibility | Contract responsibility |
| --- | --- | --- |
| `formly-kit` | base Formly module and shared type registration | configuration-only project boundary |
| `forms-kit` | reusable fragments, forms, and custom fields | owns the reusable form source and reviewed profiles |
| `feature-lib` | composes reusable forms into a rendered feature | owns feature forms, source lineage, and declared effects |

Each library keeps its normal Angular barrel in `src/index.ts`. Where a library
owns contract data, `src/forms.ts` exposes browser-safe factories and
`src/contracts.ts` exposes Node-loaded source descriptors. This split prevents
the trusted config loader from booting Angular or pulling workspace tooling into
the application bundle.

The adjacent `formly-contracts.project.ts` records ownership even for a
configuration-only library. Return to the fixture [README](../README.md) for the
full dependency flow, commands, corpus, and golden-artifact behavior.
