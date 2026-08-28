import {
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { types as utilTypes } from 'node:util';

import {
  AGENT_CONTEXT_QUERY_MAX_CURSOR_LENGTH,
  createAgentContextQueryCursorBinding,
  type AgentContextPageableCollection,
} from './agent-context-query.js';
import { canonicalStringify } from './canonical-json.js';

export const AGENT_CONTEXT_QUERY_CURSOR_SCHEMA_VERSION = '0.1.0' as const;
export const AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS = 86_400_000;
export const AGENT_CONTEXT_QUERY_CURSOR_MIN_SIGNING_BYTES = 16;
export const AGENT_CONTEXT_QUERY_CURSOR_MAX_SIGNING_BYTES = 4_096;

export interface CreateAgentContextQueryCursorInput {
  readonly collection: AgentContextPageableCollection;
  readonly query: unknown;
  readonly position: number;
  readonly now: number;
  readonly ttlMs: number;
  readonly signingMaterial: string;
}

export interface ParseAgentContextQueryCursorInput {
  readonly cursor: string;
  readonly collection: AgentContextPageableCollection;
  readonly query: unknown;
  readonly now: number;
  readonly signingMaterial: string;
}

export interface AgentContextQueryCursorContinuation {
  readonly position: number;
}

interface AgentContextQueryCursorPayload {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_CURSOR_SCHEMA_VERSION;
  readonly bindingHash: `sha256:${string}`;
  readonly position: number;
  readonly expiresAt: number;
}

type FlatInput = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CURSOR_PATTERN = /^acq1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/u;
const CREATE_KEYS = new Set([
  'collection',
  'query',
  'position',
  'now',
  'ttlMs',
  'signingMaterial',
]);
const PARSE_KEYS = new Set([
  'cursor',
  'collection',
  'query',
  'now',
  'signingMaterial',
]);

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function invalidCursor(): never {
  fail('agentContextQueryCursor', 'is invalid.');
}

function flatInput(
  input: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): FlatInput {
  if (
    ((typeof input === 'object' && input !== null) ||
      typeof input === 'function') &&
    utilTypes.isProxy(input)
  ) {
    fail(path, 'must not be a proxy.');
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object or null-prototype object.');
  }
  if (Object.getOwnPropertySymbols(input).length > 0) {
    fail(path, 'must not contain symbol-keyed properties.');
  }
  const result: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(input),
  )) {
    const propertyPath = `${path}.${key}`;
    if (!allowedKeys.has(key)) fail(propertyPath, 'is not supported.');
    if (!descriptor.enumerable) fail(propertyPath, 'must be enumerable.');
    if (!('value' in descriptor)) fail(propertyPath, 'must be a data property.');
    result[key] = descriptor.value;
  }
  for (const key of allowedKeys) {
    if (!Object.hasOwn(result, key)) fail(`${path}.${key}`, 'is required.');
  }
  return result;
}

function safeInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) < 0) {
    fail(path, 'must be a non-negative safe integer.');
  }
  const value = Number(input);
  return Object.is(value, -0) ? 0 : value;
}

function positiveTtl(input: unknown, path: string): number {
  if (
    !Number.isSafeInteger(input) ||
    Number(input) <= 0 ||
    Number(input) > AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS
  ) {
    fail(
      path,
      `must be a positive safe integer no greater than ${AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS}.`,
    );
  }
  return Number(input);
}

function signingMaterial(input: unknown, path: string): string {
  if (typeof input !== 'string') {
    fail(path, 'must be a string.');
  }
  const byteLength = Buffer.byteLength(input, 'utf8');
  if (
    byteLength < AGENT_CONTEXT_QUERY_CURSOR_MIN_SIGNING_BYTES ||
    byteLength > AGENT_CONTEXT_QUERY_CURSOR_MAX_SIGNING_BYTES
  ) {
    fail(
      path,
      `must contain ${AGENT_CONTEXT_QUERY_CURSOR_MIN_SIGNING_BYTES}-${AGENT_CONTEXT_QUERY_CURSOR_MAX_SIGNING_BYTES} UTF-8 bytes.`,
    );
  }
  return input;
}

function cursorText(input: unknown): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > AGENT_CONTEXT_QUERY_MAX_CURSOR_LENGTH
  ) {
    invalidCursor();
  }
  return input;
}

function sha256Canonical(input: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256')
    .update(canonicalStringify(input))
    .digest('hex')}`;
}

function canonicalBase64Url(input: Buffer): string {
  return input.toString('base64url');
}

function decodeCanonicalBase64Url(input: string): Buffer {
  let decoded: Buffer;
  try {
    decoded = Buffer.from(input, 'base64url');
  } catch {
    invalidCursor();
  }
  if (decoded.length === 0 || canonicalBase64Url(decoded) !== input) {
    invalidCursor();
  }
  return decoded;
}

function signature(
  payloadSegment: string,
  secret: string,
): Buffer {
  return createHmac('sha256', secret).update(`acq1.${payloadSegment}`).digest();
}

function parsePayload(input: Buffer): AgentContextQueryCursorPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.toString('utf8')) as unknown;
  } catch {
    invalidCursor();
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    invalidCursor();
  }
  const descriptors = Object.getOwnPropertyDescriptors(parsed);
  const keys = Object.keys(descriptors);
  if (
    keys.length !== 4 ||
    !keys.includes('schemaVersion') ||
    !keys.includes('bindingHash') ||
    !keys.includes('position') ||
    !keys.includes('expiresAt')
  ) {
    invalidCursor();
  }
  for (const descriptor of Object.values(descriptors)) {
    if (!descriptor.enumerable || !('value' in descriptor)) invalidCursor();
  }
  const value = parsed as Readonly<Record<string, unknown>>;
  if (
    value.schemaVersion !== AGENT_CONTEXT_QUERY_CURSOR_SCHEMA_VERSION ||
    typeof value.bindingHash !== 'string' ||
    !HASH_PATTERN.test(value.bindingHash) ||
    !Number.isSafeInteger(value.position) ||
    Number(value.position) < 0 ||
    !Number.isSafeInteger(value.expiresAt) ||
    Number(value.expiresAt) < 0
  ) {
    invalidCursor();
  }
  const position = Number(value.position);
  const expiresAt = Number(value.expiresAt);
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_CURSOR_SCHEMA_VERSION,
    bindingHash: value.bindingHash as `sha256:${string}`,
    position: Object.is(position, -0) ? 0 : position,
    expiresAt: Object.is(expiresAt, -0) ? 0 : expiresAt,
  };
}

function bindingHash(query: unknown, collection: unknown): `sha256:${string}` {
  const binding = createAgentContextQueryCursorBinding(query, collection);
  return sha256Canonical(binding);
}

export function createAgentContextQueryCursor(
  input: CreateAgentContextQueryCursorInput,
): string {
  const path = 'createAgentContextQueryCursor';
  const value = flatInput(input, path, CREATE_KEYS);
  const position = safeInteger(value.position, `${path}.position`);
  const now = safeInteger(value.now, `${path}.now`);
  const ttlMs = positiveTtl(value.ttlMs, `${path}.ttlMs`);
  const secret = signingMaterial(
    value.signingMaterial,
    `${path}.signingMaterial`,
  );
  const expiresAt = now + ttlMs;
  if (!Number.isSafeInteger(expiresAt)) {
    fail(`${path}.ttlMs`, 'would overflow the safe integer time range.');
  }
  const payload: AgentContextQueryCursorPayload = {
    schemaVersion: AGENT_CONTEXT_QUERY_CURSOR_SCHEMA_VERSION,
    bindingHash: bindingHash(value.query, value.collection),
    position,
    expiresAt,
  };
  const payloadSegment = canonicalBase64Url(
    Buffer.from(canonicalStringify(payload), 'utf8'),
  );
  const signatureSegment = canonicalBase64Url(signature(payloadSegment, secret));
  const cursor = `acq1.${payloadSegment}.${signatureSegment}`;
  if (cursor.length > AGENT_CONTEXT_QUERY_MAX_CURSOR_LENGTH) {
    fail(path, 'produced an oversized cursor.');
  }
  return cursor;
}

export function parseAgentContextQueryCursor(
  input: ParseAgentContextQueryCursorInput,
): AgentContextQueryCursorContinuation {
  const path = 'parseAgentContextQueryCursor';
  const value = flatInput(input, path, PARSE_KEYS);
  const cursor = cursorText(value.cursor);
  const secret = signingMaterial(
    value.signingMaterial,
    `${path}.signingMaterial`,
  );
  const now = safeInteger(value.now, `${path}.now`);
  const match = CURSOR_PATTERN.exec(cursor);
  if (match === null) invalidCursor();
  const payloadSegment = match[1]!;
  const signatureSegment = match[2]!;
  const suppliedSignature = decodeCanonicalBase64Url(signatureSegment);
  const expectedSignature = signature(payloadSegment, secret);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    invalidCursor();
  }
  const payloadBytes = decodeCanonicalBase64Url(payloadSegment);
  const payload = parsePayload(payloadBytes);
  if (
    canonicalBase64Url(Buffer.from(canonicalStringify(payload), 'utf8')) !==
    payloadSegment
  ) {
    invalidCursor();
  }
  if (now >= payload.expiresAt) invalidCursor();
  let expectedBindingHash: `sha256:${string}`;
  try {
    expectedBindingHash = bindingHash(value.query, value.collection);
  } catch {
    invalidCursor();
  }
  if (payload.bindingHash !== expectedBindingHash) invalidCursor();
  return { position: payload.position };
}
