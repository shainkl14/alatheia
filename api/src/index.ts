/**
 * Shared Aletheia contract API — browser (1AM / Lace) and CLI.
 */
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  ContractState,
  fromHex,
  type ContractAddress,
} from '@midnight-ntwrk/compact-runtime';

import {
  CompiledAletheiaContract,
  ledger,
  pureCircuits,
} from '../../contracts/compiled.js';
import type { AletheiaPrivateState } from '../../contracts/witnesses.js';
import {
  aletheiaPrivateStateKey,
  type SubmissionEntry,
  type AletheiaProviders,
  type DeployedAletheiaContract,
  type RegistryState,
} from './common-types.js';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error('Expected 64 hex characters (32 bytes).');
  }
  return fromHex(clean);
}

export class AletheiaAPI {
  readonly contractAddress: ContractAddress;

  private constructor(
    private readonly deployedContract: DeployedAletheiaContract,
    private readonly providers: AletheiaProviders,
  ) {
    this.contractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.contractAddress);
  }

  /**
   * Submit a predicate over a capture. mediaHash, regionId are 32-byte hex
   * digests chosen client-side; periodYear is the disclosed year claim. The
   * source secret is supplied only via the witness — it never enters this
   * call.
   */
  async submit(
    mediaHashHex: string,
    regionIdHex: string,
    periodYear: number,
  ): Promise<void> {
    if (periodYear < 0 || periodYear > 65_535) {
      throw new Error('periodYear must be 0-65535');
    }
    await (this.deployedContract as any).callTx.submit(
      hexToBytes(mediaHashHex),
      hexToBytes(regionIdHex),
      BigInt(periodYear),
    );
  }

  static decodeRegistryState(stateHex: string, networkId?: NetworkId): RegistryState {
    if (networkId !== undefined) {
      setNetworkId(networkId);
    }
    const contractState = ContractState.deserialize(fromHex(stateHex));
    const l = ledger(contractState.data);
    const entries: SubmissionEntry[] = [];

    for (const [key, entry] of l.submissions) {
      entries.push({
        nullifier: bytesToHex(key),
        regionId: bytesToHex(entry.regionId),
        periodYear: Number(entry.periodYear),
      });
    }

    return {
      submissionCount: Number(l.submissionCount as unknown as bigint),
      entries,
    };
  }

  static async fetchRegistryState(
    queryUrl: string,
    contractAddress: string,
    networkId?: NetworkId,
  ): Promise<RegistryState> {
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `query LATEST_CONTRACT_STATE($address: HexEncoded!) {
          contractAction(address: $address) { state }
        }`,
        variables: { address: contractAddress },
      }),
    });
    if (!res.ok) throw new Error(`Indexer HTTP error: ${res.status}`);
    const payload: any = await res.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((e: { message: string }) => e.message).join('; '));
    }
    const hex = payload.data?.contractAction?.state ?? null;
    if (!hex) return { submissionCount: 0, entries: [] };
    return AletheiaAPI.decodeRegistryState(hex, networkId);
  }

  static nullifierPreview(privateState: AletheiaPrivateState, mediaHashHex: string): string {
    return bytesToHex(
      pureCircuits.submissionNullifier(hexToBytes(mediaHashHex), privateState.sourceSecret),
    );
  }

  static async deploy(
    providers: AletheiaProviders,
    privateState: AletheiaPrivateState,
  ): Promise<AletheiaAPI> {
    const deployedContract = await (deployContract as any)(providers, {
      compiledContract: CompiledAletheiaContract,
      privateStateId: aletheiaPrivateStateKey,
      initialPrivateState: privateState,
      args: [],
    });
    return new AletheiaAPI(deployedContract, providers);
  }

  static async join(
    providers: AletheiaProviders,
    contractAddress: ContractAddress,
    privateState: AletheiaPrivateState,
    compiledContract: typeof CompiledAletheiaContract = CompiledAletheiaContract,
  ): Promise<AletheiaAPI> {
    const deployedContract = await findDeployedContract(providers as any, {
      contractAddress,
      compiledContract,
      privateStateId: aletheiaPrivateStateKey,
      initialPrivateState: privateState,
    });
    return new AletheiaAPI(deployedContract, providers);
  }
}

export * from './common-types.js';
