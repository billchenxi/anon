# Deploying Anon

The app needs **one long-lived server with a writable disk**, not serverless
functions. The MVP store is a single JSON file, so every request must see the
same filesystem.

That rules out Vercel as-is: each invocation gets its own filesystem, so votes,
mutes and rate limits would silently diverge and reset. Fly, Railway, Render
with a disk, or any VPS all work.

The `Dockerfile` is host-agnostic — verified building and running locally, with
the store persisting across a container restart.

## Fly.io

```bash
fly auth login

# Pick a globally unique name and put it in fly.toml as `app`
fly apps create anon-yourname

# One volume, same region as the app
fly volumes create anon_data --size 1 --region sjc

# Secrets — never in fly.toml
fly secrets set \
  RP_SIGNING_KEY=<the 32-byte hex key from the Developer Portal> \
  SESSION_SECRET=$(openssl rand -hex 32) \
  ANON_ID_PEPPER=$(openssl rand -hex 32)

fly deploy
```

Your URL is `https://<app-name>.fly.dev`. That goes in **both** Developer Portal
fields — App URL and App Official Website.

### Two things that will bite

- **Never scale past one machine.** `max_machines_running = 1` is in fly.toml
  for that reason. A second machine gets its own copy of the store.
- **`ANON_ID_PEPPER` must be stable forever.** Rotating it changes every derived
  human id, so everyone's linked Surrogates are orphaned. Treat it like a
  database encryption key.

## Locally, the same way it runs in production

```bash
docker build --build-arg NEXT_PUBLIC_WORLD_APP_ID=app_… -t anon .
docker volume create anon-data
docker run -p 3000:3000 -v anon-data:/data \
  -e ANON_STORE_PATH=/data/store.json \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -e ANON_ID_PEPPER=$(openssl rand -hex 32) \
  anon
```

## Before this is a real deployment

The blockers in `SHIPPING.md` still stand — chiefly that the JSON store should
become Postgres, and the six-language requirement. A volume makes the store
*work*; it does not make it a database.
