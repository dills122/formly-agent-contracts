# LLM-Assisted Dynamic Semantics

Status: proposed research lane; no model output is contract authority

## Decision summary

Use an LLM as a bounded maintainer assistant for the Formly constructs that the
deterministic compiler cannot safely normalize. Keep the compiler, runtime
schemas, hashes, explicit declarations, and controlled scenario witnesses as
the authority boundary.

The model may explain an opaque callback, identify likely dependencies, propose
a normalized rule, suggest safe synthetic scenarios, or draft a reviewed
adapter. It may not invent option values, silently turn source text into
`declared` evidence, or make an unknown node executable.

This is deliberately a candidate-production lane:

```text
source + compiler diagnostics + bounded symbol context
  -> model candidate with exact source citations and explicit unknowns
  -> deterministic schema/parser checks
  -> maintainer review or controlled scenario verification
  -> explicit declaration/resolved artifact
  -> ordinary compiler and contract pipeline
```

## Why this split fits Formly

Formly callbacks often encode useful intent across closures, helpers, services,
RxJS pipelines, and application state. A model can navigate and summarize that
code more effectively than a fixed v0 expression parser. It still cannot prove
that one reading is complete, know runtime option values that are not present,
or establish behavior for unvisited states.

The useful role is therefore interpretation and authoring acceleration, not a
probabilistic compiler pass.

## Candidate artifact

The first experiment should emit a strict, non-portable review artifact rather
than modifying a `FormContract`:

```ts
interface DynamicSemanticsCandidate {
  readonly schemaVersion: "0.1.0";
  readonly subject: {
    readonly projectId: string;
    readonly formId: string;
    readonly nodeId: string;
    readonly property: string;
  };
  readonly proposal:
    | { readonly kind: "normalized-rule"; readonly rule: unknown }
    | { readonly kind: "declared-effect-draft"; readonly effect: unknown }
    | { readonly kind: "scenario-draft"; readonly scenario: unknown }
    | { readonly kind: "abstain"; readonly reasons: readonly string[] };
  readonly evidence: readonly {
    readonly path: string;
    readonly startLine: number;
    readonly endLine: number;
    readonly symbol?: string;
  }[];
  readonly assumptions: readonly string[];
  readonly unknowns: readonly string[];
  readonly modelProvenance: {
    readonly provider: string;
    readonly model: string;
    readonly promptVersion: string;
    readonly decodingProfile: string;
  };
}
```

The actual implementation must replace each `unknown` placeholder with a
dedicated candidate schema. The example only fixes the boundary: a candidate
has citations, assumptions, unknowns, and model provenance, and is not a
contract artifact.

## Model and workflow strategy

Start with prompting, retrieval, strict structured output, and evals. Do not
start by fine-tuning. Official OpenAI guidance distinguishes retrieval for
supplying application knowledge from fine-tuning for optimizing how a model
handles inputs or produces outputs, and recommends structured outputs/tool
calls plus evals for production workflows
([AI application development](https://developers.openai.com/tracks/ai-application-development#phase-1-foundations)).

Evaluate two interchangeable providers behind the same candidate schema:

1. A strong hosted reasoning/coding model for the quality ceiling. Current
   OpenAI guidance names `gpt-5.6-sol` for flagship capability,
   `gpt-5.6-terra` for a quality/cost balance, and `gpt-5.6-luna` for efficient
   high-volume work
   ([model guidance](https://developers.openai.com/api/docs/guides/latest-model)).
2. A local code model for source-private, offline triage. Select it only from
   benchmark results on the same corpus; parameter count or popularity is not
   evidence that it can preserve Formly-specific unknowns.

A Codex skill or other agent wrapper is valuable for repeatable context
collection, tool restrictions, prompts, checks, and review output. It is an
ergonomic workflow package, not an evidence upgrade. The same candidate must
pass the same schema and promotion gates whether it came from a skill, a local
model, or a hosted API.

Fine-tuning becomes justified only after the prompt/RAG baseline has a retained
corpus and the errors are stable behavior errors rather than missing context.
Candidate examples and reviewer corrections can then form training data, while
the unchanged holdout and adversarial suites measure whether tuning helped.

## Tool and data boundaries

The model receives only an allowlisted context bundle:

- the exact unsupported node/rule diagnostic;
- the callback source span and bounded transitive symbol slices;
- relevant Formly type/profile declarations;
- type information and deterministic static-analysis facts;
- sanitized, synthetic scenario definitions when explicitly selected.

It receives no customer values, environment secrets, unrestricted repository
search, network tool, browser session, or write tool. Source comments and string
literals are untrusted data, not agent instructions.

Dynamic option values are never guessed. The model may locate a provider,
classify its apparent dependencies, and propose a controlled synthetic scenario.
Only deterministic static data or a successfully settled scenario witness can
enumerate values.

## Promotion gates

| Candidate | Required promotion evidence | Result |
| --- | --- | --- |
| Closed rule draft | Parser-valid normalized rule plus maintainer approval or a deterministic equivalence proof for the supported subset | Explicit reviewed rule |
| Business-effect draft | Maintainer approval with exact endpoints, property, timing/readiness, and coverage statement | Declared effect |
| Scenario draft | Approved synthetic inputs, isolated execution, settling protocol, and exact basis hashes | Scenario-scoped resolved evidence |
| Option-domain guess | Never promotable | Remains unknown |
| Incomplete or conflicting analysis | No promotion | Explicit abstention/unknown |

## Evaluation plan

Build the corpus from sanitized workplace examples and retained repository
fixtures. Each case records the expected candidate class, required citations,
known unknowns, and whether abstention is mandatory.

Measure at least:

- unsafe-promotion rate (target: zero on the release gate);
- exact source-citation precision;
- required-unknown recall;
- normalized-rule structural accuracy;
- useful scenario-draft rate;
- abstention accuracy;
- reviewer edit distance and acceptance rate;
- latency, tokens, and local hardware requirements.

Include adversarial comments, misleading names, aliasing, captured mutable
state, service calls, RxJS timing, recursive helpers, and option providers that
depend on unavailable data. A model that produces more candidates but misses
unknowns is worse.

## Delivery sequence

1. `LLM-0`: freeze the candidate schema, context packer, sanitized corpus, and
   provider-neutral eval harness. Run hosted and local baselines read-only.
2. `LLM-1`: add a non-mutating `suggest-dynamic-semantics` authoring command
   that writes nothing and cannot feed generation.
3. `LLM-2`: allow an explicitly requested skill/agent workflow to draft
   reviewed source declarations or scenario files as patches; ordinary review
   and tests remain required.
4. `LLM-3`: consider fine-tuning only when retained evals show a stable,
   economically meaningful gap that prompt/RAG changes do not close.

No phase places a model call in `generate`, `check`, MCP queries, or browser
execution. Generated contracts remain reproducible without model access.
