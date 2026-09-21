# Anon

Proof of personhood without identity, in two shapes.

World ID can prove that a distinct human is present without revealing which
one. These are the two ways to spend that: as a place of its own, and as a
layer over a place that already exists.

```
apps/
  anon/        a World Mini App — discussion where every voice is a
               verified human and no voice is a name
  gate/        an external integration — World ID for a site that
               already has its own users
packages/
  world-id/    the shared primitives: action naming, nullifier keys,
               proof verification, device-key signatures
```

## The idea both share

Uniqueness comes from World ID's own action-scoped nullifiers rather than a
secret of ours. The same person proving the same action always yields the same
nullifier; a different action yields an unrelated one. So the scope of a rule
is the scope of its linkage — and the job is to keep every action as narrow as
the rule it enforces.

Nothing stores a nullifier. Everything stores `sha256` of one, per action, or
stores nothing at all.

## Accountability without identity

Anon holds people to account. It cannot name them, and neither can anyone else.

The same person always produces the same key for the same rule, so consequences
stick: a mute survives a new face, one person gets one ballot, one person gets
one voice in a thread. That is real accountability &mdash; you cannot walk away
from what you did by making another account.

What it is not is traceability. A World ID nullifier is an opaque value scoped
to this app. It is not a name, an email or a document number, and it cannot be
turned into one. A full dump of this database shows that Quiet Harbor posted
about bonuses; nothing in it, or reachable from it, says who Quiet Harbor is.

So the answer to "can you identify this user" is **no**, and it stays no under
a subpoena, because the information was never collected. A product that wanted
a different answer would need its own identity layer &mdash; government ID, a
payment method, a phone number &mdash; and would stop being this product.

One thing the in-app ledger does not cover: proofs are verified server-side
through World's endpoint, so World sees the nullifier and the app id at
verification time. What they retain is their policy, not something this code
controls. The panel is honest about what *this* server holds; it cannot speak
for a third party.

## Where this is going

Today a Surrogate only exists inside Anon. The intent is that it becomes a face
you can wear anywhere &mdash; the AI assistant at work, a clinic&rsquo;s support
forum, a dating or cruising site &mdash; without any of them learning that the
others exist.

The clearest case is the one next to the flagship room. Companies are putting AI
assistants in front of every employee, and logging every prompt against a name.
So nobody asks the thing they actually want to ask: *am I being managed out*,
*is this rate normal for my band*, *how do I report my manager*. It is the Slack
problem again, in a new box &mdash; the tool is there, and the honest question
never gets typed into it.

An anonymous lane fixes it without giving up control. The employer learns that
**a verified member of staff** asked, which is what stops an outsider spending
their token budget, and does not learn **which one**. Every piece that needs is
already built: personhood for "works here", a per-action nullifier for a
per-person quota with no identity attached, a sealed Surrogate for the handle,
and mutes that follow the human for abuse.

The primitive for that is already here. A **sealed** Surrogate keeps its private
key on your device and signs each action; the server stores only a public key.
Because the user carries the key rather than a server holding a record, nothing
needs a shared identifier across sites. You decide the linkage: reuse a
Surrogate somewhere and you have chosen to connect those two places; mint a new
one and you have not.

That is the opposite of a single sign-on, which works by making one identifier
follow you everywhere.

What is missing is deliberately small and specific:

- **Audience binding.** The signed challenge names the action but not the site.
  Before a Surrogate can travel, the signature has to say *who it was made for*,
  or one site could replay it at another.
- **A way to carry standing.** Reputation is the reason to reuse a face, and
  also the thing that links two contexts. It has to be opt-in per site, and the
  cost has to be stated as plainly as the sealed/linked choice is today.
- **Something for a site to call.** `gate` proves personhood. Proving *this
  particular face* is a second endpoint that does not exist yet.

The honest constraint: a portable face is a linkage the user is choosing to
create. The job is not to prevent it &mdash; it is to make sure it never happens
by accident, and never without them being told what it costs.

## Which is which

| | `anon` | `gate` |
|---|---|---|
| Runs | inside World App | alongside your existing site |
| Portal type | Mini App | External integration |
| Mini App Store | eligible | not eligible |
| Identity | Surrogates you wear per room | whatever the host site already has |

## Working on it

```bash
pnpm install
pnpm --filter anon dev     # the Mini App, port 3000
pnpm --filter gate dev     # the integration demo, port 3010
pnpm test                  # every package
pnpm lint
```

Per-app detail is in `apps/anon/README.md` and `apps/gate/README.md`.
Deployment is in `DEPLOY.md`.
