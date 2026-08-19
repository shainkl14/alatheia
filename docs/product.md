# Interface

Aletheia · design specification

---

## 1. Two products, one repository

**The drop** (`/submit`) — used once, under stress, possibly at 2 a.m., possibly
by someone who has never used anything like it. Must be slow, calm, legible, and
impossible to rush.

**The desk** (`/desk`) — used daily by editors. Dense, fast, keyboard-driven.

They share no layout and barely share a design language. That is deliberate: the
drop is designed for a person who will use it once, the desk for a person who
will use it a thousand times, and optimising one for the other harms both.

## 2. Design language

Editorial, not technological. It should look like a serious newspaper's
investigations section.

| Token | Value |
|---|---|
| Stack | Astro 5, Preact islands only where interaction is required, no client router |
| Display | `Newsreader` serif, 44/52 for headlines |
| Body | `Newsreader` 19px/1.6 — long-form serif, because people must actually read this |
| UI / labels | `Söhne Kräftig` fallback `Inter`, uppercase micro-labels at 11px, `.08em` |
| Paper | `#FFFFFF`. Ink `#111111`. |
| Rule | 1px `#111111` hairlines and 3px section rules — the layout is typographic |
| Accent | `#B00020` vermilion, used **only** for irreversible actions and warnings |
| Amber | `#8A6100` for the anonymity-set caution state |
| Radius | 0 |
| Motion | None on the drop. A page that animates feels like a product; this should feel like a document. |
| Images | None. No stock photography of hoodies, ever. |

Dark mode: yes, and it is genuinely paper-inverted (`#0B0B0B` / `#EDEDED`),
because a source may be reading this in the dark and does not want a bright
screen visible from behind them. It is also the default between 20:00 and 06:00
local, which is a small thing that matters in this domain.

## 3. The drop, screen by screen

The whole flow is one page per step, no side navigation, no progress gamification.
A step cannot be skipped and going back is always possible until the final
confirmation.

### 3.0 Before you begin
The operational-security summary from `for-sources.md`, condensed to seven
lines, with a link to the full page and a single button: `I've read this`. The
button is disabled for eight seconds. This is the only dark-pattern-shaped thing
in the product and it is pointed the right way: it slows a decision that people
regret making quickly.

Above it, permanently: the onion address, the offline-bundle download, and the
build hash with a link to verify it.

### 3.1 Add the file
Local drop target. On selection, parsing happens in a worker and the page shows
**everything found in the file**, in full, in plain language, before anything
else happens:

```
  WHAT'S INSIDE THIS FILE

  Taken          14 March 2026, 09:42:17 local time
  Where          52.2297° N, 21.0122° E  — Warsaw, Poland
  Device         Sony α7 IV, serial 3721004
  Signed by      Sony Imaging Products, certificate valid
  Edits          1 — cropped, no AI operations
  Also found     Lens model, ISO, shutter, owner name field: "M. Kowalska"
```

That last line is why this screen exists. A source who has never looked inside
their own file should see the owner-name field *here*, from us, and not learn
about it from a court.

### 3.2 Choose what to prove
The heart of the product. Each predicate is a row with a granularity control and
a live anonymity figure:

```
  WHERE      ( ) Nothing
             ( ) Somewhere in Europe            ~ 740 million people
             (•) In Poland                      ~ 37 million people
             ( ) In Warsaw                      ~ 1.8 million people

  WHEN       ( ) Nothing
             (•) In 2026                        no narrowing
             ( ) March 2026                     narrows by ~12×
             ( ) Week of 9 March 2026           narrows by ~52×

  DEVICE     (•) Nothing
             ( ) A real camera, not a phone     ~ 1 in 40 captures
             ( ) A Sony camera                  ~ 1 in 200 captures
```

Beneath, a combined figure updating live:

> **With these choices, your submission is consistent with roughly 180 000
> people.** That's a reasonably large crowd to be in.

Amber below 1 000 (*"a small crowd — consider being less precise"*), vermilion
below 100 with a required acknowledgement checkbox. The numbers come from a
published, versioned estimation model — `docs/anonymity-model.md` — and the UI
links to it, because an unexplained number asking someone to bet their safety on
it is not acceptable.

### 3.3 Write to the newsroom
A plain textarea. One line of guidance: *"Tell them what this is and why it
matters. Don't tell them who you are."* No formatting toolbar, no autosave to
anywhere but memory.

### 3.4 The last screen
Full-page, vermilion rule at the top, no other content:

```
  THIS IS PERMANENT

  These things will be published forever, for anyone to read:
    · This file was captured in Poland
    · During 2026
    · On a device with valid manufacturer signature
    · With no AI generation in its history

  These things will never be published, and we never received them:
    · The exact place        · The exact time
    · The device serial      · The owner name field
    · Anything about you

  Your message goes to the Aletheia desk at [Newsroom], encrypted.
  Four of these seven editors must agree before it can be opened:
    [names]

  [ Send ]   [ Go back ]
```

Then a 20–30 second proof. The waiting screen shows what is happening in
sentences, not a bar: *"Checking the manufacturer's signature — this is the slow
part, about 20 seconds."* Then the claim code, displayed large, with a print
button and an explicit instruction not to screenshot it to a synced photo
library.

## 4. The desk

Editors' side. Table of submissions with predicate badges, verification status,
jury status, and age. Opening a channel is a multi-party flow with a visible
quorum counter — *"2 of 4 approvals"* — and every approval is logged on-chain.

The badge language is precise, never reassuring: `signed · Sony class · not
revoked at block 481 220`, not `verified ✓`. Editors make trust decisions; the
interface supplies facts.

## 5. The public verification page

Given a proof id: the statement in plain English, the public inputs, the
contract address and block, the verifying key hash, and a `Verify yourself`
section with a copy-pasteable command using only public Midnight tooling. A
reader who does not trust us must be able to reach the same conclusion without
us. That is the entire point of publishing a proof rather than a claim.

## 6. What the site never does

- No analytics of any kind. No self-hosted analytics either.
- No cookies. No local storage on the drop path beyond the session.
- No CDN. All assets same-origin, SRI-pinned.
- No fonts loaded from a third party. Self-hosted, subset, preloaded.
- No error reporting service. Errors are shown to the user, not sent anywhere.
- No "Contact us" form that could become a side channel.

Each of these is a line in a CI check, not a policy in a document.

## 7. Accessibility

WCAG 2.2 AA, and specifically: everything works with JavaScript disabled except
file parsing and proving, both of which fail with an explanation rather than a
blank screen. Full keyboard path. The anonymity figures are announced by screen
readers as sentences, not numbers. Text scales to 200% without horizontal
scroll. Reading level of the source-facing copy is checked and kept at or below
grade 9.
