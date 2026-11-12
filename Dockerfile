# ---- Shared Node.js and package manager setup ----
FROM node:22-alpine AS base

RUN apk add --no-cache openssl \
    && corepack enable \
    && corepack prepare pnpm@12.15.0 --activate

WORKDIR /app

# ---- Stage 1: Install dependencies ----
FROM base AS deps

RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build the application ----
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN pnpm build

# ---- Stage 3: Production image ----
FROM base AS production

LABEL org.opencontainers.image.title="PgInfo Backend"
LABEL org.opencontainers.image.description="PgInfo NestJS backend service"
LABEL org.opencontainers.image.source="https://github.com/pginfo/backend"

RUN apk add --no-cache dumb-init libstdc++

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

USER node

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
