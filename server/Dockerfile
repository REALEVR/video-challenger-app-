# Build context is the repo root (npm workspaces monorepo) — build with:
#   docker build -f server/Dockerfile -t clashreel-server .
# or via docker-compose.yml, which sets this up for you.

FROM node:20-alpine AS build
WORKDIR /repo

# Prisma's engines link against OpenSSL, which node:*-alpine doesn't ship.
# Without it `prisma generate` picks the wrong engine and `migrate deploy`
# dies with "Could not parse schema engine response". Needed in both stages.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY server ./server
RUN npm run build -w server

# --- Runtime image: only what's needed to run the compiled server ---
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/server/dist ./dist
COPY --from=build /repo/server/prisma ./prisma
COPY --from=build /repo/server/package.json ./package.json

# Persist /data with a volume mounted by the platform: docker-compose.yml
# mounts one, and on Railway attach a volume at /data. There is deliberately
# no VOLUME instruction — Railway refuses to build a Dockerfile that has one,
# and compose doesn't need it. The server creates UPLOAD_DIR on startup, so a
# fresh empty volume is fine.
RUN mkdir -p /data/uploads

EXPOSE 4000

# Applies any pending migrations against the mounted DB, then starts the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
