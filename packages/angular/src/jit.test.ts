import { describe, expect, it } from 'vitest';

import {
  angularAuthoringRuntimeHost,
  angularJitRuntimeHost,
} from './index.js';

describe('Angular runtime-host descriptors', () => {
  it('creates distinct Node-safe JIT and authoring descriptors', () => {
    const jit = angularJitRuntimeHost();
    const authoring = angularAuthoringRuntimeHost();

    expect(jit.id).toBe('@formly-contract/angular-jit');
    expect(jit.moduleUrl).toMatch(/project-host\.js$/u);
    expect(authoring.id).toBe('@formly-contract/angular-authoring');
    expect(authoring.moduleUrl).toMatch(/authoring-host\.js$/u);
    expect(jit.moduleUrl).not.toBe(authoring.moduleUrl);
  });
});
