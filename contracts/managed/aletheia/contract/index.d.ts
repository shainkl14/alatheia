import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  sourceSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  submit(context: __compactRuntime.CircuitContext<PS>,
         mediaHash_0: Uint8Array,
         regionId_0: Uint8Array,
         periodYear_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  submit(context: __compactRuntime.CircuitContext<PS>,
         mediaHash_0: Uint8Array,
         regionId_0: Uint8Array,
         periodYear_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  submissionNullifier(mediaHash_0: Uint8Array, sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  submissionNullifier(context: __compactRuntime.CircuitContext<PS>,
                      mediaHash_0: Uint8Array,
                      sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  submit(context: __compactRuntime.CircuitContext<PS>,
         mediaHash_0: Uint8Array,
         regionId_0: Uint8Array,
         periodYear_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  submissions: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { regionId: Uint8Array, periodYear: bigint };
    [Symbol.iterator](): Iterator<[Uint8Array, { regionId: Uint8Array, periodYear: bigint }]>
  };
  readonly submissionCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
