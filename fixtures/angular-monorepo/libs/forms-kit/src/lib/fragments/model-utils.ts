function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

export function readNestedValue(
  model: unknown,
  group: string,
  key: string,
): unknown {
  if (!isRecord(model)) {
    return undefined;
  }

  const nested = model[group];
  return isRecord(nested) ? nested[key] : undefined;
}
