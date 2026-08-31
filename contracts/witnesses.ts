import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type AletheiaPrivateState = {
  sourceSecret: Uint8Array;
};

export const witnesses = {
  sourceSecret: (context: WitnessContext<AletheiaPrivateState>) =>
    [context.privateState, context.privateState.sourceSecret] as const,
};

export function createInitialPrivateState(sourceSecret: Uint8Array): AletheiaPrivateState {
  return { sourceSecret };
}
