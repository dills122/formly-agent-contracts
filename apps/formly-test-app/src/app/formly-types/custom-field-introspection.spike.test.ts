import '@angular/compiler';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  analyzeAngularComponentSource,
  compareDeclaredProfileToRenderedSurface,
  deriveInteractionScaffold,
  reflectAngularComponent,
} from './custom-field-introspection.spike.js';
import {
  CurrencyFieldComponent,
  RatingFieldComponent,
  RepeatSectionFieldComponent,
} from './custom-field-types.js';
import {
  AutocompleteFieldComponent,
  ButtonToggleFieldComponent,
  ExpandableRepeaterFieldComponent,
  OverlaySelectFieldComponent,
  TableSelectFieldComponent,
} from './interaction-matrix-field-types.js';

const sourcePath = fileURLToPath(
  new URL('./custom-field-types.ts', import.meta.url),
);
const sourceText = readFileSync(sourcePath, 'utf8');
const matrixSourcePath = fileURLToPath(
  new URL('./interaction-matrix-field-types.ts', import.meta.url),
);
const matrixSourceText = readFileSync(matrixSourcePath, 'utf8');

describe('Angular custom-field introspection spike', () => {
  it('uses Angular public reflection for stable component metadata only', () => {
    expect(reflectAngularComponent(RatingFieldComponent)).toMatchObject({
      selector: 'test-formly-rating',
      standalone: false,
    });
  });

  it('finds native widget evidence and Formly prop dependencies in source', () => {
    const currency = analyzeAngularComponentSource(
      sourceText,
      sourcePath,
      'CurrencyFieldComponent',
    );
    const rating = analyzeAngularComponentSource(
      sourceText,
      sourcePath,
      'RatingFieldComponent',
    );

    const currencyInput = currency.elements.find(({ name }) => name === 'input');
    expect(currencyInput?.literalAttributes.type).toBe('number');
    expect(currencyInput?.boundAttributes).toEqual(
      expect.arrayContaining(['aria-label', 'formControl']),
    );
    expect(currency.propertyReads).toEqual(
      expect.arrayContaining(['props.label']),
    );

    const ratingGroup = rating.elements.find(({ name }) => name === 'div');
    const ratingInput = rating.elements.find(({ name }) => name === 'input');
    expect(ratingGroup?.literalAttributes.role).toBe('group');
    expect(ratingInput?.literalAttributes.type).toBe('radio');
    expect(ratingInput?.boundAttributes).toEqual(
      expect.arrayContaining(['name', 'value']),
    );
    expect(rating.propertyReads).toEqual(
      expect.arrayContaining(['props.label', 'props.min', 'props.max']),
    );
  });

  it('supports external Angular templates through an explicit build-time loader', () => {
    const componentSource = `
      @Component({
        selector: 'cool-radio-btn-grp',
        templateUrl: './cool-radio-btn-grp.html',
      })
      export class CoolRadioButtonGroupComponent {}
    `;
    const template = `
      <mat-button-toggle-group [attr.aria-label]="props.label">
        <mat-button-toggle [value]="props.value">Pick me</mat-button-toggle>
      </mat-button-toggle-group>
    `;
    const loaded: string[] = [];

    const observation = analyzeAngularComponentSource(
      componentSource,
      '/workspace/cool-radio-btn-grp.ts',
      'CoolRadioButtonGroupComponent',
      {
        loadTemplate(templateUrl, containingFile) {
          loaded.push(`${containingFile}:${templateUrl}`);
          return template;
        },
      },
    );

    expect(loaded).toEqual([
      '/workspace/cool-radio-btn-grp.ts:./cool-radio-btn-grp.html',
    ]);
    expect(observation.elements.map(({ name }) => name)).toEqual([
      'mat-button-toggle-group',
      'mat-button-toggle',
    ]);
    expect(observation.propertyReads).toEqual([
      'props.label',
      'props.value',
    ]);
  });

  it('scaffolds common native-backed interactions without claiming option values', () => {
    const rating = analyzeAngularComponentSource(
      sourceText,
      sourcePath,
      'RatingFieldComponent',
    );
    const scaffold = deriveInteractionScaffold(
      'rating',
      reflectAngularComponent(RatingFieldComponent),
      rating,
    );

    expect(scaffold).toMatchObject({
      formlyType: 'rating',
      evidence: 'derived',
      candidate: {
        operation: 'check',
        optionRole: 'radio',
        possibleValues: {
          status: 'runtime-dependent',
        },
      },
    });
    expect(scaffold.reviewRequired).toBe(true);
    expect(scaffold.unknowns).toContain('possible-values');
  });

  it('generates deterministic review scaffolds for the custom-type matrix', () => {
    const cases = [
      ['currency', CurrencyFieldComponent, 'CurrencyFieldComponent'],
      ['rating', RatingFieldComponent, 'RatingFieldComponent'],
      [
        'repeat-section',
        RepeatSectionFieldComponent,
        'RepeatSectionFieldComponent',
      ],
    ] as const;

    const scaffolds = cases.map(([formlyType, component, className]) =>
      deriveInteractionScaffold(
        formlyType,
        reflectAngularComponent(component),
        analyzeAngularComponentSource(sourceText, sourcePath, className),
      ),
    );

    expect(scaffolds).toEqual([
      {
        formlyType: 'currency',
        componentSelector: 'test-formly-currency',
        evidence: 'derived',
        candidate: { operation: 'fill', controlRole: 'spinbutton' },
        observedProps: ['props.label'],
        reviewRequired: true,
        unknowns: ['driver-binding'],
      },
      {
        formlyType: 'rating',
        componentSelector: 'test-formly-rating',
        evidence: 'derived',
        candidate: {
          operation: 'check',
          optionRole: 'radio',
          possibleValues: { status: 'runtime-dependent' },
        },
        observedProps: ['props.label', 'props.max', 'props.min'],
        reviewRequired: true,
        unknowns: ['driver-binding', 'possible-values'],
      },
      {
        formlyType: 'repeat-section',
        componentSelector: 'test-formly-repeat-section',
        evidence: 'derived',
        candidate: {},
        observedProps: ['props.addText'],
        reviewRequired: true,
        unknowns: [
          'component-parts',
          'interaction-operation',
          'opaque-child-component',
        ],
      },
    ]);
  });

  it('keeps composite action semantics unknown when source evidence is ambiguous', () => {
    const repeat = analyzeAngularComponentSource(
      sourceText,
      sourcePath,
      'RepeatSectionFieldComponent',
    );
    const scaffold = deriveInteractionScaffold(
      'repeat-section',
      reflectAngularComponent(RepeatSectionFieldComponent),
      repeat,
    );

    expect(repeat.events).toEqual(
      expect.arrayContaining([
        { element: 'button', event: 'click', handler: 'remove(index)' },
        { element: 'button', event: 'click', handler: 'add()' },
      ]),
    );
    expect(scaffold.candidate.operation).toBeUndefined();
    expect(scaffold.unknowns).toEqual(
      expect.arrayContaining(['interaction-operation', 'component-parts']),
    );
  });

  it('does not infer DOM roles through opaque child Angular components', () => {
    const source = `
      @Component({
        selector: 'cool-radio-btn-grp',
        template: \`
          <mat-button-toggle-group [attr.aria-label]="props.label">
            <mat-button-toggle [value]="option.value">
              {{ option.label }}
            </mat-button-toggle>
          </mat-button-toggle-group>
        \`,
      })
      export class CoolRadioButtonGroupComponent {}
    `;
    const observation = analyzeAngularComponentSource(
      source,
      '/workspace/cool-radio-btn-grp.ts',
      'CoolRadioButtonGroupComponent',
    );
    const scaffold = deriveInteractionScaffold(
      'cool-radio-btn-grp',
      {
        selector: 'cool-radio-btn-grp',
        standalone: false,
        inputs: [],
        outputs: [],
        ngContentSelectors: [],
      },
      observation,
    );

    expect(observation.elements.map(({ name }) => name)).toEqual([
      'mat-button-toggle-group',
      'mat-button-toggle',
    ]);
    expect(scaffold.candidate.operation).toBeUndefined();
    expect(scaffold.unknowns).toContain('interaction-operation');
  });

  it('derives a review-only choice candidate for explicit button radios', () => {
    const source = `
      @Component({
        selector: 'fixture-button-toggle',
        template: \`
          <div role="radiogroup" [attr.aria-label]="props.label">
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="formControl.value === option.value"
              [value]="option.value"
              (click)="select(option.value)"
            >{{ option.label }}</button>
          </div>
        \`,
      })
      export class ButtonToggleComponent {}
    `;
    const observation = analyzeAngularComponentSource(
      source,
      '/workspace/button-toggle.ts',
      'ButtonToggleComponent',
    );
    const scaffold = deriveInteractionScaffold(
      'button-toggle',
      {
        selector: 'fixture-button-toggle',
        standalone: false,
        inputs: [],
        outputs: [],
        ngContentSelectors: [],
      },
      observation,
    );

    expect(scaffold.candidate).toEqual({
      operation: 'click',
      optionRole: 'radio',
      possibleValues: { status: 'runtime-dependent' },
    });
    expect(scaffold.unknowns).toEqual([
      'driver-binding',
      'interaction-codec',
      'possible-values',
    ]);
  });

  it('does not infer a writable numeric control without an explicit model binding', () => {
    const source = `
      @Component({
        selector: 'fixture-readonly-number',
        template: \`<input type="number" [value]="props.preview">\`,
      })
      export class ReadonlyNumberComponent {}
    `;
    const observation = analyzeAngularComponentSource(
      source,
      '/workspace/readonly-number.ts',
      'ReadonlyNumberComponent',
    );
    const scaffold = deriveInteractionScaffold(
      'readonly-number',
      {
        selector: 'fixture-readonly-number',
        standalone: false,
        inputs: [],
        outputs: [],
        ngContentSelectors: [],
      },
      observation,
    );

    expect(scaffold.candidate).toEqual({});
    expect(scaffold.unknowns).toEqual(
      expect.arrayContaining(['interaction-operation', 'model-binding']),
    );
  });

  it('does not mistake a single component output for a click operation', () => {
    const source = `
      @Component({
        selector: 'fixture-overlay-select',
        template: \`
          <custom-popup (selectionChange)="accept($event)" />
        \`,
      })
      export class OverlaySelectComponent {}
    `;
    const observation = analyzeAngularComponentSource(
      source,
      '/workspace/overlay-select.ts',
      'OverlaySelectComponent',
    );
    const scaffold = deriveInteractionScaffold(
      'overlay-select',
      {
        selector: 'fixture-overlay-select',
        standalone: false,
        inputs: [],
        outputs: [],
        ngContentSelectors: [],
      },
      observation,
    );

    expect(scaffold.candidate.operation).toBeUndefined();
    expect(scaffold.unknowns).toEqual(
      expect.arrayContaining(['interaction-operation', 'opaque-child-component']),
    );
  });

  it('blocks candidates when Angular reports template parse errors', () => {
    const source = `
      @Component({
        selector: 'fixture-broken',
        template: \`@if ( { <input type="number"> }\`,
      })
      export class BrokenComponent {}
    `;
    const observation = analyzeAngularComponentSource(
      source,
      '/workspace/broken.ts',
      'BrokenComponent',
    );
    const scaffold = deriveInteractionScaffold(
      'broken',
      {
        selector: 'fixture-broken',
        standalone: false,
        inputs: [],
        outputs: [],
        ngContentSelectors: [],
      },
      observation,
    );

    expect(observation.parseErrors.length).toBeGreaterThan(0);
    expect(scaffold.candidate).toEqual({});
    expect(scaffold.unknowns).toContain('template-parse-errors');
  });

  it('classifies the real complex-widget matrix without inventing sequences', () => {
    const cases = [
      ['button-toggle', ButtonToggleFieldComponent, 'ButtonToggleFieldComponent'],
      ['overlay-select', OverlaySelectFieldComponent, 'OverlaySelectFieldComponent'],
      ['autocomplete', AutocompleteFieldComponent, 'AutocompleteFieldComponent'],
      ['table-select', TableSelectFieldComponent, 'TableSelectFieldComponent'],
      [
        'expandable-repeater',
        ExpandableRepeaterFieldComponent,
        'ExpandableRepeaterFieldComponent',
      ],
    ] as const;

    const scaffolds = Object.fromEntries(
      cases.map(([formlyType, component, className]) => {
        const observation = analyzeAngularComponentSource(
          matrixSourceText,
          matrixSourcePath,
          className,
        );
        return [
          formlyType,
          deriveInteractionScaffold(
            formlyType,
            reflectAngularComponent(component),
            observation,
          ),
        ];
      }),
    );

    expect(scaffolds['button-toggle']?.candidate).toEqual({
      operation: 'click',
      optionRole: 'radio',
      possibleValues: { status: 'runtime-dependent' },
    });
    for (const formlyType of [
      'overlay-select',
      'autocomplete',
      'table-select',
      'expandable-repeater',
    ]) {
      expect(scaffolds[formlyType]?.candidate.operation, formlyType).toBeUndefined();
      expect(scaffolds[formlyType]?.unknowns, formlyType).toContain(
        'interaction-operation',
      );
    }
  });

  it('reports when a declared profile disagrees with the rendered ARIA surface', () => {
    const mismatches = compareDeclaredProfileToRenderedSurface(
      {
        containerRole: 'radiogroup',
        optionRole: 'radio',
        operation: 'check',
      },
      {
        roles: { group: 1, radio: 5 },
      },
    );

    expect(mismatches).toEqual([
      {
        code: 'container-role-not-observed',
        expected: 'radiogroup',
        observed: ['group', 'radio'],
      },
    ]);
  });
});
