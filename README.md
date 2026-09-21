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

## Where this is going

Today a Surrogate only exists inside Anon. The intent is that it becomes a face
you can wear anywhere &mdash; an AI assistant, a clinic&rsquo;s support forum, a
dating or cruising site &mdash; without any of them learning that the others
exist.

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
