import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createAssignmentFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'assignment.team',
      type: 'cool-radio-btn-grp',
      id: 'assignment-team',
      props: {
        label: 'Assignment team',
        options: [
          { label: 'Internal', value: 'internal' },
          { label: 'Partner', value: 'partner' },
        ],
      },
    },
    {
      key: 'assignment.adjusters',
      type: 'table-select',
      id: 'assignment-adjusters',
      defaultValue: [],
      props: {
        label: 'Available adjusters',
        rowOptions: [
          { id: 'adjuster-1', label: 'Alex Morgan' },
          { id: 'adjuster-2', label: 'Sam Rivera' },
        ],
      },
    },
  ];
}
