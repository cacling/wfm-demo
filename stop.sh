#!/bin/bash
# stop.sh — 停止 WFM 排班系统

cd "$(dirname "$0")"

echo "=== Stopping WFM System ==="

# 从 PID 文件停止
if [ -f .backend.pid ]; then
  PID=$(cat .backend.pid)
  kill "$PID" 2>/dev/null && echo "  Backend (PID: $PID) stopped" || echo "  Backend not running"
  rm -f .backend.pid
fi

if [ -f .frontend.pid ]; then
  PID=$(cat .frontend.pid)
  kill "$PID" 2>/dev/null && echo "  Frontend (PID: $PID) stopped" || echo "  Frontend not running"
  rm -f .frontend.pid
fi

# 兜底：按端口清理
kill $(lsof -ti:3210) 2>/dev/null && echo "  Port 3210 cleaned"
kill $(lsof -ti:3201) 2>/dev/null && echo "  Port 3201 cleaned"

echo "Done."
