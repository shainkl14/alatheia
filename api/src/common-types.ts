import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { aletheiaPrivateStateKey } from '../../contracts/constants.js';
import type { AletheiaPrivateState } from '../../contracts/witnesses.js';

export { aletheiaPrivateStateKey };

export type AletheiaCircuitKeys = 'submit';
export type AletheiaProviders = MidnightProviders<
  AletheiaCircuitKeys,
  typeof aletheiaPrivateStateKey,
  AletheiaPrivateState
>;
export type DeployedAletheiaContract = FoundContract<any>;

export type SubmissionEntry = {
  nullifier: string;
  regionId: string;
  periodYear: number;
};

export type RegistryState = {
  submissionCount: number;
  entries: SubmissionEntry[];
};
