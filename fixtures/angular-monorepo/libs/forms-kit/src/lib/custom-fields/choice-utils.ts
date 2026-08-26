export interface FixtureChoiceOption {
  readonly label: string;
  readonly value: unknown;
  readonly disabled?: boolean;
}

export interface FixtureTableRow {
  readonly id: string;
  readonly label: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

export function isChoiceOption(value: unknown): value is FixtureChoiceOption {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    'value' in value &&
    (!('disabled' in value) || typeof value.disabled === 'boolean')
  );
}

export function isTableRow(value: unknown): value is FixtureTableRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string'
  );
}
