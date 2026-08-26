import {
  createAssignmentFragment,
  type FixtureFormInstance,
} from '@fixture/forms-kit/forms';

export function createClaimsAssignmentForm(): FixtureFormInstance {
  return {
    fields: createAssignmentFragment(),
    model: { assignment: { team: 'internal', adjusters: [] } },
  };
}
