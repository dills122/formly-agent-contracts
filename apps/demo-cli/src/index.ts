import { canonicalStringify } from '@formly-agent-contracts/contract-schema';

import { createGoldenContract } from './create-golden-contract.js';

process.stdout.write(`${canonicalStringify(createGoldenContract())}\n`);
