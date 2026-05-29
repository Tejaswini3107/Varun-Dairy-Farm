#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Varun Dairy Farm — local dev launcher
# Run once: chmod +x start.sh
# Then:     ./start.sh
# ─────────────────────────────────────────────────────────────

set -e

export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:$PATH"

echo "🥛 Varun Dairy Farm — starting local environment..."

# ── 1. Services ───────────────────────────────────────────────
echo "▶ Starting PostgreSQL + Redis..."
brew services start postgresql@16 2>/dev/null || true
brew services start redis 2>/dev/null || true
sleep 2

# ── 2. Load .env ──────────────────────────────────────────────
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# ── 3. API ────────────────────────────────────────────────────
echo "▶ Starting API on http://localhost:4000..."
cd apps/api
npx tsx --tsconfig tsconfig.json src/index.ts &
API_PID=$!
cd ../..

sleep 3

# ── 4. Web Admin ──────────────────────────────────────────────
echo "▶ Starting Admin Portal on http://localhost:5173..."
cd apps/web
npx vite --port 5173 &
WEB_PID=$!
cd ../..

echo ""
echo "✅ All services running!"
echo ""
echo "   Admin portal  →  http://localhost:5173"
echo "   API           →  http://localhost:4000"
echo "   API health    →  http://localhost:4000/health"
echo "   DB Studio     →  run: pnpm db:studio"
echo ""
echo "Press Ctrl+C to stop all servers."

# Keep running, kill children on exit
trap "kill $API_PID $WEB_PID 2>/dev/null; brew services stop postgresql@16; brew services stop redis; echo 'Stopped.'" EXIT
wait
