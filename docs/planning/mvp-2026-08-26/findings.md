# Findings: August 26 Parser MVP

## Sources

- Angular version compatibility: <https://angular.dev/reference/versions>
- Formly package guidance: <https://www.npmjs.com/package/@ngx-formly/core>
- Formly 6.1.8 metadata: <https://registry.npmjs.org/@ngx-formly%2fcore/6.1.8>
- Repository architecture: `docs/architecture-overview.md`
- Previous broad roadmap: replaced by `docs/implementation-plan.md`; future
  capabilities remain in the architecture overview and post-MVP list.

## Notes

- Angular 20's current LTS package tag is 20.3.29 as of 2026-08-25.
- The current development environment runs Node 22.22.1 and pnpm 10.23.0.
- The latest Formly 6.1 patch is 6.1.8.
- Formly 6.1.8 declares RxJS `^6.5.3 || ^7.0.0` and Angular Forms
  `>=13.2.0` as peer dependencies.
- Formly's current version table points Angular 18+ users to Formly 7. This does
  not contradict the v6 peer range, but it makes the requested pair a practical
  compatibility risk to test immediately.
- The existing architecture is intentionally broader than the tomorrow MVP.
  Parser output remains compatible with that direction if evidence and unknowns
  stay explicit.
- No Git remote is configured yet.

## Open Questions

- Can the useful post-build Formly tree be obtained in a small Angular test
  harness without mounting a full form component?
- If not, which properties can be safely extracted from declared
  `FormlyFieldConfig[]` while clearly distinguishing them from runtime-resolved
  state?
- Which GitHub owner and initial visibility should be used?
- Which open-source license should be applied? MIT is the recommended default.
