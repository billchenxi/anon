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

## Storage

`src/lib/ledger.ts` is an in-memory Map, deliberately. The shape is the point;
swap it for a table and nothing above it changes.

## Running it

```bash
pnpm --filter gate dev     # http://localhost:3010
```

The demo page acts as two simulated people and prints, per call, exactly what
the server committed to disk.
