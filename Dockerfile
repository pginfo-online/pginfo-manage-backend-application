# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build the application ----
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN pnpm build

# ---- Stage 3: Production image ----
FROM node:22-alpine AS production

LABEL org.opencontainers.image.title="PgInfo Backend"
LABEL org.opencontainers.image.description="PgInfo NestJS backend service"
LABEL org.opencontainers.image.source="https://github.com/pginfo/backend"

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

USER node

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
