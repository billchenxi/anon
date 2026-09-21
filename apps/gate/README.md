# Gate

World ID for a site that already exists — the **external integration** shape.

Sniffies, a clinic, a support forum, a helpline: places with their own users,
their own accounts, and their own reasons not to learn anything more about
them. Gate adds three rules and stores as little as each one allows.

## The three rules

| | What it does | What it stores |
|---|---|---|
| `POST /api/gate/enter` | Proves a human is here, returns a 10-minute capability | **nothing** |
| `POST /api/gate/claim` | One per person, ever, within a scope | one opaque key |
| `POST /api/gate/standing` | Bars a person from a scope | one opaque key and an expiry |
| `PUT /api/gate/standing` | Reads whether they are barred | — |

## Why it is built this way

**Verify and forget is the default.** Most of the time a site only needs to
know "a unique human is here, now". That needs no row: the capability says so,
carries no identifier, and expires. There is nothing to leak and nothing to
subpoena. Reach for the ledger only when a rule genuinely has to outlive the
request.

**Each rule gets its own action.** `enter-clinic`, `claim-kit` and
`standing-clinic` produce three unrelated nullifiers for the same person. The
access path, the claim ledger and the bar list cannot be joined to each other,
or to anything the host site already holds.

**A bar keyed on the person survives a new account.** That is the property most
worth having, and the one accounts cannot provide: delete the account, sign up
again, and the same key comes back.

## The part that matters more than the code

In a context where being identified is dangerous — cruising, reproductive
health, HIV services, anywhere criminalised — the existence of the record is
the risk, not just its contents. A row reading "this verified human used this
service" is harmful without a name attached.

So: prefer `enter` over `claim`. Scope actions to the narrowest rule. Make
verification a trust signal rather than a gate, or you exclude exactly the
people most at risk. And get counsel before shipping into a regulated health
setting.

## What a host site implements

Three calls, and the host keeps its own accounts, sessions and UI. Nothing
about their user model changes.

```ts
// 1. Their user taps "Verify you're human".
//    IDKit opens World App; the proof comes back to their frontend.
const proof = await idkit.prove(`standing-${SCOPE}`);

// 2. Their backend checks the person is not barred, and marks the account.
const res = await fetch("/api/gate/enter", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ scope: SCOPE, proof }),
});

if (res.status === 403) return showBarred();        // ban survived a new account
const { capability } = await res.json();            // 10 minutes, no identifier

// 3. They set a flag on their own account row. That is the whole schema change.
await db.users.update(userId, { humanVerified: true });
```

To bar someone, their moderator tool calls `POST /api/gate/standing` with the
reporter's proof. To gate a one-per-person perk, `POST /api/gate/claim`.

## Who should run this

**They should — not you.** Register the World ID app under their name, run this
code on their infrastructure, keep the ledger in their database.

Nullifiers are scoped per app_id. If several sites shared one deployment, one
operator could link the same person across all of them — the exact
cross-service linkage World ID otherwise prevents. Running it themselves also
keeps user proofs off a third party, which removes most of the legal
conversation before it starts.

That makes this a library and an integration, not a service in the middle. It is
a worse business and a much better privacy story, and for this category the
privacy story is the product.

## Storage

`src/lib/ledger.ts` is an in-memory Map, deliberately. The shape is the point;
swap it for a table and nothing above it changes.

## Running it

```bash
pnpm --filter gate dev     # http://localhost:3010
```

The demo page acts as two simulated people and prints, per call, exactly what
the server committed to disk.
