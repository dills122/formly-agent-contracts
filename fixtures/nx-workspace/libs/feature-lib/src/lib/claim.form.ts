import {
  createNxContactFragment,
  type NxFixtureFormInstance,
} from '@nx-fixture/forms-kit/forms';

export interface NxClaimFormOptions {
  readonly initialReference?: string;
}

export function createNxClaimForm(
  options: NxClaimFormOptions = {},
): NxFixtureFormInstance {
  return {
    fields: [
      ...createNxContactFragment(),
      {
        key: 'claim.reference',
        type: 'input',
        id: 'nx-claim-reference',
        props: { label: 'Claim reference', required: true },
      },
    ],
    model: {
      claimant: { contactPreference: 'email' },
      ...(options.initialReference === undefined
        ? {}
        : { claim: { reference: options.initialReference } }),
    },
  };
}
