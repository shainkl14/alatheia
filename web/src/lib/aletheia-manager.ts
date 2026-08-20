/**
 * Browser provider setup for Aletheia — mirrors proof-of-mind/web's
 * BrowserProofOfMindManager, adapted to the single-witness (sourceSecret)
 * private state and the submit-only contract surface.
 */
import '../globals';
import {
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  take,
  throwError,
  timeout,
} from 'rxjs';
import { pipe as fnPipe } from 'fp-ts/function';
import semver from 'semver';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import {
  Binding,
  type FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  type TransactionId,
} from '@midnight-ntwrk/ledger-v8';
import { fromHex, toHex } from '@midnight-ntwrk/compact-runtime';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';

import { AletheiaAPI, type AletheiaCircuitKeys, type AletheiaProviders } from '@api/index.js';
import { createInitialPrivateState, type AletheiaPrivateState } from '@contracts/witnesses.js';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';
import { NETWORK_ID, ZK_ASSET_ORIGIN } from '../config';

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';
const SECRET_STORAGE_KEY = 'aletheia-source-secret';

/**
 * The source secret is generated once per browser and never leaves it. It
 * is the only thing standing between a submission and its author — losing
 * it means losing the ability to prove "this nullifier was mine", which is
 * the point: nobody else, including this dapp, can reconstruct it.
 */
export function getOrCreateSourceSecret(): AletheiaPrivateState {
  const stored = localStorage.getItem(SECRET_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as { sourceSecret: number[] };
    return createInitialPrivateState(new Uint8Array(parsed.sourceSecret));
  }
  const sourceSecret = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(
    SECRET_STORAGE_KEY,
    JSON.stringify({ sourceSecret: Array.from(sourceSecret) }),
  );
  return createInitialPrivateState(sourceSecret);
}

const getFirstCompatibleWallet = (): InitialAPI | undefined => {
  const midnight = (window as any).midnight;
  if (!midnight) return undefined;
  return Object.values(midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      semver.satisfies(String((wallet as InitialAPI).apiVersion), COMPATIBLE_CONNECTOR_API_VERSION),
  );
};

const connectToWallet = (networkId: string): Promise<ConnectedAPI> =>
  firstValueFrom(
    fnPipe(
      interval(100),
      map(() => getFirstCompatibleWallet()),
      filter((api): api is InitialAPI => !!api),
      take(1),
      timeout({
        first: 5_000,
        with: () =>
          throwError(() => new Error('No Midnight wallet found. Install Lace or 1AM.')),
      }),
      concatMap(async (initialAPI) => initialAPI.connect(networkId)),
      timeout({
        first: 15_000,
        with: () => throwError(() => new Error('Wallet failed to connect.')),
      }),
      catchError((error) =>
        throwError(() => (error instanceof Error ? error : new Error('Wallet not authorized'))),
      ),
    ),
  );

async function initializeProviders(): Promise<{
  providers: AletheiaProviders;
  connectedAPI: ConnectedAPI;
  unshieldedAddress: string;
}> {
  setNetworkId(NETWORK_ID as NetworkId);

  const connectedAPI = await connectToWallet(NETWORK_ID);
  const config = await connectedAPI.getConfiguration();
  const proofServerUri = config.proverServerUri;
  if (!proofServerUri) {
    throw new Error('Wallet did not provide a proof server URI.');
  }

  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  const unshielded = await connectedAPI.getUnshieldedAddress();
  const zkConfigProvider = new FetchZkConfigProvider<AletheiaCircuitKeys>(
    ZK_ASSET_ORIGIN,
    fetch.bind(window),
  );

  const providers = {
    privateStateProvider: inMemoryPrivateStateProvider(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const received = await connectedAPI.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  } as AletheiaProviders;

  return {
    providers,
    connectedAPI,
    unshieldedAddress: unshielded.unshieldedAddress,
  };
}

export class BrowserAletheiaManager {
  #providersPromise: ReturnType<typeof initializeProviders> | undefined;
  #apiPromise: Map<string, Promise<AletheiaAPI>> = new Map();

  private getProviders() {
    return this.#providersPromise ?? (this.#providersPromise = initializeProviders());
  }

  async join(contractAddress: string): Promise<AletheiaAPI> {
    const existing = this.#apiPromise.get(contractAddress);
    if (existing) return existing;

    const promise = (async () => {
      const { providers } = await this.getProviders();
      return AletheiaAPI.join(providers, contractAddress, getOrCreateSourceSecret());
    })();

    this.#apiPromise.set(contractAddress, promise);
    return promise;
  }

  async getSession(): Promise<{ unshieldedAddress: string; connectedAPI: ConnectedAPI }> {
    const session = await this.getProviders();
    return { unshieldedAddress: session.unshieldedAddress, connectedAPI: session.connectedAPI };
  }

  async disconnect(): Promise<void> {
    const session = await this.#providersPromise;
    if (session) {
      await (session.connectedAPI as { disconnect?: () => Promise<void> }).disconnect?.();
    }
    this.#providersPromise = undefined;
    this.#apiPromise.clear();
  }
}

export function friendlyError(error: unknown): string {
  const msg = extractErrorMessage(error);
  if (msg.includes('User rejected')) return 'Transaction cancelled.';
  if (msg.includes('already submitted')) return 'This capture has already been submitted.';
  if (msg.includes('No Midnight wallet found')) return msg;
  if (msg.includes('No private state found')) {
    return 'Local secret was not initialized. Reconnect your wallet and try again.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('Failed Proof Server')) {
    return 'Could not reach the proof server. Check wallet network settings and try again.';
  }
  if (msg.includes('not authorized')) return 'Wallet connection was rejected.';
  if (msg.includes('insufficient') || msg.includes('DUST')) {
    return 'Insufficient DUST to pay for this transaction.';
  }
  return msg || 'Unexpected error — check the browser console.';
}

function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error && error.message) return error.message;
  const e = error as { cause?: { failure?: { message?: string; cause?: { message?: string } }; message?: string } };
  if (e.cause?.failure?.message) return e.cause.failure.message;
  if (e.cause?.failure?.cause?.message) return e.cause.failure.cause.message;
  if (e.cause?.message) return e.cause.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
