import * as Rx from 'rxjs';
import type { WalletContext } from './wallet.js';

/** Register NIGHT for DUST and wait until spendable DUST is available. */
export async function ensureDust(
  walletCtx: WalletContext,
  timeoutMs = 180_000,
): Promise<void> {
  let state = await walletCtx.wallet.waitForSyncedState();

  if (state.dust.balance(new Date()) > 0n) {
    return;
  }

  const unregistered = state.unshielded.availableCoins.filter(
    (coin) => coin.meta.registeredForDustGeneration !== true,
  );

  if (unregistered.length > 0) {
    const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
      unregistered,
      walletCtx.unshieldedKeystore.getPublicKey(),
      (payload) => walletCtx.unshieldedKeystore.signData(payload),
    );
    const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
    await walletCtx.wallet.submitTransaction(finalized);
    state = await walletCtx.wallet.waitForSyncedState();
  }

  await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.filter((s) => s.isSynced),
      Rx.filter((s) => s.dust.balance(new Date()) > 0n),
      Rx.timeout({
        first: timeoutMs,
        with: () =>
          Rx.throwError(
            () =>
              new Error(
                `Timed out waiting for DUST after ${timeoutMs}ms. Fund NIGHT and register for DUST first.`,
              ),
          ),
      }),
    ),
  );
}
