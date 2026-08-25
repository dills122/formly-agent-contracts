import { inject, Injectable, InjectionToken } from '@angular/core';

import type {
  TestFormDefinition,
  TestFormInstance,
} from './form-definition.js';

export type TestFormDefinitionGroups = readonly (
  readonly TestFormDefinition[]
)[];

export const TEST_FORM_DEFINITION_GROUPS =
  new InjectionToken<TestFormDefinitionGroups>(
    'formly-test-app.test-form-definition-groups',
  );

function compareFormIds(
  left: TestFormDefinition,
  right: TestFormDefinition,
): number {
  if (left.id === right.id) {
    return 0;
  }

  return left.id < right.id ? -1 : 1;
}

export class TestFormCatalog {
  readonly #definitions: readonly TestFormDefinition[];
  readonly #definitionsById: ReadonlyMap<string, TestFormDefinition>;

  constructor(groups: TestFormDefinitionGroups) {
    const definitions = [...groups.flat()].sort(compareFormIds);
    const definitionsById = new Map<string, TestFormDefinition>();

    for (const definition of definitions) {
      if (definitionsById.has(definition.id)) {
        throw new Error(`Duplicate test form ID: ${definition.id}`);
      }

      definitionsById.set(definition.id, definition);
    }

    this.#definitions = definitions;
    this.#definitionsById = definitionsById;
  }

  list(): readonly TestFormDefinition[] {
    return this.#definitions;
  }

  create(id: string): TestFormInstance {
    const definition = this.#definitionsById.get(id);
    if (!definition) {
      throw new Error(`Unknown test form ID: ${id}`);
    }

    return definition.create();
  }
}

@Injectable({ providedIn: 'root' })
export class TestFormRegistry {
  readonly #catalog = new TestFormCatalog(
    inject(TEST_FORM_DEFINITION_GROUPS, { optional: true }) ?? [],
  );

  list(): readonly TestFormDefinition[] {
    return this.#catalog.list();
  }

  create(id: string): TestFormInstance {
    return this.#catalog.create(id);
  }
}
