import { useState } from 'preact/hooks';
import {
  APP_CONFIG,
  getStoredContractAddress,
  setStoredContractAddress,
} from '../config';

type Step = 'brief' | 'file' | 'disclose' | 'confirm' | 'connect' | 'submitting' | 'done' | 'error';

const REGIONS = [
  'Undisclosed',
  'Europe',
  'North America',
  'South America',
  'Africa',
  'Asia',
  'Oceania',
];

const YEARS = Array.from({ length: 6 }, (_, i) => 2026 - i);

async function sha256Hex(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function SubmitForm() {
  const [step, setStep] = useState<Step>('brief');
  const [briefUnlockedAt, setBriefUnlockedAt] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mediaHash, setMediaHash] = useState<string | null>(null);
  const [region, setRegion] = useState(REGIONS[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [contractAddress, setContractAddress] = useState(getStoredContractAddress() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const canProceedBrief = briefUnlockedAt !== null && briefUnlockedAt !== -1;

  function startBriefTimer() {
    setTimeout(() => setBriefUnlockedAt(Date.now()), 8_000);
    setBriefUnlockedAt(-1); // marks "timer started" until real timestamp lands
  }

  async function onFileSelected(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    setFile(f);
    const buf = await f.arrayBuffer();
    setMediaHash(await sha256Hex(buf));
  }

  async function doSubmit() {
    setStep('submitting');
    setError(null);
    try {
      if (!mediaHash) throw new Error('No file hash computed.');
      if (!contractAddress) throw new Error('No contract address set.');
      setStoredContractAddress(contractAddress);

      const regionIdHex = await sha256Hex(new TextEncoder().encode(region));

      const { BrowserAletheiaManager } = await import('../lib/aletheia-manager');
      const manager = new BrowserAletheiaManager();
      const api = await manager.join(contractAddress);
      await api.submit(mediaHash, regionIdHex, year);
      setTxId('submitted');
      setStep('done');
    } catch (err) {
      const { friendlyError } = await import('../lib/aletheia-manager');
      setError(friendlyError(err));
      setStep('error');
    }
  }

  return (
    <div>
      {step === 'brief' && (
        <section>
          <p class="label">Step 1 of 5 — Before you begin</p>
          <h2>This is permanent once sent</h2>
          <p>
            The file never leaves your device. Only a hash of it, a region you choose, and a year
            you choose are ever sent — but those three things, once sent, are published forever and
            cannot be withdrawn.
          </p>
          <ul>
            <li>Read <a href="/for-sources">For Sources</a> if you have not already.</li>
            <li>Use a personal device, on a network that is not your employer's.</li>
            <li>Nothing you type here is saved anywhere but this browser tab's memory.</li>
          </ul>
          {briefUnlockedAt === null && (
            <button onClick={startBriefTimer}>I've read this — continue in 8s</button>
          )}
          {briefUnlockedAt === -1 && <button disabled>Please wait…</button>}
          {canProceedBrief && <button onClick={() => setStep('file')}>Continue</button>}
        </section>
      )}

      {step === 'file' && (
        <section>
          <p class="label">Step 2 of 5 — Add the file</p>
          <h2>Choose a file</h2>
          <p class="note">
            Hashing happens in your browser. The file itself is never read by this page beyond
            computing that hash, and is never uploaded anywhere.
          </p>
          <div class="field">
            <input type="file" onChange={onFileSelected} />
          </div>
          {mediaHash && (
            <div class="callout">
              <p class="label">Media hash (SHA-256)</p>
              <p class="mono" style="margin-bottom: 0;">{mediaHash}</p>
            </div>
          )}
          <button onClick={() => setStep('brief')}>Back</button>{' '}
          <button disabled={!mediaHash} onClick={() => setStep('disclose')}>
            Continue
          </button>
        </section>
      )}

      {step === 'disclose' && (
        <section>
          <p class="label">Step 3 of 5 — Choose what to prove</p>
          <h2>Region and period</h2>
          <p class="note">
            These are the only two facts about the file that will ever be public. Choosing
            "Undisclosed" region narrows nothing about where; the full anonymity-set model in
            <code> docs/product.md</code> is not yet wired into this prototype's UI.
          </p>
          <div class="field">
            <label class="label" for="region">Region</label>
            <select id="region" value={region} onChange={(e) => setRegion((e.currentTarget as HTMLSelectElement).value)}>
              {REGIONS.map((r) => (
                <option value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div class="field">
            <label class="label" for="year">Year captured</label>
            <select id="year" value={String(year)} onChange={(e) => setYear(Number((e.currentTarget as HTMLSelectElement).value))}>
              {YEARS.map((y) => (
                <option value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setStep('file')}>Back</button>{' '}
          <button onClick={() => setStep('confirm')}>Continue</button>
        </section>
      )}

      {step === 'confirm' && (
        <section>
          <hr class="rule-vermilion" style="margin-bottom: 20px;" />
          <p class="label" style="color: var(--vermilion);">Step 4 of 5 — This is permanent</p>
          <h2>These will be published forever</h2>
          <ul>
            <li>A hash of your file: <span class="mono">{mediaHash}</span></li>
            <li>Region: <strong>{region}</strong></li>
            <li>Year: <strong>{year}</strong></li>
          </ul>
          <h3>These will never be published</h3>
          <ul>
            <li>The file itself</li>
            <li>Anything about you, including your wallet's identity beyond a transaction record</li>
          </ul>
          <button onClick={() => setStep('disclose')}>Back</button>{' '}
          <button class="irreversible" onClick={() => setStep('connect')}>
            Continue to wallet
          </button>
        </section>
      )}

      {step === 'connect' && (
        <section>
          <p class="label">Step 5 of 5 — Connect and send</p>
          <h2>Contract and wallet</h2>
          <p class="note">
            Aletheia has not been deployed to a reachable network from this build environment.
            Paste a contract address here once one exists (network: <code>{APP_CONFIG.networkId}</code>).
          </p>
          <div class="field">
            <label class="label" for="contract">Contract address</label>
            <input
              id="contract"
              type="text"
              placeholder="0x…"
              value={contractAddress}
              onInput={(e) => setContractAddress((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
          <button onClick={() => setStep('confirm')}>Back</button>{' '}
          <button class="irreversible" disabled={!contractAddress} onClick={doSubmit}>
            Send
          </button>
        </section>
      )}

      {step === 'submitting' && (
        <section>
          <p class="label">Sending</p>
          <h2>Generating the proof…</h2>
          <p>
            This runs entirely against your wallet's proof server and can take 20–30 seconds. Do
            not close this tab.
          </p>
        </section>
      )}

      {step === 'done' && (
        <section>
          <p class="label">Sent</p>
          <h2>Received</h2>
          <p>Your submission was recorded. {txId}</p>
        </section>
      )}

      {step === 'error' && (
        <section>
          <p class="label" style="color: var(--vermilion);">Something went wrong</p>
          <div class="callout vermilion">
            <p style="margin-bottom: 0;">{error}</p>
          </div>
          <button onClick={() => setStep('connect')}>Back</button>
        </section>
      )}
    </div>
  );
}
