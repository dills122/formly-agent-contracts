import { createHash } from 'node:crypto';

import { assertCanonicalJsonShape, canonicalStringify, compareText } from './canonical-json.js';

export const ANGULAR_HOST_COMPATIBILITY_SCHEMA_VERSION = '1.0.0' as const;

export const ANGULAR_HOST_COMPATIBILITY_CASE_IDS = [
  'browser-http-interception',
  'browser-websocket-interception',
  'external-resources',
  'feature-scope-isolation',
  'model-sink',
  'ngmodule-composition',
  'opaque-resource-refusal',
  'partial-library-linking',
  'popup-association',
  'standalone-composition',
  'teardown',
] as const;

export type AngularHostCompatibilityCaseId =
  (typeof ANGULAR_HOST_COMPATIBILITY_CASE_IDS)[number];

export interface AngularHostCompatibilityEnvironment {
  readonly angularVersion: string;
  readonly formlyVersion: string;
  readonly nodeVersion: string;
  readonly platform: string;
  readonly architecture: string;
  readonly target: 'angular-cli' | 'nx-application';
}

export interface AngularHostCompatibilityDiagnostic {
  readonly code: `${AngularHostCompatibilityCaseId}-failed`;
  readonly message: string;
}

export interface AngularHostCompatibilityCase {
  readonly id: AngularHostCompatibilityCaseId;
  readonly status: 'pass' | 'fail';
  readonly diagnostics: readonly AngularHostCompatibilityDiagnostic[];
}

export interface AngularHostCompatibilityResultDraft {
  readonly schemaVersion: typeof ANGULAR_HOST_COMPATIBILITY_SCHEMA_VERSION;
  readonly environment: AngularHostCompatibilityEnvironment;
  readonly status: 'pass' | 'fail';
  readonly cases: readonly AngularHostCompatibilityCase[];
}

export interface AngularHostCompatibilityResult
  extends AngularHostCompatibilityResultDraft {
  readonly contentHash: string;
}

type DataRecord = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?$/u;
const TOKEN_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/u;
const RESULT_KEYS = new Set(['schemaVersion', 'environment', 'status', 'cases', 'contentHash']);
const DRAFT_KEYS = new Set(['schemaVersion', 'environment', 'status', 'cases']);
const ENVIRONMENT_KEYS = new Set([
  'angularVersion',
  'formlyVersion',
  'nodeVersion',
  'platform',
  'architecture',
  'target',
]);
const CASE_KEYS = new Set(['id', 'status', 'diagnostics']);
const DIAGNOSTIC_KEYS = new Set(['code', 'message']);

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function record(input: unknown, path: string, keys: ReadonlySet<string>): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  for (const key of Object.keys(input)) {
    if (!keys.has(key)) fail(`${path}.${key}`, 'is not supported.');
  }
  return input as DataRecord;
}

function required(value: DataRecord, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'is required.');
  return value[key];
}

function stringValue(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length === 0) fail(path, 'must be a non-empty string.');
  return input;
}

function version(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!VERSION_PATTERN.test(value)) fail(path, 'must be a stable version.');
  return value;
}

function token(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!TOKEN_PATTERN.test(value)) fail(path, 'must be a portable lowercase token.');
  return value;
}

function parseEnvironment(input: unknown): AngularHostCompatibilityEnvironment {
  const path = 'compatibility.environment';
  const value = record(input, path, ENVIRONMENT_KEYS);
  const target = required(value, 'target', path);
  if (target !== 'angular-cli' && target !== 'nx-application') {
    fail(`${path}.target`, 'is unsupported.');
  }
  return {
    angularVersion: version(required(value, 'angularVersion', path), `${path}.angularVersion`),
    formlyVersion: version(required(value, 'formlyVersion', path), `${path}.formlyVersion`),
    nodeVersion: version(required(value, 'nodeVersion', path), `${path}.nodeVersion`),
    platform: token(required(value, 'platform', path), `${path}.platform`),
    architecture: token(required(value, 'architecture', path), `${path}.architecture`),
    target,
  };
}

function parseCases(input: unknown): readonly AngularHostCompatibilityCase[] {
  const path = 'compatibility.cases';
  if (!Array.isArray(input)) fail(path, 'must be an array.');
  const seen = new Set<string>();
  const cases = input.map((entry, index): AngularHostCompatibilityCase => {
    const itemPath = `${path}[${index}]`;
    const value = record(entry, itemPath, CASE_KEYS);
    const id = required(value, 'id', itemPath);
    if (!ANGULAR_HOST_COMPATIBILITY_CASE_IDS.includes(id as AngularHostCompatibilityCaseId)) {
      fail(`${itemPath}.id`, 'is unsupported.');
    }
    if (seen.has(id as string)) fail(`${itemPath}.id`, `duplicates case ${JSON.stringify(id)}.`);
    seen.add(id as string);
    const status = required(value, 'status', itemPath);
    if (status !== 'pass' && status !== 'fail') fail(`${itemPath}.status`, 'is unsupported.');
    const rawDiagnostics = required(value, 'diagnostics', itemPath);
    if (!Array.isArray(rawDiagnostics)) fail(`${itemPath}.diagnostics`, 'must be an array.');
    const diagnostics = rawDiagnostics.map((diagnostic, diagnosticIndex) => {
      const diagnosticPath = `${itemPath}.diagnostics[${diagnosticIndex}]`;
      const parsed = record(diagnostic, diagnosticPath, DIAGNOSTIC_KEYS);
      const expectedCode = `${String(id)}-failed` as AngularHostCompatibilityDiagnostic['code'];
      if (required(parsed, 'code', diagnosticPath) !== expectedCode) {
        fail(`${diagnosticPath}.code`, `must be ${JSON.stringify(expectedCode)}.`);
      }
      return {
        code: expectedCode,
        message: stringValue(required(parsed, 'message', diagnosticPath), `${diagnosticPath}.message`),
      };
    });
    if (status === 'pass' && diagnostics.length > 0) {
      fail(`${itemPath}.diagnostics`, 'must be empty for a passing case.');
    }
    if (status === 'fail' && diagnostics.length === 0) {
      fail(`${itemPath}.diagnostics`, 'must contain the case-specific failure.');
    }
    return {
      id: id as AngularHostCompatibilityCaseId,
      status,
      diagnostics,
    };
  });
  const missing = ANGULAR_HOST_COMPATIBILITY_CASE_IDS.find((id) => !seen.has(id));
  if (missing !== undefined) fail(path, `is missing required case ${JSON.stringify(missing)}.`);
  return cases;
}

function parseDraft(input: unknown): AngularHostCompatibilityResultDraft {
  assertCanonicalJsonShape(input, 'compatibility');
  const value = record(input, 'compatibility', DRAFT_KEYS);
  if (required(value, 'schemaVersion', 'compatibility') !== ANGULAR_HOST_COMPATIBILITY_SCHEMA_VERSION) {
    fail('compatibility.schemaVersion', 'is unsupported.');
  }
  const status = required(value, 'status', 'compatibility');
  if (status !== 'pass' && status !== 'fail') fail('compatibility.status', 'is unsupported.');
  const cases = parseCases(required(value, 'cases', 'compatibility'));
  const hasFailure = cases.some((entry) => entry.status === 'fail');
  if ((status === 'pass') === hasFailure) {
    fail('compatibility.status', 'must agree with all case results.');
  }
  return {
    schemaVersion: ANGULAR_HOST_COMPATIBILITY_SCHEMA_VERSION,
    environment: parseEnvironment(required(value, 'environment', 'compatibility')),
    status,
    cases,
  };
}

function canonicalDraft(input: AngularHostCompatibilityResultDraft): string {
  const parsed = parseDraft(input);
  return canonicalStringify({
    ...parsed,
    cases: [...parsed.cases].sort((left, right) => compareText(left.id, right.id)),
  });
}

export function computeAngularHostCompatibilityHash(
  input: AngularHostCompatibilityResultDraft,
): string {
  return `sha256:${createHash('sha256').update(canonicalDraft(input)).digest('hex')}`;
}

export function createAngularHostCompatibilityResult(
  input: AngularHostCompatibilityResultDraft,
): AngularHostCompatibilityResult {
  const parsed = JSON.parse(canonicalDraft(input)) as AngularHostCompatibilityResultDraft;
  return { ...parsed, contentHash: computeAngularHostCompatibilityHash(parsed) };
}

export function parseAngularHostCompatibilityResult(
  input: unknown,
): AngularHostCompatibilityResult {
  assertCanonicalJsonShape(input, 'compatibility');
  const value = record(input, 'compatibility', RESULT_KEYS);
  const draft = parseDraft({
    schemaVersion: required(value, 'schemaVersion', 'compatibility'),
    environment: required(value, 'environment', 'compatibility'),
    status: required(value, 'status', 'compatibility'),
    cases: required(value, 'cases', 'compatibility'),
  });
  const contentHash = required(value, 'contentHash', 'compatibility');
  if (typeof contentHash !== 'string' || !HASH_PATTERN.test(contentHash)) {
    fail('compatibility.contentHash', 'must be a sha256 digest.');
  }
  if (contentHash !== computeAngularHostCompatibilityHash(draft)) {
    fail('compatibility.contentHash', 'does not match canonical content.');
  }
  return input as AngularHostCompatibilityResult;
}

export function canonicalizeAngularHostCompatibilityResult(
  input: AngularHostCompatibilityResult,
): string {
  const parsed = parseAngularHostCompatibilityResult(input);
  return canonicalStringify({
    ...parsed,
    cases: [...parsed.cases].sort((left, right) => compareText(left.id, right.id)),
  });
}
