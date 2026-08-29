# Build context is the repo root (npm workspaces monorepo) — build with:
#   docker build -f client/Dockerfile -t clashreel-client .
# or via docker-compose.yml, which sets this up for you.

FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY client ./client
RUN npm run build -w client

# --- Runtime image: static files behind nginx ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
