FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build  # Vite -> dist/, CRA -> build/

FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html 2>/dev/null || true
COPY --from=builder /app/build /usr/share/nginx/html 2>/dev/null || true
EXPOSE 80
