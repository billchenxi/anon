# Anon

**Prove you're human, not who you are.**

Burner accounts are already easy. The harder problem is participating without a
name while still proving a real person is speaking.

Anon is a World Mini App for that gap. World ID verifies the human once. A
**Surrogate** is the face they wear in a room — starting with workplace
discussion.

```
Verified Human
      |
      v
Work Surrogate
      |
      v
Anonymous Workplace Discussion

✓ Real human
✓ Persistent reputation on that Surrogate
✕ Real name
✕ Personal profile
```

## What the MVP does

1. A first-run walkthrough of the rules, so a blocked vote later reads as the
   product working rather than the app breaking
2. Verify once with World ID (or as one of three demo humans)
3. Create a Surrogate: persistent, context, or disposable
4. Three rooms — **Workplace**, **Health**, **Commons** — each with its own face
5. Post, reply and vote as that Surrogate
6. Report content; two verified humans agreeing removes it
7. Retire or burn a Surrogate
8. See exactly what the server can still link to you

The public feed only ever sees the Surrogate.

## The three rules that make a room trustworthy

World ID makes a person unique. On its own that stops ballot stuffing and
nothing else — one verified human with five Surrogates can still walk into a
thread, agree with themselves five times, and never face a consequence that
outlives a face. Anon keys all three rules on the person:

| Rule | Scope | What it stops |
|---|---|---|
| **One human, one vote** | per poll | The same person recasting a ballot under a second face |
| **One human, one voice** | per thread | The same person manufacturing a consensus under several faces |
| **Mutes follow the human** | per room | Retiring the face that earned a sanction, or minting a fresh one, to escape it |

None of them is keyed on the public username. The first Surrogate you speak with
in a thread is the only one you can speak with there; every other face stays
available in every other room.

Polls can opt out by declaring `one_identity`, which counts a ballot per
Surrogate. The seeded Workplace has one of each so the difference is visible.

## Moderation without identity

Reporting is the part of anonymous discussion that usually fails, because bans
land on accounts and accounts are free. Here a report is counted per verified
human, so a second Surrogate cannot pile on, and when two distinct humans agree
the post is removed and its author's *human* is muted in that room for a day.
The moderator never learns who anyone is.

## Privacy: what is actually stored

This is a privacy product, so the claims are worth stating precisely rather than
generously.

**Never written to disk:**

- The World ID nullifier. It is used once to derive a human id and discarded.

**Written, but scoped so it cannot be joined:**

- Ballots carry `sha256` of a **World ID nullifier for the action
  `vote:<pollId>`**. World ID guarantees that the same person proving the same
  action always yields the same nullifier and a different action yields an
  unrelated one — which is exactly the uniqueness we need, computed by the
  protocol rather than by a secret of ours. The server cannot derive it, so it
  also cannot tell you whether you voted: **your device remembers its own
  ballots, the server only enforces the rule.**
- Thread entries still carry `HMAC(pepper, postId + humanId)`. Moving those to
  `speak:<postId>` actions is the next step.

- Thread entries carry `sha256` of the nullifier for `speak:<postId>`, and
  reports the one for `report:<targetId>`. Same principle, same protocol.

**Written, and honestly a real link — unless you opt out:**

- Which **linked** Surrogates belong to the same human. Letting a face follow you
  to a new phone requires the server to know it is yours.

## Two ways to hold a face

You choose this per Surrogate, and the cost is stated on both sides:

| | **Linked to you** | **Sealed to this device** |
|---|---|---|
| Server stores | your human id | a public key, and nothing else |
| Follows you to a new phone | yes | **no — it is gone** |
| Can be grouped with your other faces | yes | **no** |
| How you act as it | your session | the device signs each act |
| How many | five at a time | one per room |

A sealed Surrogate is minted **without sending the session cookie** — otherwise
the server would see your session and the new key together and could write down
the pair, which is the whole thing you were avoiding. Every act it takes is the
same: signature in, cookie out.

**Sealed faces are still moderatable.** Minting one proves `mint:<roomId>`, and
that nullifier is its anchor: one sealed face per person per room, so a mute
keyed on it cannot be walked away from by minting another. The server enforces
the consequence without ever learning whose it is.

Every derived identifier is peppered with `ANON_ID_PEPPER`. Without the pepper,
a leaked store plus a known nullifier would confirm a match offline; with it,
that requires the server's secret too. The app refuses to boot in production if
the pepper is unset.

## Abuse controls

One verified human is cheap to rate-limit and expensive to replace, which is the
useful half of World ID for moderation. Per human: 8 posts/hour, 30
comments/hour, 5 Surrogates/day, 5 active Surrogates at once, plus the report
threshold and mute above. Retired usernames stay reserved, so nobody can claim a
retired name and inherit its posting history.

## Run it

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). On a desktop browser the
app sits in a phone frame. Inside World App it fills the webview.

### Demo mode

No World ID credentials required. Demo mode simulates three distinct verified
humans, which is everything you need to see all three rules fire.

1. **Enter as a demo human → human A**, and read the four-panel walkthrough
2. Create a Surrogate, reply on the bonus thread, and vote on the first poll
3. Create a second Surrogate and try to vote again — **blocked**
4. Try to reply on the same thread as that second Surrogate — **blocked**
5. Reply on a *different* thread as it — allowed
6. Post something in **Commons**
7. On **Faces**, switch to **human B**, open that post and report it — counted,
   not removed
8. Switch to **human C** and report it too — **removed**, and A is muted in
   Commons
9. Switch back to **human A**: minting a brand-new Surrogate does not lift the
   mute, and Workplace still works
10. On **Faces**, read **What this server can see**

That is the product: prove you are human, not who you are. One human, many
Surrogates, still one ballot, one voice, and one set of consequences.

### World ID

Create an app in the [World Developer Portal](https://developer.world.org), then
set:

- `NEXT_PUBLIC_WORLD_APP_ID` — Mini App id
- `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `RP_SIGNING_KEY` — World ID 4.0
- `WORLD_ID_ACTION` — defaults to `anon-verify`

Tunnel with ngrok (or similar) and point the Mini App URL at the tunnel. World ID
proofs are verified server-side.

Verification lives in `@worldcoin/idkit`, not MiniKit: as of MiniKit v3 the
verify commands moved out of the command SDK. MiniKit is still used for haptics
and the Mini App shell.

## Identity model

```
Verified human (derived from a World ID nullifier, never stored)
  ├── Persistent Surrogate
  ├── Context Surrogate (Work, Health, Social, …)
  └── Disposable Surrogate (burns in 24h, or on tap)
```

## Stack

Next.js 16, MiniKit, IDKit, a local JSON store for the MVP. Swap
`src/lib/store.ts` for Postgres when you need multiple instances; the rate
limiter in `src/lib/rate-limit.ts` moves with it. `ANON_STORE_PATH` points the
store somewhere else — a mounted volume in a deploy, or a throwaway file for a
demo run.

The store is versioned. `src/lib/migrate.ts` upgrades a v1 store — the format
that kept nullifiers in plaintext — in place on first read.

```bash
pnpm test   # 41 tests: uniqueness rules, key derivation, migration,
            # rate limits, report thresholds, human-scoped mutes
pnpm lint
pnpm build
```

## Design

Light editorial: warm paper ground, ink type, hairline rules instead of shadows,
Fraunces for headlines against Outfit for body. Tokens live in
`src/app/globals.css` and the component system in `src/components/ui.tsx`.

Two things worth knowing if you touch the CSS:

- Base resets must stay inside `@layer base`. Unlayered CSS outranks Tailwind's
  utilities layer regardless of specificity, so a bare `button { color: inherit }`
  silently beats every `text-*` utility on a button.
- Nothing may derive an id at module scope. `next build` imports every route to
  collect config, and id derivation needs the pepper, which is absent at build
  time. See `seedStore()`.
