# Findings: v0.2 Real-World Form Semantics

- Formly 6.1.8 supports both `expressions` and the deprecated
  `expressionProperties`, plus legacy `hideExpression`.
- Function callbacks are valid expression sources, so an opacity diagnostic is
  too coarse when the target property itself is known.
- Keyless groups inherit a model path for their children, but that inherited
  path is not the group's semantic key.
- Template-only fields are display structure and should not imply an
  interactive E2E control.
- Empty `options` cannot distinguish a deliberately empty choice list from an
  unresolved callback or Observable provider.
- Formly's public `FormlyFormBuilder.build` API can normalize a fresh field
  tree in the existing component-free Angular TestBed fixture.

