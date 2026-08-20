import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { witnesses } from './witnesses.js';
import { Contract } from './managed/aletheia/contract/index.js';

/** Browser — relative asset path resolved by FetchZkConfigProvider. */
export const CompiledAletheiaContract = CompiledContract.make(
  'AletheiaContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./managed/aletheia'),
);

export {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
  type ImpureCircuits,
  type PureCircuits,
} from './managed/aletheia/contract/index.js';
