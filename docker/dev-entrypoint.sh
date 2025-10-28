#!/usr/bin/env sh
set -e

# Install on first run if node_modules is empty (Bind-Mount won't include it)
if [ ! -d "/app/node_modules" ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ]; then
  echo ">> Installing dependencies (pnpm install)..."
  pnpm install --frozen-lockfile
fi

# Auto-detect stack and start with HMR-friendly settings
if grep -q "\"vite\"" package.json 2>/dev/null || [ -f vite.config.ts ] || [ -f vite.config.js ]; then
  echo ">> Detected Vite. Enabling host=0.0.0.0 and polling watch..."
  exec pnpm vite --host 0.0.0.0
elif grep -q "react-scripts" package.json 2>/dev/null; then
  echo ">> Detected CRA/Webpack. Enabling Watchpack polling..."
  export WATCHPACK_POLLING=true
  exec pnpm start
elif grep -q "\"next\"" package.json 2>/dev/null; then
  echo ">> Detected Next.js. Forcing webpack dev server with polling for Docker..."
  export HOSTNAME=0.0.0.0
  export PORT="${PORT:-3000}"
  : "${NEXT_WEBPACK_USEPOLLING:=true}"
  : "${WATCHPACK_POLLING:=true}"
  : "${WATCHPACK_POLLING_INTERVAL:=100}"
  : "${CHOKIDAR_USEPOLLING:=true}"
  : "${NEXT_DISABLE_TURBOPACK:=1}"
  : "${NEXT_FORCE_WEBPACK:=1}"
  export NEXT_WEBPACK_USEPOLLING WATCHPACK_POLLING WATCHPACK_POLLING_INTERVAL CHOKIDAR_USEPOLLING NEXT_DISABLE_TURBOPACK NEXT_FORCE_WEBPACK
  exec pnpm exec next dev --hostname "$HOSTNAME" --port "$PORT"
else
  echo "!! No Vite or CRA detected. Trying generic dev/start..."
  exec sh -c "pnpm dev || pnpm start || node server.js"
fi

