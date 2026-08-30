# Aletheia

> ἀλήθεια — *disclosure; the state of not being hidden.*

A secure drop where a document can prove it is real without proving who sent it.

---

## Read this first

If you are a source considering using Aletheia to submit material, **stop and
read [`docs/for-sources.md`](docs/for-sources.md) before you touch anything
else.** The most dangerous failures in this domain are operational, not
cryptographic, and no protocol in this repository protects you from submitting
from your work laptop.

If you are a developer, journalist, or reviewer, continue here.

---

## The problem

Authenticity and anonymity are usually in direct opposition.

A leaked photograph is worth very little if a newsroom cannot establish that it
is genuine. The industry's answer to synthetic media is content provenance:
C2PA, signed at capture by the camera's secure element, carrying the device
identifier, the capture timestamp, the GPS fix, and a hash chain of every
subsequent edit. It works. It is also, from a source's perspective, a
confession — the same manifest that proves the image is real proves who took it,
where, and when.

So the source faces a choice: strip the metadata and be dismissed as
unverifiable, or keep it and be identified. In several documented cases, the
second option ended a career or worse.

## What Aletheia does

It breaks the choice. A source uploads a C2PA-signed capture. In their browser,
Aletheia generates a zero-knowledge proof of a *predicate over the manifest*
rather than the manifest itself:

> "This file carries a valid signature from a hardware capture device whose
> manufacturer certificate chains to a root in the public registry. It was
> captured inside geographic region **R** during month **M**. Its edit chain
> contains no generative operations. I am not revealing the device serial, the
> exact coordinates, the exact time, the signing certificate, or myself."

The newsroom receives the file, the proof, and nothing else. The proof is
verifiable by anyone, forever, without Aletheia existing.

## The initial product idea

A submission platform for journalism where provenance travels as a proof, not as
metadata. Media captured on C2PA-compliant hardware is verified in the source's
own browser against a public registry of manufacturer root keys held on
Midnight. The source chooses the granularity of every disclosed field
independently — country instead of coordinates, month instead of timestamp,
"a Sony camera" instead of a serial number — and the interface shows, in plain
language and in bits, exactly how identifying each choice makes them. The
resulting proof is published alongside the file. Editorial control is split: the
key that can open a submission's contact channel is threshold-shared across a
named jury of editors, so no single person, and no single subpoena, can unmask a
source. Every published story can carry an Aletheia badge that any reader can
verify independently.

## Public / private

| | Private | Public |
|---|---|---|
| Media file | held by the newsroom, encrypted at rest | only if the newsroom publishes it |
| Device serial number | never leaves the browser | — |
| Exact GPS coordinates | never leave the browser | — |
| Exact capture timestamp | never leaves the browser | — |
| Signing certificate | never leaves the browser | — |
| Source identity | never entered anywhere | — |
| Region claim (e.g. "Ukraine") | | published, at the source's chosen granularity |
| Period claim (e.g. "March 2026") | | published, at the source's chosen granularity |
| Manufacturer class | | published, if the source allows |
| "No generative edits" | | published |
| Submission nullifier | | published — prevents replay, links nothing |

## Repository

```
contract/          Compact sources
docs/
  for-sources.md   Operational security. Written for non-technical readers.
  protocol.md      Circuits, registry, threshold custody
  threats.md       Adversary model, attacks, what we cannot stop
  product.md       Interface specification
web/               Astro 5, Preact islands, no tracking of any kind
```

## Running it

Node 22, Docker, Compact 0.31.1.

```bash
pnpm install
pnpm proofserver             # local only, always
pnpm build:circuits
pnpm test
pnpm deploy --network preprod
pnpm dev
```

The public instance serves no third-party scripts, sets no cookies, logs no IP
addresses, and is also available as an onion service. These are requirements,
not features.

## What we cannot do

We cannot protect you from your own network. We cannot protect you if the
document itself identifies you — a report with four recipients narrows to four
people no matter what the metadata says. We cannot stop a court compelling a
newsroom. We can make sure the newsroom has nothing useful to hand over, and
[`docs/threats.md`](docs/threats.md) is honest about where that stops.

AGPL-3.0.

## Idea (level-pack section)

aletheia is a privacy-first Midnight Network dApp. The Compact contract puts aggregate state on the public ledger while per-user payloads — identity, bids, positions, claims — stay in the private witness and the local private state. The auditor can verify the system end to end; the user keeps their data shielded. The product ships on Preprod with CI, a brag video, and the level-pack audit passing, so a reviewer can confirm the engineering is real in under five minutes.

## Setup (level-pack section)

```bash
# 1. install toolchain (compact, docker, node 22, yarn)
# 2. bring up the local midnight stack
node .claude/skills/midnight-level-pack/scripts/midnight-up.mjs --project .
# 3. compile the contract
# 4. deploy
yarn deploy:undeployed
# 5. run the web
yarn web:dev
# 6. audit
node .claude/skills/midnight-level-pack/scripts/midnight-audit.mjs --project . --target-level 3
```

## Privacy Model (level-pack section)

The contract's public ledger carries only what the system needs to make itself auditable: aggregate state, epoch counters, public roots, and any commitment the contract chose to disclose. The private witness and the local private state hold everything else — identity, payloads, sealed bids, individual positions. Selective disclosure via `disclose()` is the boundary between the two.

| observer can see | observer cannot see |
|------------------|---------------------|
| aggregate state, epoch counters, public roots, and the disclosed subset chosen by the contract | identity, payloads, sealed bids, individual positions, witness values, and any local private state |
| whether a proof of solvency / participation / threshold was produced for the current epoch | the contents that fed the proof (only the proof itself is public) |
| a count of fills, votes, registrations, or claims | who participated in any single fill, vote, registration, or claim |
| an aggregate eligibility nullifier root | which member satisfied the membership check |
| the on-chain clearing flag of an auction or liquidation | the bid vector and the winning bid until the contract chooses to disclose them |


## Architecture (level-pack section)

1. **Compact contract** — circuits and ledger.
2. **Node-side API** — providers, wallet, deploy, CLI, tests.
3. **Browser shell** — multi-page app, Lace wallet, debug drawer.

## Links

- Live demo: https://aletheia-midnight.vercel.app _(placeholder)_
- X profile: https://x.com/aletheia-midnight _(placeholder — see docs/x-profile.md)_
- users.md / feedback.md: PLACEHOLDER opt-out per session instructions
