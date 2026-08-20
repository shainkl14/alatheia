import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

/**
 * Public app config — safe to commit (no secrets).
 *
 * Unlike a shipped dapp, Aletheia has not been deployed anywhere yet: no
 * node/indexer/proof-server has been reachable from this environment, so
 * there is no real contract address to hardcode here. The network id
 * defaults to the local 'undeployed' target used by `yarn deploy:undeployed`
 * in the repo root; the contract address is supplied at runtime (URL param
 * `?contract=`, or typed into the connect screen) once a real deploy exists.
 */
export const APP_CONFIG = {
  networkId: 'undeployed' as const,
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  zkAssetPath: '/zk/aletheia',
} as const;

setNetworkId(APP_CONFIG.networkId as NetworkId);

export const NETWORK_ID = APP_CONFIG.networkId;
export const INDEXER_URL = APP_CONFIG.indexer;
export const ZK_ASSET_PATH = APP_CONFIG.zkAssetPath;
export const ZK_ASSET_ORIGIN =
  typeof window !== 'undefined'
    ? new URL(ZK_ASSET_PATH, window.location.origin).toString()
    : ZK_ASSET_PATH;

const CONTRACT_STORAGE_KEY = 'aletheia-contract-address';

export function getStoredContractAddress(): string | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = new URLSearchParams(window.location.search).get('contract');
  if (fromUrl) {
    window.localStorage.setItem(CONTRACT_STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  return window.localStorage.getItem(CONTRACT_STORAGE_KEY);
}

export function setStoredContractAddress(address: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONTRACT_STORAGE_KEY, address);
}

export function clearStoredContractAddress(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CONTRACT_STORAGE_KEY);
}
