import {
  createCustomerFragment,
  type FixtureFormInstance,
} from '@fixture/forms-kit/forms';

export function createCustomerOnboardingForm(): FixtureFormInstance {
  return {
    fields: createCustomerFragment(),
    model: { customer: { acceptTerms: false } },
  };
}
