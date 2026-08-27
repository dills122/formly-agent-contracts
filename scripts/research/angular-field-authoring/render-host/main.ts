import { CommonModule } from '@angular/common';
import {
  ApplicationRef,
  Component,
  InjectionToken,
  importProvidersFrom,
  inject,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  FormlyConfig,
  FormlyModule,
  type FormlyFieldConfig,
  type FormlyFormOptions,
} from '@ngx-formly/core';

import {
  PartialFeatureFormlyModule,
  PartialRootFormlyModule,
  PartialStandaloneContributionComponent,
  providePartialStandaloneFormly,
} from '../.generated/partial-library/index.js';

type ResearchScope =
  | 'root'
  | 'feature-overlay'
  | 'feature-display'
  | 'standalone-import-negative';

interface ResearchScenario {
  readonly id: string;
  readonly scope: ResearchScope;
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;
}

interface ResearchSnapshot {
  readonly scenarioId: string;
  readonly scope: ResearchScope;
  readonly modelSink: {
    readonly id: 'research.formly-model-change';
    readonly version: 1;
    readonly model: Record<string, unknown>;
  };
}

declare global {
  interface Window {
    __RH03_READY__?: {
      readonly scenarioId: string;
      readonly scope: ResearchScope;
      readonly registeredTypes: readonly string[];
      readonly rootSelector: '[data-rh03-scenario-root]';
      readonly modelSinkId: 'research.formly-model-change';
      readonly modelSinkVersion: 1;
    };
    __RH03_ERROR__?: string;
    __RH03_SNAPSHOT__?: () => ResearchSnapshot;
    __RH03_DESTROY__?: () => { readonly destroyed: boolean };
  }
}

const RESEARCH_SCENARIO = new InjectionToken<ResearchScenario>(
  'RH03_RESEARCH_SCENARIO',
);

@Component({
  selector: 'test-app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormlyModule],
  template: `
    <main data-rh03-scenario-root [attr.data-scenario-id]="scenario.id">
      <form [formGroup]="form">
        <formly-form
          [form]="form"
          [fields]="fields"
          [model]="model"
          [options]="options"
          (modelChange)="recordModel($event)"
        />
      </form>
    </main>
  `,
})
class AuthoringScenarioShellComponent {
  readonly scenario = inject(RESEARCH_SCENARIO);
  readonly form = new FormGroup({});
  readonly fields = this.scenario.fields;
  readonly options: FormlyFormOptions = { formState: {} };
  model = structuredClone(this.scenario.model);

  recordModel(model: unknown): void {
    if (typeof model === 'object' && model !== null && !Array.isArray(model)) {
      this.model = structuredClone(model) as Record<string, unknown>;
    }
  }

  snapshot(): ResearchSnapshot {
    return {
      scenarioId: this.scenario.id,
      scope: this.scenario.scope,
      modelSink: {
        id: 'research.formly-model-change',
        version: 1,
        model: structuredClone(this.model),
      },
    };
  }
}

function selectScope(): ResearchScope {
  const value = new URL(window.location.href).searchParams.get('scope');
  if (
    value === 'root' ||
    value === 'feature-overlay' ||
    value === 'feature-display' ||
    value === 'standalone-import-negative'
  ) {
    return value;
  }
  throw new Error(`Unknown RH-03 research scope: ${value ?? '<missing>'}`);
}

function createScenario(scope: ResearchScope): ResearchScenario {
  switch (scope) {
    case 'root':
    case 'standalone-import-negative':
      return {
        id: 'research.partial-external',
        scope,
        fields: [
          {
            key: 'externalValue',
            type: 'partial-external',
            props: { label: 'External resource value' },
          },
        ],
        model: { externalValue: 'initial' },
      };
    case 'feature-overlay':
      return {
        id: 'research.feature-overlay',
        scope,
        fields: [
          {
            key: 'selectedTeam',
            type: 'partial-feature-overlay',
            props: { label: 'Research teams' },
          },
        ],
        model: { selectedTeam: null },
      };
    case 'feature-display':
      return {
        id: 'research.feature-display',
        scope,
        fields: [
          {
            type: 'partial-info-panel',
            props: { label: 'Display-only research notice' },
          },
        ],
        model: {},
      };
  }
}

async function main(): Promise<void> {
  const scope = selectScope();
  const scenario = createScenario(scope);
  const imports = [FormlyModule.forRoot(), PartialRootFormlyModule];
  if (scope === 'feature-overlay' || scope === 'feature-display') {
    imports.push(PartialFeatureFormlyModule);
  }

  const appRef = await bootstrapApplication(AuthoringScenarioShellComponent, {
    providers: [
      importProvidersFrom(...imports),
      scope === 'standalone-import-negative'
        ? importProvidersFrom(PartialStandaloneContributionComponent)
        : providePartialStandaloneFormly(),
      { provide: RESEARCH_SCENARIO, useValue: scenario },
    ],
  });
  await appRef.whenStable();
  appRef.tick();

  const root = appRef.components[0];
  if (!(root?.instance instanceof AuthoringScenarioShellComponent)) {
    throw new Error('Authoring scenario root was not available.');
  }
  const shell = root.instance;
  const registeredTypes = Object.keys(appRef.injector.get(FormlyConfig).types).sort();

  window.__RH03_READY__ = {
    scenarioId: scenario.id,
    scope,
    registeredTypes,
    rootSelector: '[data-rh03-scenario-root]',
    modelSinkId: 'research.formly-model-change',
    modelSinkVersion: 1,
  };
  window.__RH03_SNAPSHOT__ = () => shell.snapshot();
  window.__RH03_DESTROY__ = () => {
    appRef.destroy();
    return { destroyed: appRef.destroyed };
  };
}

main().catch((error: unknown) => {
  window.__RH03_ERROR__ = error instanceof Error ? error.stack ?? error.message : String(error);
});
