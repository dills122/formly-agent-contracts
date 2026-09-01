# Dynamic semantics enrichment

Formly Contract keeps deterministic compilation as the source of truth and uses models only for bounded semantic proposals. This prevents callback interpretation from silently becoming browser authority.

## Boundary

The deterministic compiler records callback-driven behavior as dynamic or unknown. A separate enrichment run:

1. selects explicit source byte ranges with `createDynamicSemanticsContextPack`;
2. sends that bounded context to a local or hosted provider outside `generate` and `check`;
3. requires `DYNAMIC_SEMANTICS_MODEL_OUTPUT_JSON_SCHEMA` structured output;
4. binds cited spans to the trusted pack and hashes the proposal with
   `createDynamicSemanticsCandidateFromModelOutput`;
5. scores the result with `evaluateDynamicSemanticsCandidates`; and
6. presents it for human review.

Provider adapters implement `DynamicSemanticsProvider`. The separate
`runDynamicSemanticsEnrichment` helper supplies the strict output schema,
invokes the adapter, binds the returned evidence to the context pack, and
verifies that reported model provenance matches the selected adapter.

Candidates have `authority: "proposal-only"`. They cannot contain selectors or executable code, can cite only supplied evidence spans, and never alter a contract, driver, or Playwright plan automatically.

## Model selection

Start with prompt-and-schema baselines. Compare a tuned local model and an approved hosted model on the same versioned corpus, including ordinary callbacks, missing runtime emissions, and adversarial source comments. Record schema validity, unsafe-promotion rate, citation precision, unknown recall, and abstention accuracy. Fine-tuning is justified only after the baseline reveals a stable task-specific gap and enough reviewed examples exist.

The initial `DYNAMIC_SEMANTICS_LLM0_CORPUS` is deliberately provider-neutral. It evaluates supplied outputs and performs no network or model call.

## Review and promotion

Reviewers verify cited source, assumptions, and unresolved runtime behavior. If a candidate is correct and useful, encode it through the ordinary declared field-profile or cross-field-effect authoring APIs. That authored change receives deterministic validation, tests, and code review; the model candidate itself never becomes execution evidence.

The reusable Codex workflow lives at `skills/formly-dynamic-semantics/SKILL.md`; install or link that folder into the user's Codex skills directory when using it outside this repository.
