import {
  createClaimDetailsFragment,
  createContactFragment,
  type FixtureFormInstance,
} from '@fixture/forms-kit/forms';

export function createClaimIntakeForm(): FixtureFormInstance {
  return {
    fields: [...createContactFragment(), ...createClaimDetailsFragment()],
    model: {
      claimant: {
        contactPreference: 'email',
      },
    },
  };
}
