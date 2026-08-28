import { inject, Injectable, InjectionToken } from '@angular/core';

import type {
  TestFormDefinition,
  TestFormInstance,
} from './form-definition.js';

export type TestFormDefinitionGroups = readonly (
  readonly TestFormDefinition[]
)[];

/**
 * Angular multi-provider token for registering a group of test forms into
 * the app-wide catalog. Each `*-forms.module.ts` provides its own
 * `TestFormDefinition[]` under this token with `multi: true`:
 *
 * ```ts
 * providers: [
 *   { provide: TEST_FORM_DEFINITION_GROUPS, useValue: MY_TEST_FORMS, multi: true },
 * ]
 * ```
 *
 * Angular collects every provided array into one `TestFormDefinitionGroups`
 * (an array of arrays), which `TestFormCatalog` flattens and sorts by id.
 * Omitting `multi: true` silently replaces every other module's forms
 * instead of adding to them. Every `TestFormDefinition.id` across all
 * groups must be unique — `TestFormCatalog`'s constructor throws on the
 * first duplicate it finds.
 */
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
