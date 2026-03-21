#!/bin/bash
# run-all.sh — 一键跑全部 e2e 测试（串行执行）
set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)

# 绕过代理访问 localhost
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1

echo "=== WFM E2E Tests ==="

# 1. 停掉已有后端
echo "[1/5] Stopping existing backend..."
kill $(lsof -ti:3210) 2>/dev/null || true
sleep 1

# 2. 清库 + 种子
echo "[2/5] Preparing database..."
cd backend
rm -f data/wfm.db data/wfm.db-shm data/wfm.db-wal
bunx drizzle-kit push 2>&1 | tail -1
bun src/db/seed.ts 2>&1 | tail -1

# 3. 启动后端
echo "[3/5] Starting backend..."
bun src/index.ts &
BACKEND_PID=$!
sleep 2
curl --noproxy localhost -s http://localhost:3210/api/health > /dev/null || { echo "ERROR: Backend failed"; kill $BACKEND_PID; exit 1; }
echo "  Backend ready (PID: $BACKEND_PID)"

# 4. 串行跑测试（按文件名顺序）
echo "[4/5] Running tests..."
cd "$ROOT"
FAILED=0
PASSED=0
TOTAL=0

for f in tests/e2e/us*.test.ts; do
  name=$(basename "$f" .test.ts)
  TOTAL=$((TOTAL + 1))
  echo -n "  $name ... "
  if bun test "$f" --timeout 30000 2>&1 | tail -1 | grep -q "pass"; then
    echo "PASS"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
    # 显示错误详情
    bun test "$f" --timeout 30000 2>&1 | grep -E "(fail|Error|TypeError)" | head -5
  fi
done

# 5. 清理
echo "[5/5] Stopping backend..."
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null || true

echo ""
echo "=== Results: $PASSED/$TOTAL passed, $FAILED failed ==="
[ $FAILED -eq 0 ] && echo "ALL TESTS PASSED" || echo "SOME TESTS FAILED"
exit $FAILED
