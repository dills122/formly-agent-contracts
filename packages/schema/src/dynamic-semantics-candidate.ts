import { createHash } from 'node:crypto';

import { assertCanonicalJsonShape, canonicalStringify, compareText } from './canonical-json.js';

export const DYNAMIC_SEMANTICS_CANDIDATE_SCHEMA_VERSION = '0.1.0' as const;

/** Strict provider-neutral schema for model output before the trusted caller adds contentHash. */
export const DYNAMIC_SEMANTICS_MODEL_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'authority', 'candidateId', 'formId', 'model', 'evidenceSpans', 'proposals', 'assumptions', 'unknowns'],
  properties: {
    schemaVersion: { const: DYNAMIC_SEMANTICS_CANDIDATE_SCHEMA_VERSION },
    authority: { const: 'proposal-only' },
    candidateId: { type: 'string' },
    formId: { type: 'string' },
    model: {
      type: 'object', additionalProperties: false,
      required: ['provider', 'model', 'promptVersion'],
      properties: { provider: { type: 'string' }, model: { type: 'string' }, promptVersion: { type: 'string' } },
    },
    evidenceSpans: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'sourceId', 'workspaceRelativePath', 'startOffset', 'endOffset', 'sha256'],
        properties: {
          id: { type: 'string' }, sourceId: { type: 'string' }, workspaceRelativePath: { type: 'string' },
          startOffset: { type: 'integer', minimum: 0 }, endOffset: { type: 'integer', minimum: 1 },
          sha256: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
        },
      },
    },
    proposals: {
      type: 'array', items: { anyOf: [
        {
          type: 'object', additionalProperties: false,
          required: ['id', 'kind', 'targetNodeId', 'targetProperty', 'combinator', 'clauses', 'evidenceSpanIds', 'confidence', 'assumptions', 'unknowns'],
          properties: {
            id: { type: 'string' }, kind: { const: 'condition' }, targetNodeId: { type: 'string' },
            targetProperty: { enum: ['enabled', 'required', 'visibility'] }, combinator: { enum: ['all', 'any'] },
            clauses: { type: 'array', minItems: 1, items: { anyOf: [
              {
                type: 'object', additionalProperties: false, required: ['sourceNodeId', 'operator'],
                properties: { sourceNodeId: { type: 'string' }, operator: { enum: ['absent', 'present'] } },
              },
              {
                type: 'object', additionalProperties: false, required: ['sourceNodeId', 'operator', 'value'],
                properties: {
                  sourceNodeId: { type: 'string' }, operator: { enum: ['equals', 'includes', 'not-equals'] },
                  value: { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }] },
                },
              },
            ] } },
            evidenceSpanIds: { type: 'array', items: { type: 'string' } }, confidence: { enum: ['low', 'medium', 'high'] },
            assumptions: { type: 'array', items: { type: 'string' } }, unknowns: { type: 'array', items: { type: 'string' } },
          },
        },
        {
          type: 'object', additionalProperties: false,
          required: ['id', 'kind', 'targetNodeId', 'values', 'evidenceSpanIds', 'confidence', 'assumptions', 'unknowns'],
          properties: {
            id: { type: 'string' }, kind: { const: 'option-domain' }, targetNodeId: { type: 'string' },
            values: { type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['value', 'label'],
              properties: { value: { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }] }, label: { type: 'string' } },
            } },
            evidenceSpanIds: { type: 'array', items: { type: 'string' } }, confidence: { enum: ['low', 'medium', 'high'] },
            assumptions: { type: 'array', items: { type: 'string' } }, unknowns: { type: 'array', items: { type: 'string' } },
          },
        },
        {
          type: 'object', additionalProperties: false,
          required: ['id', 'kind', 'triggerNodeId', 'triggerEvent', 'targetNodeId', 'targetProperty', 'effectKind', 'timing', 'conditionProposalId', 'evidenceSpanIds', 'confidence', 'assumptions', 'unknowns'],
          properties: {
            id: { type: 'string' }, kind: { const: 'effect' }, triggerNodeId: { type: 'string' }, triggerEvent: { enum: ['selectionChanged', 'valueChanged'] },
            targetNodeId: { type: 'string' }, targetProperty: { enum: ['enabled', 'options', 'required', 'value', 'visibility'] },
            effectKind: { enum: ['clears', 'controls-state', 'filters', 'loads', 'toggles'] }, timing: { enum: ['async', 'sync', 'unknown'] },
            conditionProposalId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            evidenceSpanIds: { type: 'array', items: { type: 'string' } }, confidence: { enum: ['low', 'medium', 'high'] },
            assumptions: { type: 'array', items: { type: 'string' } }, unknowns: { type: 'array', items: { type: 'string' } },
          },
        },
      ] },
    },
    assumptions: { type: 'array', items: { type: 'string' } },
    unknowns: { type: 'array', items: { type: 'string' } },
  },
} as const;

export type DynamicSemanticsScalar = string | number | boolean | null;

export interface DynamicSemanticsEvidenceSpan {
  readonly id: string;
  readonly sourceId: string;
  readonly workspaceRelativePath: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly sha256: string;
}

export interface DynamicSemanticsConditionClause {
  readonly sourceNodeId: string;
  readonly operator: 'absent' | 'equals' | 'includes' | 'not-equals' | 'present';
  readonly value?: DynamicSemanticsScalar;
}

interface DynamicSemanticsProposalBase {
  readonly id: string;
  readonly evidenceSpanIds: readonly string[];
  readonly confidence: 'low' | 'medium' | 'high';
  readonly assumptions: readonly string[];
  readonly unknowns: readonly string[];
}

export interface DynamicSemanticsConditionProposal extends DynamicSemanticsProposalBase {
  readonly kind: 'condition';
  readonly targetNodeId: string;
  readonly targetProperty: 'enabled' | 'required' | 'visibility';
  readonly combinator: 'all' | 'any';
  readonly clauses: readonly DynamicSemanticsConditionClause[];
}

export interface DynamicSemanticsOptionDomainProposal extends DynamicSemanticsProposalBase {
  readonly kind: 'option-domain';
  readonly targetNodeId: string;
  readonly values: readonly {
    readonly value: DynamicSemanticsScalar;
    readonly label: string;
  }[];
}

export interface DynamicSemanticsEffectProposal extends DynamicSemanticsProposalBase {
  readonly kind: 'effect';
  readonly triggerNodeId: string;
  readonly triggerEvent: 'selectionChanged' | 'valueChanged';
  readonly targetNodeId: string;
  readonly targetProperty: 'enabled' | 'options' | 'required' | 'value' | 'visibility';
  readonly effectKind: 'clears' | 'controls-state' | 'filters' | 'loads' | 'toggles';
  readonly timing: 'async' | 'sync' | 'unknown';
  readonly conditionProposalId: string | null;
}

export type DynamicSemanticsProposal =
  | DynamicSemanticsConditionProposal
  | DynamicSemanticsOptionDomainProposal
  | DynamicSemanticsEffectProposal;

export interface DynamicSemanticsCandidateDraft {
  readonly schemaVersion: typeof DYNAMIC_SEMANTICS_CANDIDATE_SCHEMA_VERSION;
  readonly authority: 'proposal-only';
  readonly candidateId: string;
  readonly formId: string;
  readonly model: {
    readonly provider: string;
    readonly model: string;
    readonly promptVersion: string;
  };
  readonly evidenceSpans: readonly DynamicSemanticsEvidenceSpan[];
  readonly proposals: readonly DynamicSemanticsProposal[];
  readonly assumptions: readonly string[];
  readonly unknowns: readonly string[];
}

export interface DynamicSemanticsCandidate extends DynamicSemanticsCandidateDraft {
  readonly contentHash: string;
}

type DataRecord = Readonly<Record<string, unknown>>;
const HASH = /^sha256:[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const ROOT = new Set(['schemaVersion', 'authority', 'candidateId', 'formId', 'model', 'evidenceSpans', 'proposals', 'assumptions', 'unknowns']);
const WITH_HASH = new Set([...ROOT, 'contentHash']);
const MODEL = new Set(['provider', 'model', 'promptVersion']);
const SPAN = new Set(['id', 'sourceId', 'workspaceRelativePath', 'startOffset', 'endOffset', 'sha256']);
const COMMON = ['id', 'kind', 'evidenceSpanIds', 'confidence', 'assumptions', 'unknowns'] as const;
const CONDITION = new Set([...COMMON, 'targetNodeId', 'targetProperty', 'combinator', 'clauses']);
const DOMAIN = new Set([...COMMON, 'targetNodeId', 'values']);
const EFFECT = new Set([...COMMON, 'triggerNodeId', 'triggerEvent', 'targetNodeId', 'targetProperty', 'effectKind', 'timing', 'conditionProposalId']);
const CLAUSE = new Set(['sourceNodeId', 'operator', 'value']);
const OPTION = new Set(['value', 'label']);

function fail(path: string, message: string): never { throw new TypeError(`${path}: ${message}`); }
function object(input: unknown, path: string, keys: ReadonlySet<string>): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) fail(path, 'must be an object.');
  for (const key of Object.keys(input)) if (!keys.has(key)) fail(`${path}.${key}`, 'is not supported.');
  return input as DataRecord;
}
function required(value: DataRecord, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'is required.');
  return value[key];
}
function text(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length === 0 || input.length > 1000 || input.includes('\0')) fail(path, 'must be bounded non-empty text.');
  return input;
}
function identifier(input: unknown, path: string): string {
  const value = text(input, path);
  if (!ID.test(value)) fail(path, 'must be a stable identifier.');
  return value;
}
function stringList(input: unknown, path: string, identifiers = false): readonly string[] {
  if (!Array.isArray(input) || input.length > 100) fail(path, 'must be a bounded array.');
  const result = input.map((item, index) => identifiers ? identifier(item, `${path}[${index}]`) : text(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) fail(path, 'must not contain duplicates.');
  return result;
}
function scalar(input: unknown, path: string): DynamicSemanticsScalar {
  if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  return fail(path, 'must be a JSON scalar.');
}
function safePath(input: unknown, path: string): string {
  const value = text(input, path).replaceAll('\\', '/');
  if (value.startsWith('/') || value.split('/').some((part) => part === '' || part === '.' || part === '..')) fail(path, 'must be workspace-relative.');
  return value;
}
function boundedInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) < 0) fail(path, 'must be a non-negative safe integer.');
  return input as number;
}

function parseProposal(input: unknown, path: string): DynamicSemanticsProposal {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) fail(path, 'must be an object.');
  const kind = (input as DataRecord).kind;
  const keys = kind === 'condition' ? CONDITION : kind === 'option-domain' ? DOMAIN : kind === 'effect' ? EFFECT : fail(`${path}.kind`, 'is unsupported.');
  const value = object(input, path, keys);
  const base = {
    id: identifier(required(value, 'id', path), `${path}.id`),
    evidenceSpanIds: stringList(required(value, 'evidenceSpanIds', path), `${path}.evidenceSpanIds`, true),
    confidence: required(value, 'confidence', path),
    assumptions: stringList(required(value, 'assumptions', path), `${path}.assumptions`),
    unknowns: stringList(required(value, 'unknowns', path), `${path}.unknowns`),
  };
  if (!['low', 'medium', 'high'].includes(base.confidence as string)) fail(`${path}.confidence`, 'is unsupported.');
  if (kind === 'condition') {
    const targetProperty = required(value, 'targetProperty', path);
    if (!['enabled', 'required', 'visibility'].includes(targetProperty as string)) fail(`${path}.targetProperty`, 'is unsupported.');
    const combinator = required(value, 'combinator', path);
    if (combinator !== 'all' && combinator !== 'any') fail(`${path}.combinator`, 'is unsupported.');
    const rawClauses = required(value, 'clauses', path);
    if (!Array.isArray(rawClauses) || rawClauses.length === 0 || rawClauses.length > 20) fail(`${path}.clauses`, 'must be a non-empty bounded array.');
    const clauses = rawClauses.map((entry, index) => {
      const clausePath = `${path}.clauses[${index}]`;
      const clause = object(entry, clausePath, CLAUSE);
      const operator = required(clause, 'operator', clausePath);
      if (!['absent', 'equals', 'includes', 'not-equals', 'present'].includes(operator as string)) fail(`${clausePath}.operator`, 'is unsupported.');
      const requiresValue = operator === 'equals' || operator === 'includes' || operator === 'not-equals';
      if (requiresValue !== Object.hasOwn(clause, 'value')) fail(`${clausePath}.value`, requiresValue ? 'is required.' : 'is not supported for this operator.');
      return {
        sourceNodeId: identifier(required(clause, 'sourceNodeId', clausePath), `${clausePath}.sourceNodeId`),
        operator: operator as DynamicSemanticsConditionClause['operator'],
        ...(requiresValue ? { value: scalar(clause.value, `${clausePath}.value`) } : {}),
      };
    });
    return { ...base, kind, targetNodeId: identifier(required(value, 'targetNodeId', path), `${path}.targetNodeId`), targetProperty: targetProperty as DynamicSemanticsConditionProposal['targetProperty'], combinator, clauses } as DynamicSemanticsConditionProposal;
  }
  if (kind === 'option-domain') {
    const rawValues = required(value, 'values', path);
    if (!Array.isArray(rawValues) || rawValues.length > 200) fail(`${path}.values`, 'must be a bounded array.');
    const values = rawValues.map((entry, index) => {
      const optionPath = `${path}.values[${index}]`;
      const option = object(entry, optionPath, OPTION);
      return { value: scalar(required(option, 'value', optionPath), `${optionPath}.value`), label: text(required(option, 'label', optionPath), `${optionPath}.label`) };
    });
    return { ...base, kind, targetNodeId: identifier(required(value, 'targetNodeId', path), `${path}.targetNodeId`), values } as DynamicSemanticsOptionDomainProposal;
  }
  const triggerEvent = required(value, 'triggerEvent', path);
  const targetProperty = required(value, 'targetProperty', path);
  const effectKind = required(value, 'effectKind', path);
  const timing = required(value, 'timing', path);
  if (!['selectionChanged', 'valueChanged'].includes(triggerEvent as string)) fail(`${path}.triggerEvent`, 'is unsupported.');
  if (!['enabled', 'options', 'required', 'value', 'visibility'].includes(targetProperty as string)) fail(`${path}.targetProperty`, 'is unsupported.');
  if (!['clears', 'controls-state', 'filters', 'loads', 'toggles'].includes(effectKind as string)) fail(`${path}.effectKind`, 'is unsupported.');
  if (!['async', 'sync', 'unknown'].includes(timing as string)) fail(`${path}.timing`, 'is unsupported.');
  const rawConditionProposalId = required(value, 'conditionProposalId', path);
  const conditionProposalId = rawConditionProposalId === null ? null : identifier(rawConditionProposalId, `${path}.conditionProposalId`);
  return { ...base, kind, triggerNodeId: identifier(required(value, 'triggerNodeId', path), `${path}.triggerNodeId`), triggerEvent, targetNodeId: identifier(required(value, 'targetNodeId', path), `${path}.targetNodeId`), targetProperty, effectKind, timing, conditionProposalId } as DynamicSemanticsEffectProposal;
}

function parseDraft(input: unknown): DynamicSemanticsCandidateDraft {
  assertCanonicalJsonShape(input, 'candidate');
  const value = object(input, 'candidate', ROOT);
  if (required(value, 'schemaVersion', 'candidate') !== DYNAMIC_SEMANTICS_CANDIDATE_SCHEMA_VERSION) fail('candidate.schemaVersion', 'is unsupported.');
  if (required(value, 'authority', 'candidate') !== 'proposal-only') fail('candidate.authority', 'must be proposal-only.');
  const model = object(required(value, 'model', 'candidate'), 'candidate.model', MODEL);
  const rawSpans = required(value, 'evidenceSpans', 'candidate');
  if (!Array.isArray(rawSpans) || rawSpans.length > 100) fail('candidate.evidenceSpans', 'must be a bounded array.');
  const evidenceSpans = rawSpans.map((entry, index) => {
    const path = `candidate.evidenceSpans[${index}]`;
    const span = object(entry, path, SPAN);
    const startOffset = boundedInteger(required(span, 'startOffset', path), `${path}.startOffset`);
    const endOffset = boundedInteger(required(span, 'endOffset', path), `${path}.endOffset`);
    const sha256 = text(required(span, 'sha256', path), `${path}.sha256`);
    if (endOffset <= startOffset) fail(`${path}.endOffset`, 'must be greater than startOffset.');
    if (!HASH.test(sha256)) fail(`${path}.sha256`, 'must be a sha256 digest.');
    return { id: identifier(required(span, 'id', path), `${path}.id`), sourceId: identifier(required(span, 'sourceId', path), `${path}.sourceId`), workspaceRelativePath: safePath(required(span, 'workspaceRelativePath', path), `${path}.workspaceRelativePath`), startOffset, endOffset, sha256 };
  });
  const spanIds = new Set(evidenceSpans.map(({ id }) => id));
  if (spanIds.size !== evidenceSpans.length) fail('candidate.evidenceSpans', 'must not contain duplicate IDs.');
  const rawProposals = required(value, 'proposals', 'candidate');
  if (!Array.isArray(rawProposals) || rawProposals.length > 100) fail('candidate.proposals', 'must be a bounded array.');
  const proposals = rawProposals.map((entry, index) => parseProposal(entry, `candidate.proposals[${index}]`));
  if (new Set(proposals.map(({ id }) => id)).size !== proposals.length) fail('candidate.proposals', 'must not contain duplicate IDs.');
  for (const proposal of proposals) for (const id of proposal.evidenceSpanIds) if (!spanIds.has(id)) fail(`candidate.proposals.${proposal.id}.evidenceSpanIds`, `references unknown span ${JSON.stringify(id)}.`);
  const conditionIds = new Set(proposals.filter((item): item is DynamicSemanticsConditionProposal => item.kind === 'condition').map(({ id }) => id));
  for (const proposal of proposals) if (proposal.kind === 'effect' && proposal.conditionProposalId !== null && !conditionIds.has(proposal.conditionProposalId)) fail(`candidate.proposals.${proposal.id}.conditionProposalId`, 'must reference a condition proposal.');
  return { schemaVersion: DYNAMIC_SEMANTICS_CANDIDATE_SCHEMA_VERSION, authority: 'proposal-only', candidateId: identifier(required(value, 'candidateId', 'candidate'), 'candidate.candidateId'), formId: identifier(required(value, 'formId', 'candidate'), 'candidate.formId'), model: { provider: identifier(required(model, 'provider', 'candidate.model'), 'candidate.model.provider'), model: text(required(model, 'model', 'candidate.model'), 'candidate.model.model'), promptVersion: identifier(required(model, 'promptVersion', 'candidate.model'), 'candidate.model.promptVersion') }, evidenceSpans, proposals, assumptions: stringList(required(value, 'assumptions', 'candidate'), 'candidate.assumptions'), unknowns: stringList(required(value, 'unknowns', 'candidate'), 'candidate.unknowns') };
}

function canonicalDraft(input: DynamicSemanticsCandidateDraft): string {
  const value = parseDraft(input);
  return canonicalStringify({ ...value, evidenceSpans: [...value.evidenceSpans].sort((a, b) => compareText(a.id, b.id)), proposals: [...value.proposals].sort((a, b) => compareText(a.id, b.id)) });
}

export function computeDynamicSemanticsCandidateHash(input: DynamicSemanticsCandidateDraft): string {
  return `sha256:${createHash('sha256').update(canonicalDraft(input)).digest('hex')}`;
}

export function createDynamicSemanticsCandidate(input: DynamicSemanticsCandidateDraft): DynamicSemanticsCandidate {
  const draft = JSON.parse(canonicalDraft(input)) as DynamicSemanticsCandidateDraft;
  return { ...draft, contentHash: computeDynamicSemanticsCandidateHash(draft) };
}

export function parseDynamicSemanticsCandidate(input: unknown): DynamicSemanticsCandidate {
  assertCanonicalJsonShape(input, 'candidate');
  const value = object(input, 'candidate', WITH_HASH);
  const draft = parseDraft(Object.fromEntries([...ROOT].map((key) => [key, required(value, key, 'candidate')])));
  const contentHash = required(value, 'contentHash', 'candidate');
  if (typeof contentHash !== 'string' || !HASH.test(contentHash) || contentHash !== computeDynamicSemanticsCandidateHash(draft)) fail('candidate.contentHash', 'does not match canonical content.');
  return { ...draft, contentHash };
}

export function canonicalizeDynamicSemanticsCandidate(input: DynamicSemanticsCandidate): string {
  return canonicalStringify(parseDynamicSemanticsCandidate(input));
}
