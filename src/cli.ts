import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import { AletheiaAPI } from '../api/src/node.js';
import { CompiledAletheiaContract } from '../contracts/index.js';
import { getConfig } from './config.js';
import { ensureDust } from './dust.js';
import { createProviders } from './providers.js';
import {
  createWallet,
  resolveDeploySeed,
  unshieldedToken,
  waitForSyncedWallet,
} from './wallet.js';
import { createInitialPrivateState } from '../contracts/witnesses.js';
import { zkConfigPath } from '../contracts/index.js';

// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const PROVIDER_STORE_SUFFIX = 'cli';

type DeploymentRecord = {
  network: string;
  contractAddress: string;
  deployedAt: string;
};

function loadDeployment(): DeploymentRecord {
  const path = resolve(process.cwd(), 'deployment.json');
  if (!existsSync(path)) {
    throw new Error('No deployment.json found. Run yarn deploy first.');
  }
  return JSON.parse(readFileSync(path, 'utf8')) as DeploymentRecord;
}

function truncHex(hex: string, head = 10, tail = 8): string {
  return hex.length <= head + tail + 1 ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

function randomHex32(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const deployment = loadDeployment();
  if (!process.env['MIDNIGHT_NETWORK']) {
    process.env['MIDNIGHT_NETWORK'] =
      deployment.network === 'undeployed' ? 'local' : deployment.network;
  }

  const config = getConfig();
  const seed = resolveDeploySeed(config.networkId);
  setNetworkId(config.networkId);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     Aletheia CLI                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`  Contract: ${deployment.contractAddress}`);
  console.log(`  Network:  ${config.networkId}\n`);

  if (
    deployment.network !== config.networkId &&
    !(deployment.network === 'undeployed' && config.networkId === 'undeployed')
  ) {
    console.error(
      `  deployment.json is for "${deployment.network}" but MIDNIGHT_NETWORK is "${config.networkId}".`,
    );
    console.error(`  Run: MIDNIGHT_NETWORK=${deployment.network} yarn cli\n`);
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log('  Connecting to wallet...');
    const walletCtx = await createWallet(config, seed);

    console.log('  Syncing with network...');
    console.log('  This may take several minutes depending on network size.');
    console.log('  RPC disconnection messages during sync are normal and can be safely ignored.\n');

    const syncStart = Date.now();
    const syncInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - syncStart) / 1000);
      process.stdout.write(`\r  Still syncing... (${elapsed}s elapsed)   `);
    }, 5000);

    await waitForSyncedWallet(walletCtx.wallet, 600_000);
    clearInterval(syncInterval);
    process.stdout.write('\r  Synced with network.                                      \n');

    const state = await walletCtx.wallet.waitForSyncedState();
    const tNight = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    const dust = state.dust.balance(new Date());
    console.log(`  Balance: ${tNight.toLocaleString()} tNight`);
    console.log(`  DUST:    ${dust.toLocaleString()}\n`);

    if (tNight === 0n && config.networkId !== 'undeployed' && config.faucet) {
      console.log('  Wallet has no tNight. Fund it from the faucet to send transactions:');
      console.log(`     ${config.faucet}`);
      console.log(`     Wallet: ${walletCtx.unshieldedKeystore.getBech32Address()}\n`);
    }

    await ensureDust(walletCtx);

    console.log('  Joining contract via findDeployedContract...');
    const providers = createProviders(walletCtx, zkConfigPath, config, PROVIDER_STORE_SUFFIX);
    // Each source's sourceSecret is generated once and kept locally; this CLI
    // session generates a fresh one per run for demo purposes.
    let sourceSecretHex = randomHex32();
    let privateState = createInitialPrivateState(
      Uint8Array.from(Buffer.from(sourceSecretHex, 'hex')),
    );
    const api = await AletheiaAPI.join(
      providers,
      deployment.contractAddress,
      privateState,
      CompiledAletheiaContract,
    );

    console.log('  Connected!\n');
    console.log(`  Session source secret: ${truncHex(sourceSecretHex, 14, 10)} (local only, never sent)\n`);

    let running = true;
    while (running) {
      console.log('─── Menu ───────────────────────────────────────────────────────');
      console.log('  1. Submit a capture predicate');
      console.log('  2. List submissions (on-chain)');
      console.log('  3. Preview my nullifier for a media hash');
      console.log('  4. Check wallet balance');
      console.log('  5. Exit\n');

      const choice = await rl.question('  Your choice: ');

      switch (choice.trim()) {
        case '1': {
          const mediaHash = (await rl.question('  Media hash (64 hex, blank = random): ')).trim() || randomHex32();
          const regionId = (await rl.question('  Region id (64 hex, blank = random): ')).trim() || randomHex32();
          const periodYearStr = await rl.question('  Period year (e.g. 2026): ');
          const periodYear = Number(periodYearStr);
          if (!Number.isInteger(periodYear) || periodYear < 0 || periodYear > 65_535) {
            console.log('\n  Invalid year.\n');
            break;
          }
          console.log('\n  Submitting (this may take 30-60 seconds)...');
          try {
            await api.submit(mediaHash, regionId, periodYear);
            console.log('\n  Submitted.\n');
          } catch (error) {
            console.error('\n  Failed:', error instanceof Error ? error.message : error, '\n');
          }
          break;
        }

        case '2': {
          console.log('\n  Reading submissions from indexer...');
          try {
            const registry = await AletheiaAPI.fetchRegistryState(
              config.indexer,
              deployment.contractAddress,
            );
            if (registry.entries.length === 0) {
              console.log('\n  No submissions yet.\n');
              break;
            }
            console.log(`\n  ${registry.entries.length} submission(s), total: ${registry.submissionCount}\n`);
            registry.entries.forEach((entry, i) => {
              console.log(`  ${i + 1}. nullifier: ${entry.nullifier}`);
              console.log(`     region:    ${entry.regionId}`);
              console.log(`     year:      ${entry.periodYear}\n`);
            });
          } catch (error) {
            console.error('\n  Failed:', error instanceof Error ? error.message : error, '\n');
          }
          break;
        }

        case '3': {
          const mediaHash = (await rl.question('  Media hash (64 hex): ')).trim();
          try {
            const preview = AletheiaAPI.nullifierPreview(privateState, mediaHash);
            console.log(`\n  Nullifier: ${preview}\n`);
          } catch (error) {
            console.error('\n  Failed:', error instanceof Error ? error.message : error, '\n');
          }
          break;
        }

        case '4': {
          const current = await walletCtx.wallet.waitForSyncedState();
          const currentTNight = current.unshielded.balances[unshieldedToken().raw] ?? 0n;
          const currentDust = current.dust.balance(new Date());
          console.log(`\n  tNight: ${currentTNight.toLocaleString()}`);
          console.log(`  DUST:   ${currentDust.toLocaleString()}\n`);
          break;
        }

        case '5':
          running = false;
          console.log('\n  Goodbye.\n');
          break;

        default:
          console.log('\n  Invalid choice. Please enter 1-5.\n');
      }
    }

    await walletCtx.wallet.stop();
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
