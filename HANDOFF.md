# Aletheia — HANDOFF

## Verified working now
- `contracts/aletheia.compact` compiles clean: `compact compile +0.31.1` (compiler 0.5.1 installed at
  `~/.local/bin/compact`). Scoped to a single circuit `submit(mediaHash, regionId, periodYear)` with
  ledger `submissions: Map<Bytes<32>, SubmissionRecord>` + `submissionCount: Counter`, nullifier =
  `persistentHash(["alt:sub:v1", mediaHash, sourceSecret])`. No `var`/mutable loop accumulators.
  Full design (manufacturerRoots/revokedCerts/juryThreshold/ciphertextCommit) is in `docs/protocol.md`
  but NOT yet in the contract — deliberately scoped down to compile under 0.31.1, same lesson other
  sibling repos hit.
- `npx tsc --noEmit -p tsconfig.json` passes clean across src/ and api/.
- Node-side scaffolding committed at c0c0af1: `src/{config,providers,deploy,dust,wallet,cli}.ts`,
  `api/src/{index,node,common-types}.ts`, `compose.yml`, `contracts/managed/aletheia/**` build output,
  `scripts/{setup-l1.sh,sync-zk-assets.mjs}`. Mirrors patterns from `/home/fahmin/midnight/proof-of-mind`.
- git log tip: `c0c0af1 node: deploy/CLI/api scaffolding + scoped-down submit-only contract`.

## Environment (checked directly, don't trust stale notes)
- Docker: NOT available in this WSL sandbox (`docker` command not found). No real deploy possible here.
- node (9944), indexer (8088), proof-server (6300): all unreachable via curl (000) as of this session.
- Therefore: NO `deployment.json` exists and none has been fabricated. Do not create one without a real
  successful `yarn deploy` run against a reachable node.

## In progress / not started
- `web/` (Astro 5 + Preact islands) does not exist yet. This is the next major piece.
- `src/test/aletheia.test.ts` exists (122 lines) but has NOT been run (needs a live/undeployed network
  or testcontainers + docker, neither available here) — status unknown, not verified passing.
- Contract only implements bare `submit`; manufacturerRoots/revokedCerts/juryThreshold from
  docs/protocol.md are documented intent, not implemented.

## Next step
Build `web/` scaffold: `yarn create astro@latest web` (or manual scaffold matching proof-of-mind's
`web/` structure) with Preact integration, editorial newspaper design (Newsreader serif, uppercase
micro-labels, pure white/black, vermilion #B00020 reserved only for irreversible actions, zero radius,
no tracking/cookies/analytics/CDN). Wire wallet connect + submit flow against `src/providers.ts` /
`contracts/index.ts` exports, following proof-of-mind/web patterns but with fully distinct visual design
(the other 9 projects in this directory must not be resembled).

## Blockers / decisions
- Can't test end-to-end (no docker, no reachable node/indexer/proof-server) — all node-side work is
  compile/typecheck-verified only, not runtime-verified. Flag this clearly to the user; do not claim
  "deployed" or "working end to end" anywhere.
- Compact compiler version pinned via `+0.31.1` toolchain selector; base `compact` CLI itself is 0.5.1.
