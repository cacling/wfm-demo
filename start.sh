#!/bin/bash
# start.sh — 一键启动 WFM 排班系统
#
# 用法：
#   ./start.sh          # 正常启动（保留数据）
#   ./start.sh --reset   # 重置数据库 + 重新 seed + 启动

set -e
cd "$(dirname "$0")"
ROOT=$(pwd)

RESET=false
[ "$1" = "--reset" ] && RESET=true

echo "=== WFM Schedule System ==="

# 1. 停掉已有进程
echo "[1/4] Cleaning up..."
kill $(lsof -ti:3210) 2>/dev/null || true
kill $(lsof -ti:3201) 2>/dev/null || true
sleep 1

# 2. 后端准备
echo "[2/4] Preparing backend..."
cd "$ROOT/backend"

# 安装依赖（如果 node_modules 不存在）
[ ! -d "node_modules" ] && echo "  Installing backend deps..." && bun install --frozen-lockfile 2>&1 | tail -1

# 确保 data 目录存在
mkdir -p data

if [ "$RESET" = true ]; then
  echo "  Resetting database..."
  rm -f data/wfm.db data/wfm.db-shm data/wfm.db-wal
  bunx drizzle-kit push 2>&1 | tail -1
  bun src/db/seed.ts 2>&1 | tail -1
  echo "  Database reset complete"
else
  # 如果数据库不存在，自动初始化
  if [ ! -f "data/wfm.db" ]; then
    echo "  Initializing database (first run)..."
    bunx drizzle-kit push 2>&1 | tail -1
    bun src/db/seed.ts 2>&1 | tail -1
  fi
fi

# 3. 启动后端
echo "[3/4] Starting backend on :3210..."
bun src/index.ts &
BACKEND_PID=$!
sleep 2

if ! curl --noproxy localhost -s http://localhost:3210/api/health > /dev/null 2>&1; then
  echo "  ERROR: Backend failed to start"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi
echo "  Backend ready (PID: $BACKEND_PID)"

# 4. 启动前端
echo "[4/4] Starting frontend on :3201..."
cd "$ROOT/vue3"
[ ! -d "node_modules" ] && echo "  Installing frontend deps..." && npm install 2>&1 | tail -1
npx vite --port 3201 &
FRONTEND_PID=$!
sleep 3
echo "  Frontend ready (PID: $FRONTEND_PID)"

# 保存 PID
echo "$BACKEND_PID" > "$ROOT/.backend.pid"
echo "$FRONTEND_PID" > "$ROOT/.frontend.pid"

echo ""
echo "=== WFM System Started ==="
echo "  Backend:  http://localhost:3210"
echo "  Frontend: http://localhost:3201"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

# 等待 Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f '$ROOT/.backend.pid' '$ROOT/.frontend.pid'; echo 'Stopped.'; exit 0" INT TERM
wait
