export class WorkspaceConfigValidationError extends TypeError {
  readonly code = 'CONFIG_INVALID' as const;
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'WorkspaceConfigValidationError';
    this.path = path;
  }
}

export function invalid(path: string, message: string): never {
  throw new WorkspaceConfigValidationError(path, message);
}

export function isPlainRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    invalid(path, 'must be an object.');
  }
  return value;
}

export function rejectUnknownKeys(
  value: Readonly<Record<string, unknown>>,
  allowedKeys: ReadonlySet<string>,
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      invalid(`${path}.${key}`, 'is not supported.');
    }
  }
}

export function requireStableId(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    !/^[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/u.test(value) ||
    value
      .split('/')
      .some(
        (segment) =>
          segment === '' || segment === '.' || segment === '..',
      )
  ) {
    invalid(
      path,
      'must be a lowercase stable ID using letters, numbers, dot, slash, underscore, or hyphen.',
    );
  }
  return value;
}
