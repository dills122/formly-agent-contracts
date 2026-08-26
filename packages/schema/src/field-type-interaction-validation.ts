import type {
  FieldTypeProfileDriver,
  FieldTypeProfileInteraction,
  FieldTypeProfileOperation,
  FieldTypeProfilePart,
  FieldTypeProfileUnknownAspect,
  GenericFieldTypeDriverId,
} from './field-type-interaction.js';

type FieldTypeProfileValueShape = 'scalar' | 'array' | 'object';

interface GenericDriverUnknown {
  readonly aspect: FieldTypeProfileUnknownAspect;
}

interface GenericDriverSemanticInput {
  readonly path: string;
  readonly driver: FieldTypeProfileDriver;
  readonly interaction: FieldTypeProfileInteraction;
  readonly valueShape: FieldTypeProfileValueShape;
  readonly parts: readonly FieldTypeProfilePart[];
  readonly unknowns: readonly GenericDriverUnknown[];
}

const GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECT_POLICY =
  new Set<FieldTypeProfileUnknownAspect>([
    'model-codec',
    'locator-scope',
    'interaction-sequence',
  ]);

export const GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS = Object.freeze([
  ...GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECT_POLICY,
]);

const GENERIC_DRIVER_BY_INTERACTION = {
  fill: 'generic.fill',
  choice: 'generic.choice',
  autocomplete: 'generic.autocomplete',
  'row-selection': 'generic.row-selection',
  repeater: 'generic.repeater',
} as const satisfies Readonly<
  Record<FieldTypeProfileInteraction['kind'], GenericFieldTypeDriverId>
>;

const GENERIC_DRIVER_CAPABILITIES = {
  'generic.fill': new Set<FieldTypeProfileOperation>(['fill']),
  'generic.choice': new Set<FieldTypeProfileOperation>([
    'check',
    'select-option',
    'select-from-overlay',
  ]),
  'generic.autocomplete': new Set<FieldTypeProfileOperation>(['type-and-pick']),
  'generic.row-selection': new Set<FieldTypeProfileOperation>(['select-row']),
  'generic.repeater': new Set<FieldTypeProfileOperation>([
    'add-item',
    'expand-item',
  ]),
} as const satisfies Readonly<
  Record<GenericFieldTypeDriverId, ReadonlySet<FieldTypeProfileOperation>>
>;

function requireGenericPartSurface(
  parts: ReadonlyMap<string, FieldTypeProfilePart>,
  partName: string,
  driverId: GenericFieldTypeDriverId,
  roles: readonly string[],
  cardinality: 'one' | 'many',
): void {
  const part = parts.get(partName);
  if (part == null) {
    throw new TypeError(
      `driver: ${driverId} references missing part "${partName}"`,
    );
  }
  if (!roles.includes(part.role)) {
    const roleDescription =
      roles.length === 1
        ? roles[0]
        : `${roles.slice(0, -1).join(', ')}, or ${roles.at(-1)}`;
    throw new TypeError(
      `driver: ${driverId} requires part "${partName}" to have role ${roleDescription}`,
    );
  }
  if (part.cardinality !== cardinality) {
    throw new TypeError(
      `driver: ${driverId} requires part "${partName}" to have cardinality ${cardinality}`,
    );
  }
}

function validateGenericCapabilitySurface(
  capability: FieldTypeProfileOperation,
  driverId: GenericFieldTypeDriverId,
  interaction: FieldTypeProfileInteraction,
  parts: ReadonlyMap<string, FieldTypeProfilePart>,
  path: string,
): void {
  switch (capability) {
    case 'fill':
      if (interaction.kind !== 'fill') {
        throw new TypeError(
          `${path}: capability "fill" requires fill interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.controlPart,
        driverId,
        ['textbox', 'searchbox', 'spinbutton'],
        'one',
      );
      return;
    case 'check':
      if (interaction.kind !== 'choice') {
        throw new TypeError(
          `${path}: capability "check" requires choice interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['radio', 'checkbox'],
        'many',
      );
      return;
    case 'select-option':
      if (interaction.kind !== 'choice') {
        throw new TypeError(
          `${path}: capability "select-option" requires choice interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['option'],
        'many',
      );
      return;
    case 'select-from-overlay':
      if (interaction.kind !== 'choice') {
        throw new TypeError(
          `${path}: capability "select-from-overlay" requires choice interaction`,
        );
      }
      if (
        interaction.triggerPart === undefined ||
        interaction.popupPart === undefined
      ) {
        throw new TypeError(
          `${path}: capability "select-from-overlay" requires triggerPart and popupPart`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.triggerPart,
        driverId,
        ['button', 'combobox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.popupPart,
        driverId,
        ['listbox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['option'],
        'many',
      );
      return;
    case 'type-and-pick':
      if (interaction.kind !== 'autocomplete') {
        throw new TypeError(
          `${path}: capability "type-and-pick" requires autocomplete interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.queryPart,
        driverId,
        ['combobox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.popupPart,
        driverId,
        ['listbox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['option'],
        'many',
      );
      return;
    case 'select-row':
      if (interaction.kind !== 'row-selection') {
        throw new TypeError(
          `${path}: capability "select-row" requires row-selection interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.rowPart,
        driverId,
        ['row'],
        'many',
      );
      requireGenericPartSurface(
        parts,
        interaction.selectionPart,
        driverId,
        ['checkbox', 'radio'],
        'many',
      );
      return;
    case 'add-item':
      if (interaction.kind !== 'repeater') {
        throw new TypeError(
          `${path}: capability "add-item" requires repeater interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.addPart,
        driverId,
        ['button'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.itemPart,
        driverId,
        ['group'],
        'many',
      );
      return;
    case 'expand-item':
      if (interaction.kind !== 'repeater') {
        throw new TypeError(
          `${path}: capability "expand-item" requires repeater interaction`,
        );
      }
      if (interaction.expandPart === undefined) {
        throw new TypeError(
          `${path}: capability "expand-item" requires expandPart`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.expandPart,
        driverId,
        ['button'],
        'many',
      );
      requireGenericPartSurface(
        parts,
        interaction.itemPart,
        driverId,
        ['group'],
        'many',
      );
      return;
  }
}

export function validateGenericDriverSemantics({
  path,
  driver,
  interaction,
  valueShape,
  parts,
  unknowns,
}: GenericDriverSemanticInput): void {
  if (driver.kind === 'application') {
    if (driver.id.startsWith('generic.')) {
      throw new TypeError(
        `${path}: application driver IDs must not use the reserved "generic." prefix`,
      );
    }
    return;
  }

  const expected = GENERIC_DRIVER_BY_INTERACTION[interaction.kind];
  if (driver.id !== expected) {
    throw new TypeError(
      `${path}: interaction ${interaction.kind} requires ${expected}`,
    );
  }
  if (driver.version !== 1) {
    throw new TypeError(
      `${path}: generic driver ${expected} only supports version 1`,
    );
  }

  const requiredValueShape =
    interaction.kind === 'fill'
      ? 'scalar'
      : interaction.kind === 'row-selection' || interaction.kind === 'repeater'
        ? 'array'
        : undefined;
  if (requiredValueShape !== undefined && valueShape !== requiredValueShape) {
    throw new TypeError(
      `${path}: generic driver ${expected} requires valueShape ${requiredValueShape}`,
    );
  }

  const blockingUnknown = unknowns.find(({ aspect }) =>
    GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECT_POLICY.has(aspect),
  );
  if (blockingUnknown !== undefined) {
    throw new TypeError(
      `${path}: generic driver ${expected} is blocked by unknown aspect "${blockingUnknown.aspect}"`,
    );
  }

  const supported = GENERIC_DRIVER_CAPABILITIES[expected];
  const partsByName = new Map(parts.map((part) => [part.name, part]));
  for (const capability of driver.capabilities) {
    if (!supported.has(capability)) {
      throw new TypeError(
        `${path}: ${expected} does not support capability "${capability}"`,
      );
    }
    validateGenericCapabilitySurface(
      capability,
      expected,
      interaction,
      partsByName,
      path,
    );
  }
}
