import { describe, expect, it } from 'vitest';

import {
  ANGULAR_HOST_COMPATIBILITY_CASE_IDS,
  createAngularHostCompatibilityResult,
  parseAngularHostCompatibilityResult,
} from './angular-host-compatibility.js';

function passingDraft() {
  return {
    schemaVersion: '1.0.0' as const,
    environment: {
      angularVersion: '20.3.29',
      formlyVersion: '6.1.8',
      nodeVersion: '22.22.1',
      platform: 'darwin',
      architecture: 'arm64',
      target: 'angular-cli' as const,
    },
    status: 'pass' as const,
    cases: ANGULAR_HOST_COMPATIBILITY_CASE_IDS.map((id) => ({
      id,
      status: 'pass' as const,
      diagnostics: [],
    })),
  };
}

describe('Angular host compatibility result', () => {
  it('creates and verifies a path-free exhaustive compatibility result', () => {
    const result = createAngularHostCompatibilityResult(passingDraft());
    expect(parseAngularHostCompatibilityResult(result)).toBe(result);
    expect(result.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(JSON.stringify(result)).not.toContain(process.cwd());
  });

  it('requires every case and exact overall status agreement', () => {
    const missing = passingDraft();
    expect(() =>
      createAngularHostCompatibilityResult({
        ...missing,
        cases: missing.cases.slice(1),
      }),
    ).toThrow('is missing required case');
    expect(() =>
      createAngularHostCompatibilityResult({
        ...passingDraft(),
        status: 'fail',
      }),
    ).toThrow('must agree with all case results');
  });

  it('requires a case-specific diagnostic for failure and none for success', () => {
    const draft = passingDraft();
    const first = draft.cases[0]!;
    expect(() =>
      createAngularHostCompatibilityResult({
        ...draft,
        status: 'fail',
        cases: [{ ...first, status: 'fail' as const }, ...draft.cases.slice(1)],
      }),
    ).toThrow('must contain the case-specific failure');
    expect(() =>
      createAngularHostCompatibilityResult({
        ...draft,
        cases: [
          {
            ...first,
            diagnostics: [{ code: `${first.id}-failed` as const, message: 'unexpected' }],
          },
          ...draft.cases.slice(1),
        ],
      }),
    ).toThrow('must be empty for a passing case');
  });
});
