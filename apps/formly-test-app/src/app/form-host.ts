import { FormGroup } from '@angular/forms';
import type {
  FormlyFieldConfig,
  FormlyFormOptions,
} from '@ngx-formly/core';

import type {
  TestFormDefinition,
  TestFormInstance,
} from './form-registry/form-definition.js';

interface TestFormSource {
  list(): readonly TestFormDefinition[];
  create(id: string): TestFormInstance;
}

export class FormHost {
  readonly #source: TestFormSource;
  readonly definitions: readonly TestFormDefinition[];

  activeDefinition: TestFormDefinition | undefined;
  fields: FormlyFieldConfig[] = [];
  form = new FormGroup({});
  model: Record<string, unknown> = {};
  options: FormlyFormOptions = { formState: {} };

  constructor(source: TestFormSource) {
    this.#source = source;
    this.definitions = this.#source.list();
    const firstDefinition = this.definitions[0];
    if (firstDefinition) {
      this.select(firstDefinition.id);
    }
  }

  select(id: string): void {
    const definition = this.definitions.find((candidate) => candidate.id === id);
    if (!definition) {
      throw new Error(`Unknown test form ID: ${id}`);
    }

    const instance = this.#source.create(id);
    this.activeDefinition = definition;
    this.fields = instance.fields;
    this.form = new FormGroup({});
    this.model = instance.model;
    this.options = { formState: instance.formState };
  }
}
