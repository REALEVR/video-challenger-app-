# Build context is the repo root (npm workspaces monorepo) — build with:
#   docker build -f server/Dockerfile -t clashreel-server .
# or via docker-compose.yml, which sets this up for you.

FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY server ./server
RUN npm run build -w server

# --- Runtime image: only what's needed to run the compiled server ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/server/dist ./dist
COPY --from=build /repo/server/prisma ./prisma
COPY --from=build /repo/server/package.json ./package.json

# Persisted at runtime via a volume — see docker-compose.yml.
RUN mkdir -p /data/uploads
VOLUME ["/data"]

EXPOSE 4000

# Applies any pending migrations against the mounted DB, then starts the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
