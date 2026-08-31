import { useState } from 'preact/hooks';
import { INDEXER_URL, getStoredContractAddress, setStoredContractAddress } from '../config';
import type { RegistryState } from '@api/index.js';

export default function Ledger() {
  const [contractAddress, setContractAddress] = useState(getStoredContractAddress() ?? '');
  const [state, setState] = useState<RegistryState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    setState(null);
    try {
      if (!contractAddress) throw new Error('Enter a contract address.');
      setStoredContractAddress(contractAddress);
      const { AletheiaAPI } = await import('@api/index.js');
      const result = await AletheiaAPI.fetchRegistryState(INDEXER_URL, contractAddress);
      setState(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div class="field">
        <label class="label" for="ledger-contract">Contract address</label>
        <input
          id="ledger-contract"
          type="text"
          placeholder="0x…"
          value={contractAddress}
          onInput={(e) => setContractAddress((e.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <button onClick={load} disabled={loading || !contractAddress}>
        {loading ? 'Reading…' : 'Read ledger'}
      </button>

      {error && (
        <div class="callout vermilion" style="margin-top: 20px;">
          <p style="margin-bottom: 0;">{error}</p>
        </div>
      )}

      {state && (
        <div style="margin-top: 28px;">
          <p class="label">Total submissions</p>
          <h2 style="margin-top: 4px;">{state.submissionCount}</h2>

          {state.entries.length === 0 ? (
            <p class="note">No submissions recorded yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nullifier</th>
                  <th>Region hash</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {state.entries.map((entry) => (
                  <tr>
                    <td class="mono">{entry.nullifier.slice(0, 16)}…</td>
                    <td class="mono">{entry.regionId.slice(0, 16)}…</td>
                    <td>{entry.periodYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
