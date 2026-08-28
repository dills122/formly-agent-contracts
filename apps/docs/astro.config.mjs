import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const repository = 'https://github.com/dills122/formly-contract';

export default defineConfig({
  integrations: [
    starlight({
      disable404Route: true,
      title: 'Formly Contract',
      description:
        'Deterministic, agent-readable contracts for Angular Formly forms.',
      favicon: '/favicon.svg',
      lastUpdated: true,
      customCss: ['./tokens.css', './src/styles/custom.css'],
      editLink: {
        baseUrl: `${repository}/edit/main/apps/docs/`,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: repository,
        },
      ],
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'Evaluate the project', slug: 'start' },
            { label: 'Installation', slug: 'start/installation' },
            { label: 'End-to-end vertical', slug: 'start/end-to-end' },
            { label: 'Product status', slug: 'start/product-status' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Architecture', slug: 'concepts/architecture' },
            {
              label: 'Evidence and unknowns',
              slug: 'concepts/evidence-and-unknowns',
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Package responsibilities', slug: 'reference/packages' },
            { label: 'Workspace configuration', slug: 'reference/workspace' },
            { label: 'Form sources', slug: 'reference/form-sources' },
            { label: 'Custom field profiles', slug: 'reference/field-profiles' },
            { label: 'Artifacts and linkage', slug: 'reference/artifacts' },
            { label: 'CLI and API', slug: 'reference/cli-api' },
          ],
        },
        {
          label: 'Resources',
          items: [
            { label: 'Troubleshooting', slug: 'resources/troubleshooting' },
            {
              label: 'Research and roadmap',
              slug: 'resources/research-roadmap',
            },
            { label: 'Contributing to docs', slug: 'resources/contributing' },
            { label: 'Site architecture', slug: 'resources/site-architecture' },
          ],
        },
      ],
    }),
  ],
});
