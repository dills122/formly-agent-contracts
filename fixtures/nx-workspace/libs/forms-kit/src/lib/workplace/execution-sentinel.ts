const AUTHORING_SENTINEL = '__FORMlyContractAuthoringMustNotExecute';

export function rejectUnexpectedWorkplaceExecution(operation: string): void {
  const state = globalThis as typeof globalThis &
    Record<string, boolean | undefined>;
  if (state[AUTHORING_SENTINEL] === true) {
    throw new Error(`Factory-input authoring executed ${operation}.`);
  }
}
