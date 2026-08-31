import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  deployContract,
  submitCallTx,
} from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import pino from 'pino';

import { getConfig } from '../config.js';
import { ensureDust } from '../dust.js';
import { createProviders, type AletheiaProviders } from '../providers.js';
import {
  GENESIS_WALLET_SEED,
  createWallet,
  waitForSyncedWallet,
} from '../wallet.js';
import {
  CompiledAletheiaContract,
  ledger,
  pureCircuits,
  zkConfigPath,
} from '../../contracts/index.js';
import { aletheiaPrivateStateKey } from '../../contracts/constants.js';
import { createInitialPrivateState } from '../../contracts/witnesses.js';

// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const SOURCE_SECRET = new Uint8Array(32).fill(0x01);
const MEDIA_HASH = new Uint8Array(32).fill(0x02);
const REGION_ID = new Uint8Array(32).fill(0x03);
const PERIOD_YEAR = 2026n;

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

describe('Aletheia Contract', () => {
  let walletCtx: Awaited<ReturnType<typeof createWallet>>;
  let aliceProviders: AletheiaProviders;
  let contractAddress: ContractAddress;
  let expectedNullifier: Uint8Array;

  const config = getConfig();

  async function queryLedger(providers: AletheiaProviders) {
    const state =
      await providers.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    return ledger(state!.data);
  }

  beforeAll(async () => {
    setNetworkId(config.networkId);

    expectedNullifier = pureCircuits.submissionNullifier(MEDIA_HASH, SOURCE_SECRET);

    walletCtx = await createWallet(config, GENESIS_WALLET_SEED);
    await waitForSyncedWallet(walletCtx.wallet, 600_000);
    await ensureDust(walletCtx);

    aliceProviders = createProviders(walletCtx, zkConfigPath, config, 'test');
    logger.info('Providers initialized. Ready to test!');
  });

  afterAll(async () => {
    if (walletCtx) {
      logger.info('Stopping wallet...');
      await walletCtx.wallet.stop();
    }
  });

  it('deploys the contract', async () => {
    const deployed: any = await (deployContract as any)(aliceProviders, {
      compiledContract: CompiledAletheiaContract,
      privateStateId: aletheiaPrivateStateKey,
      initialPrivateState: createInitialPrivateState(SOURCE_SECRET),
      args: [],
    });

    contractAddress = deployed.deployTxData.public.contractAddress;
    logger.info(`Contract deployed at: ${contractAddress}`);
    expect(contractAddress).toBeDefined();
    expect(contractAddress.length).toBeGreaterThan(0);

    const state = await queryLedger(aliceProviders);
    expect(state.submissionCount).toEqual(0n);
  });

  it('submits a predicate over a capture with a disclosed nullifier only', async () => {
    await (submitCallTx as any)(aliceProviders, {
      compiledContract: CompiledAletheiaContract,
      contractAddress,
      privateStateId: aletheiaPrivateStateKey,
      circuitId: 'submit',
      args: [MEDIA_HASH, REGION_ID, PERIOD_YEAR],
    });

    const state = await queryLedger(aliceProviders);
    expect(state.submissionCount).toEqual(1n);
    expect(state.submissions.member(expectedNullifier)).toBe(true);

    const entry = state.submissions.lookup(expectedNullifier);
    expect(entry.regionId).toEqual(REGION_ID);
    expect(entry.periodYear).toEqual(PERIOD_YEAR);
  });

  it('rejects a replayed submission of the same capture', async () => {
    await expect(
      (submitCallTx as any)(aliceProviders, {
        compiledContract: CompiledAletheiaContract,
        contractAddress,
        privateStateId: aletheiaPrivateStateKey,
        circuitId: 'submit',
        args: [MEDIA_HASH, REGION_ID, PERIOD_YEAR],
      }),
    ).rejects.toThrow();
  });
});
