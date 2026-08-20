# Aletheia — HANDOFF

## Verified working now
- `contracts/aletheia.compact` compiles clean under `compact compile +0.31.1` (compiler 0.5.1 at
  `~/.local/bin/compact`). Scoped to `submit(mediaHash, regionId, periodYear)` with
  `submissions: Map<Bytes<32>, SubmissionRecord>` + `submissionCount: Counter`, nullifier =
  `persistentHash(["alt:sub:v1", mediaHash, sourceSecret])`. No var/mutable loop accumulators.
  Full protocol design (manufacturerRoots/revokedCerts/juryThreshold/ciphertextCommit) is documented
  in `docs/protocol.md` but deliberately NOT in the contract yet.
- Node-side (`src/`, `api/`) `npx tsc --noEmit` clean.
- **`web/` (Astro 5 + Preact) is built AND runtime-verified**, not just typechecked:
  - `cd web && yarn install` — clean.
  - `npx astro check` — 0 errors, 0 warnings (1 pre-existing deprecation hint inherited from
    upstream `dapp-connector-api` field name, harmless).
  - `yarn build` — all 4 pages build, wasm assets (ledger/onchain-runtime) bundle correctly.
  - `yarn dev` + curl smoke test — `/`, `/submit`, `/ledger`, `/for-sources` all return 200 with
    real rendered content (`ALETHEIA`, `This is permanent once sent`, etc. verified present in HTML).
  - Pages: `/` (about), `/submit` (the drop — 5-step: opsec brief → client-side SHA-256 file hash →
    region/year disclosure → irreversible confirm screen → wallet connect + submit), `/ledger`
    (public registry read via indexer GraphQL), `/for-sources`.
  - Editorial design implemented per `docs/product.md` spec: Newsreader serif, self-hosted Inter for
    uppercase micro-labels, `#B00020` vermilion reserved only for irreversible-action buttons, zero
    radius, light/dark paper-inversion via `prefers-color-scheme`, no CDN (fonts self-hosted via
    `@fontsource/*`), no analytics/tracking/cookies.
  - Fixed two real bugs found via `astro check` (not caught by plain `tsc`): pinned `@swc/core` to
    `1.15.43` in resolutions (default-resolved version broke `vite-plugin-top-level-await`'s rollup
    step), and swapped rxjs's standalone `pipe()` for `fp-ts`'s `pipe()` in
    `web/src/lib/aletheia-manager.ts` (different call signatures — rxjs's doesn't thread an initial
    Observable the way this needed).
- git log tip: `4fca083 web: fix build (pin @swc/core, use fp-ts pipe) — verified working`.

## Environment (checked directly this session)
- Docker: NOT available in this WSL sandbox. No real deploy possible here.
- node (9944), indexer (8088), proof-server (6300): unreachable via curl (000) this session.
- No `deployment.json` exists and none has been fabricated — do not create one without a real
  successful `yarn deploy` run.
- No Midnight wallet extension in this sandbox, so wallet-connect / actual submit-transaction flow
  is UNTESTED at runtime — only build/typecheck/page-render verified. Say so if asked.

## In progress / not started
- `src/test/aletheia.test.ts` exists but has not been run (needs testcontainers+docker or a live
  network, neither available here).
- Contract only implements bare `submit`; manufacturerRoots/revokedCerts/juryThreshold from
  docs/protocol.md are documented intent, not implemented.
- No `/desk` (editor-facing) page yet — docs/product.md describes it as a separate, denser UI;
  out of scope so far, only the public `/ledger` read view exists.

## Next step
Either (a) implement the `/desk` editor view per docs/product.md section on "The desk", or (b)
extend the contract toward manufacturerRoots/revokedCerts/juryThreshold and regenerate
`contracts/managed/aletheia` + rerun `yarn sync:zk`. Whichever is picked, re-run
`cd web && yarn build && npx astro check` after any contract/witness shape change since the web
API types are structurally coupled to `contracts/witnesses.ts` and `api/src/common-types.ts`.

## Blockers / decisions
- Cannot test end-to-end (no docker, no reachable node/indexer/proof-server, no wallet extension).
  All work is compile/build/render verified only, not transaction-verified. Do not claim "deployed"
  or "works end to end" anywhere.
- Compact CLI is 0.5.1; contract targets `+0.31.1` language version via the toolchain selector.
