/**
 * @internal Shared by `field-type-profiles.ts` and `resolve-effects.ts` to
 * deep-freeze a normalized registry once, so `prepare*Registry` callers get
 * back a value that's safe to cache and share. Not part of the package
 * barrel.
 */
export function deepFreezeRegistryValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreezeRegistryValue(child);
  }
  return Object.freeze(value);
}
