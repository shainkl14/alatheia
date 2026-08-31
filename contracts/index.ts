import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { witnesses } from './witnesses.js';
import { Contract } from './managed/aletheia/contract/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const zkConfigPath = path.resolve(currentDir, 'managed', 'aletheia');

/** Node CLI / deploy — absolute asset path for NodeZkConfigProvider. */
export const CompiledAletheiaContract = CompiledContract.make(
  'AletheiaContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

export {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
  type ImpureCircuits,
  type PureCircuits,
} from './managed/aletheia/contract/index.js';
export { aletheiaPrivateStateKey } from './constants.js';
export {
  witnesses,
  createInitialPrivateState,
  type AletheiaPrivateState,
} from './witnesses.js';
