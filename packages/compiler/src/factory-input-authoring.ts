/**
 * Type-only surface used by workspace-generated factory-input authoring drafts.
 *
 * The compiler intentionally supplies no runtime implementation here. A draft
 * cannot execute a factory, callback, Observable, or Angular view capability;
 * a future reviewed runner remains responsible for materializing those values.
 */
export interface FactoryInputAuthoringHarness {
  capturedCallback<TValue>(optionKey: string): TValue;
  inertObservable<TValue extends object>(optionKey: string): TValue;
  unavailableView<TValue extends object>(optionKey: string): TValue;
}
