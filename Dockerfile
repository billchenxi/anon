# Anon runs as a single long-lived server with a writable disk, not as
# serverless functions: the MVP store is one JSON file, so every instance must
# see the same filesystem. Mount a volume at /data and point ANON_STORE_PATH
# at it. Do not scale this past one machine until the store is a database.

FROM node:24-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
# Manifests first, so a source change does not re-resolve the whole workspace.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/anon/package.json ./apps/anon/
COPY packages/world-id/package.json ./packages/world-id/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/anon/node_modules ./apps/anon/node_modules
# pnpm symlinks dependencies per package, so the workspace package needs its
# own node_modules too — without it the build cannot resolve @worldcoin/idkit.
COPY --from=deps /repo/packages/world-id/node_modules ./packages/world-id/node_modules
COPY . .
# NEXT_PUBLIC_* is inlined into the client bundle at build time, so it has to
# be present now — setting it at runtime is too late.
ARG NEXT_PUBLIC_WORLD_APP_ID
ENV NEXT_PUBLIC_WORLD_APP_ID=$NEXT_PUBLIC_WORLD_APP_ID
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter anon build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# In a workspace, standalone nests the app under apps/anon and hoists
# node_modules to the root of the bundle.
COPY --from=build --chown=nextjs:nodejs /repo/apps/anon/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/anon/.next/static ./apps/anon/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/anon/public ./apps/anon/public

RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs
EXPOSE 3000
CMD ["node", "apps/anon/server.js"]
