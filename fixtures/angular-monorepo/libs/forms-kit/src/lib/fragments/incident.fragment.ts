import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createIncidentFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'incident.severity',
      type: 'select',
      id: 'incident-severity',
      props: {
        label: 'Severity',
        required: true,
        options: [
          { label: 'Low', value: 'low' },
          { label: 'High', value: 'high' },
          { label: 'Critical', value: 'critical' },
        ],
      },
    },
    {
      key: 'incident.summary',
      type: 'textarea',
      id: 'incident-summary',
      props: { label: 'Incident summary', required: true },
    },
    {
      key: 'incident.followUps',
      type: 'expandable-repeater',
      id: 'incident-follow-ups',
      props: { label: 'Follow-up actions', addText: 'Add follow-up' },
      fieldArray: {
        fieldGroup: [
          {
            key: 'owner',
            type: 'input',
            props: { label: 'Owner', required: true },
          },
          {
            key: 'dueDate',
            type: 'input',
            props: { label: 'Due date', type: 'date' },
          },
        ],
      },
    },
  ];
}
