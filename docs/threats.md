# Threat model

Aletheia · what we defend, what we do not, and where the honest edges are.

The convention in this document: every mitigation is followed by its residual
risk. A mitigation with no stated residual is a mitigation nobody has thought
about hard enough.

---

## Adversaries

**A1 — The subject.** The organisation the material is about. Well-resourced,
has the document, knows its own access logs, may have watermarked it.

**A2 — The state.** Can compel the newsroom, the hosting provider, and the
registry custodians. Can observe network traffic at scale.

**A3 — The platform.** Us. A compromised or malicious Aletheia deployment.

**A4 — The forger.** Wants to inject fabricated material with valid-looking
provenance to discredit the newsroom.

**A5 — The correlator.** Passive, patient, cross-references public proofs
against public information.

---

## Attacks

### T1 · Metadata disclosure (A1, A5)
*The core attack the system exists to prevent.*
**Mitigation:** manifests are parsed and verified only in the browser; only
predicates are published.
**Residual:** the source's chosen predicates are published. A source who selects
city-level region, month-level time, and device class may have disclosed enough
to identify themselves from those three fields alone. This is why the interface
quantifies the anonymity set rather than merely warning.

### T2 · The anonymity set is one (A1, A5)
The document has four recipients. No cryptography helps.
**Mitigation:** none available in the protocol. `docs/for-sources.md` addresses
it first, before anything technical, and the submission flow asks *"how many
other people could have sent this?"* as an explicit question with a hard stop
below a threshold.
**Residual:** substantial. This is the leading cause of source exposure in
practice and we do not solve it.

### T3 · Invisible watermarking (A1)
Per-recipient wording variants, whitespace steganography, printer tracking dots.
**Mitigation:** we detect and warn about printer tracking dots (they have a
known pattern) and offer an OCR-retype path that destroys the provenance proof.
**Residual:** we cannot detect semantic watermarks. Cannot, not "have not yet".

### T4 · Network correlation (A2)
The submission's timing on the wire vs. the on-chain transaction.
**Mitigation:** onion service; the client batches submissions into randomised
delay windows (default 0–90 minutes, source-selectable); proofs may be submitted
by a relay so the submitting address is not the source's.
**Residual:** an adversary with a global passive view and few concurrent users
can correlate. Small anonymity sets are the enemy of every mixing scheme, and a
new deployment has a small anonymity set by definition. We state the current
submission volume on the site so a source can judge.

### T5 · Compelled decryption of the jury channel (A2)
**Mitigation:** `t`-of-`n` threshold, geographically and jurisdictionally
distributed jury membership, every decryption recorded on-chain and visible.
**Residual:** a state that can compel `t` members gets the channel. Distribution
raises the cost; it does not make it impossible. The on-chain record means the
source *learns* it happened, which is a meaningful but limited protection.

### T6 · Malicious platform (A3)
We serve modified JavaScript that exfiltrates the manifest.
**Mitigation:** this is the most serious attack on any browser-based system.
Defences, all required: Subresource Integrity on every asset; a published,
reproducible build with the artefact hash in the contract; the hash displayed in
the UI and checkable against the on-chain value; a signed-release browser
extension for the paranoid; the whole client available as a downloadable,
offline-capable bundle.
**Residual:** most users will not verify the hash. The offline bundle is the
real defence and we route high-risk sources to it explicitly rather than
treating it as an advanced option.

### T7 · Forged provenance (A4)
**Mitigation:** manufacturer roots are governance-gated; certificate revocation
lists are mirrored on-chain; a compromised device key is revocable, and proofs
made before revocation are marked, not deleted.
**Residual:** an extracted device key from a real camera produces genuine
signatures over fabricated content until it is revoked. C2PA has this weakness
at its foundation and Aletheia inherits it. Newsroom-facing UI therefore never
says "authentic" alone; it says "signed by a device of class X, not revoked as
of block N", which is the actual claim.

### T8 · Replay and false corroboration (A4)
One capture submitted repeatedly to appear as several independent sources.
**Mitigation:** the media-hash-bound nullifier in protocol §5.
**Residual:** re-encoding the file changes its hash. Perceptual hashing would
help and is a v2 item; note that a perceptual hash is itself a partial
disclosure of content and must be handled carefully.

### T9 · Traffic analysis of proof size (A2, A5)
Different predicate sets produce different proof sizes and prove times.
**Mitigation:** all submissions are padded to the maximum predicate set; unused
predicates are proven with dummy public inputs.
**Residual:** prove *time* still varies with device speed and can be observed by
a hostile page. Mitigated by the fixed-delay submission window.

### T10 · The source contacts the journalist by other means (A1)
Email, a phone call, a DM.
**Mitigation:** the claim-code channel exists precisely so that follow-up does
not require a side channel, and the UI pushes it hard.
**Residual:** people do this anyway. It has caused more exposures than every
cryptographic failure combined.

---

## Non-goals, stated plainly

- We do not protect a source from a device they do not control.
- We do not make a small anonymity set large.
- We do not prevent a lawful order to a newsroom; we limit what that order can
  yield.
- We do not verify truth. We verify provenance. A real photograph of a lie is
  still a lie, and every newsroom-facing surface repeats this.

## Review

This model should be reviewed by someone who does source protection for a
living before any real deployment. Until that review has happened, the site
carries a banner saying so. Shipping a whistleblower tool with an unreviewed
threat model would be worse than shipping nothing.
