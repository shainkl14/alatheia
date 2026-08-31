# Protocol

Aletheia · registry, predicates, custody
Revision 3

---

## 1. What C2PA gives us

A C2PA-signed capture carries a **manifest**: a set of assertions plus a
signature over their hash, made by a certificate that chains to a manufacturer
root. The assertions we care about:

| Assertion | Field | Sensitivity |
|---|---|---|
| `c2pa.actions` | capture, edits applied | Low, unless it names software |
| `stds.exif` | GPS, timestamp, orientation | **Extreme** |
| `c2pa.hash.data` | hash of the media bytes | None |
| Signing certificate | device serial, model, manufacturer | **Extreme** |
| `c2pa.training-mining` | AI training flags | Low |
| Ingredient chain | prior manifests for edits | Medium |

The signature is over the assertion set. So proving "a valid signature exists"
requires the assertions — you cannot verify a signature over data you don't
have. The whole design problem is: verify inside a circuit, disclose outside it.

## 2. The registry

```compact
export ledger manufacturerRoots: Map<Bytes<32>, RootRecord>;
export ledger revokedCerts: Set<Bytes<32>>;
export ledger regionSets: Map<Bytes<32>, Bytes<32>>;   // regionId → polygon root
export ledger submissions: Set<Bytes<32>>;
export ledger juries: Map<Bytes<32>, JuryRecord>;
export ledger submissionCount: Counter;
```

`RootRecord` holds the manufacturer's public key, the certificate policy OIDs it
is trusted for, and the epoch from which it is valid. Roots are added by
governance (a threshold of registry custodians), not unilaterally — a forged
root would let anyone mint fake provenance.

`regionSets` maps a region identifier to the Merkle root of a polygon
decomposition. Region membership is proven against it (§4.3).

## 3. Signature verification in-circuit

Manufacturer chains use ECDSA over P-256 (most) or Ed25519 (some newer
devices). Both are expensive in a SNARK over a different base field.

**P-256 ECDSA.** Non-native field arithmetic. Roughly 1.2M constraints for one
verification with a well-optimised implementation, and it is the dominant cost
of the whole system.

Options considered:

1. **Verify in-circuit directly.** ~1.2M constraints, 15–25 s. Correct, no extra
   trust. **This is what we ship.**
2. **Delegate to a notary that verifies and re-signs with a circuit-friendly
   scheme.** ~40 k constraints. But the notary sees the manifest, which is the
   entire secret. Rejected.
3. **Verify a threshold-signed attestation from a distributed notary
   committee.** Cheaper, and the manifest is secret-shared rather than
   disclosed. A real option for v2 when device support broadens; it introduces a
   `t`-of-`n` trust assumption which must be stated on every proof produced this
   way, in the same way GhostMind separates its two modes.

Certificate chain verification multiplies by chain length. We cap at depth 3 and
require the intermediate set to be pre-registered, so only the leaf signature and
one intermediate are verified in-circuit; the rest is a registry membership
check.

## 4. Predicates

Each predicate is an independently provable statement. A source selects a subset.

### 4.1 `authentic`
The manifest signature verifies, the certificate chains to a registered root,
the certificate is not in `revokedCerts`, and `c2pa.hash.data` matches the hash
of the submitted bytes. Always required.

### 4.2 `noGenerativeEdits`
The action list contains no assertion in the generative set
(`c2pa.created` with a `digitalSourceType` of `trainedAlgorithmicMedia`,
`compositeWithTrainedAlgorithmicMedia`, etc.), and every ingredient in the
chain also carries this property, recursively to depth 3.

Note what this does *not* prove: that the scene is what it appears to be.
A genuine photograph of a staged event is authentic. Provenance defeats
synthesis, not deception, and the newsroom-facing UI says so.

### 4.3 `capturedInRegion(regionId)`
The EXIF GPS coordinate lies inside the polygon set committed at
`regionSets[regionId]`.

Point-in-polygon in a circuit: we pre-decompose each region into a set of
axis-aligned tiles at a fixed resolution (a quadtree at zoom 12, ≈ 10 km cells)
and Merkleise the tile set. The proof is then a membership proof of the
containing tile plus two range checks — about 30 k constraints, versus a
ray-casting algorithm over an arbitrary polygon which is both expensive and
numerically fragile.

Resolution is a disclosure choice: zoom 6 (country-scale), zoom 9
(province-scale), zoom 12 (city-scale). The interface expresses these as
*"somewhere in Europe" / "in Poland" / "in Warsaw"*, and quantifies each.

### 4.4 `capturedInPeriod(from, to)`
Range proof on the EXIF timestamp. Granularity offered: year, quarter, month,
week. Not day, and not hour — a day-precision capture in a small region is
frequently identifying on its own, and offering it invites its use.

### 4.5 `deviceClass(classId)`
Proves the signing certificate's subject belongs to a public class — "a
manufacturer in the C2PA conformance list", or "a Sony device" — without
revealing the model or serial. Membership proof against a class tree.

### 4.6 `sameSourceAs(priorSubmission)`
Proves this submission and an earlier one were produced by a holder of the same
source secret, without revealing it. This is how a source sends a follow-up. The
link is scoped to the pair, so a source with ten submissions does not create a
single linkable identity unless they choose to.

## 5. Submission circuit

```
submit(mediaHash, predicateSet, disclosureRoot, ciphertextCommit)
```

Asserts every selected predicate, then:

```
nullifier = H(DOM_SUB ‖ mediaHash ‖ sourceSecret)
assert ¬submissions.member(nullifier)
submissions.insert(nullifier)
submissionCount.increment(1)
```

`ciphertextCommit` binds the encrypted media blob (stored off-chain) to the
proof, so a newsroom cannot swap the file after the fact and reuse the
provenance.

The nullifier prevents the same capture being submitted twice to inflate
apparent corroboration — an attack that matters when several "independent"
sources are actually one person.

## 6. Threshold custody

A submission's contact channel is encrypted to a jury.

```
JuryRecord = { members: [Bytes<32>], threshold: Uint<8>, publicKey: Bytes<32> }
```

Key generation: a DKG among the named jury members produces a shared public key;
no member ever holds the whole secret. Decryption of a contact channel requires
`t` members to produce partial decryptions, each accompanied by a proof of
correct partial decryption so a member cannot sabotage silently.

Properties this is chosen for:

- **No single point of compulsion.** A subpoena to one editor yields a share.
- **Auditable.** Every decryption is an on-chain event. A source can see that
  their channel was opened, and when, even though they cannot prevent it.
- **Membership is public.** Sources choose a newsroom partly by who its jury is.
  Secret juries would be worse than no juries.

`t` is public per jury and shown to the source before submission, in words:
*"Four of the seven editors listed below must agree to open a channel to you."*

## 7. Verification by a third party

A published story carries a badge linking to a verification page containing:
proof, public inputs, contract address, block height, verifying key hash, and
the media hash. A reader with the file can check the hash matches; a reader
without it can still check that the newsroom's claim corresponds to a real
proof.

The verification bundle is also a static file. Verification must not require
Aletheia's servers, or the guarantee evaporates the day we go offline.

## 8. Constraint budget

| Predicate | Constraints | Prove time (laptop) |
|---|---|---|
| `authentic` (P-256 + chain) | 1.35 M | 18–28 s |
| `noGenerativeEdits` | 60 k | 1 s |
| `capturedInRegion` | 30 k | < 1 s |
| `capturedInPeriod` | 8 k | < 1 s |
| `deviceClass` | 25 k | < 1 s |
| `sameSourceAs` | 15 k | < 1 s |
| **Typical submission** | **~1.5 M** | **20–30 s** |

Prove time is dominated by ECDSA and is not going to improve much without
option (3) from §3. The interface treats 30 seconds as normal and designs for
it rather than apologising for it.
