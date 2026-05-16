#!/usr/bin/env bash
# Usage: ./scripts/02-create-tasks.sh
# Cần chạy 01-plan.sh trước (plan.md + tasks.json phải tồn tại)
set -euo pipefail

if [[ ! -f "plan.md" || ! -f "tasks.json" ]]; then
  echo "Lỗi: plan.md hoặc tasks.json chưa tồn tại. Chạy 01-plan.sh trước."
  exit 1
fi

echo "=== [Task Creator] Tạo task board ==="

claude \
  --system-prompt ".claude/task-creator.md" \
  "Dưới đây là plan và task list từ Planner. Hãy tạo file \`task-board.md\` với checklist chi tiết cho developer.

--- plan.md ---
$(cat plan.md)

--- tasks.json ---
$(cat tasks.json)"

echo ""
echo "=== Done. Kiểm tra task-board.md ==="
