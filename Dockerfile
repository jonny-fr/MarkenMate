FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS workspace
COPY --from=deps /app/node_modules ./node_modules
COPY . .

FROM workspace AS builder
# Set dummy DATABASE_URL for build time (not used, just prevents errors)
ARG DATABASE_URL=postgresql://dummy:dummy@dummy:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
ARG BETTER_AUTH_SECRET=dummy_secret_for_build_only
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
# DO NOT SET NEXT_PUBLIC_BETTER_AUTH_URL - we use window.location.origin at runtime
# If set, it gets embedded in the client bundle and can't be changed
RUN pnpm build

FROM node:20-alpine AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN corepack enable
RUN apk add --no-cache curl postgresql16-client
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
EXPOSE 3000
CMD ["node", "server.js"]

FROM workspace AS migrations
# Prepare pnpm to avoid runtime downloads
RUN pnpm --version
CMD ["pnpm", "db:push"]
