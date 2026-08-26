import {
  createIncidentFragment,
  type FixtureFormInstance,
} from '@fixture/forms-kit/forms';

export function createIncidentForm(): FixtureFormInstance {
  return {
    fields: createIncidentFragment(),
    model: { incident: { severity: 'high', followUps: [] } },
  };
}
