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
