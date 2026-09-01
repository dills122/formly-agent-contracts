export interface FieldTypeProfileIdentity {
  readonly id: string;
  readonly version: number;
}

export interface FieldTypeProfileReference {
  readonly id: string;
  readonly version: number;
}

export interface FieldTypeProfilePart {
  readonly name: string;
  readonly role: string;
  readonly cardinality: 'one' | 'many';
  readonly evidence: 'declared';
}

export type FieldTypeProfileOperation =
  | 'fill'
  | 'check'
  | 'select-option'
  | 'select-from-overlay'
  | 'type-and-pick'
  | 'select-row'
  | 'add-item'
  | 'expand-item'
  | 'next-step'
  | 'previous-step'
  | 'submit-stepper';

export type FieldTypeProfileInteraction =
  | {
      readonly kind: 'fill';
      readonly operation: 'fill';
      readonly controlPart: string;
    }
  | {
      readonly kind: 'choice';
      readonly operation:
        | 'check'
        | 'select-option'
        | 'select-from-overlay';
      readonly optionPart: string;
      readonly triggerPart?: string;
      readonly popupPart?: string;
    }
  | {
      readonly kind: 'autocomplete';
      readonly operation: 'type-and-pick';
      readonly queryPart: string;
      readonly popupPart: string;
      readonly optionPart: string;
    }
  | {
      readonly kind: 'row-selection';
      readonly operation: 'select-row';
      readonly rowPart: string;
      readonly selectionPart: string;
    }
  | {
      readonly kind: 'repeater';
      readonly operation: 'add-item' | 'expand-item';
      readonly addPart: string;
      readonly itemPart: string;
      readonly expandPart?: string;
    }
  | {
      readonly kind: 'stepper';
      readonly operation: 'next-step' | 'previous-step' | 'submit-stepper';
      readonly stepPart: string;
      readonly nextPart: string;
      readonly previousPart?: string;
      readonly submitPart?: string;
    };

export type GenericFieldTypeDriverId =
  | 'generic.fill'
  | 'generic.choice'
  | 'generic.autocomplete'
  | 'generic.row-selection'
  | 'generic.repeater'
  | 'generic.stepper';

export type FieldTypeProfileDriver =
  | {
      readonly kind: 'generic';
      readonly id: GenericFieldTypeDriverId;
      readonly version: number;
      readonly capabilities: readonly FieldTypeProfileOperation[];
    }
  | {
      readonly kind: 'application';
      readonly id: string;
      readonly version: number;
      readonly capabilities: readonly FieldTypeProfileOperation[];
    };

export type FieldTypeProfileUnknownAspect =
  | 'semantic-role'
  | 'model-codec'
  | 'runtime-states'
  | 'locator-scope'
  | 'interaction-sequence';

export interface FieldTypeWrapperPrecondition {
  readonly kind: 'activate';
  readonly part: string;
  readonly operation: 'click' | 'check';
  readonly evidence: 'declared';
}
