#!/usr/bin/env bash
# Usage: ./scripts/01-plan.sh "Mô tả user story"
set -euo pipefail

STORY="${1:?Cần truyền user story. Ví dụ: ./scripts/01-plan.sh 'Cho phép user pin signal lên profile'}"

echo "=== [Planner] Phân tích user story ==="
echo "Story: $STORY"
echo ""

claude \
  --system-prompt ".claude/planner.md" \
  "User Story: $STORY

Hãy đọc CLAUDE.md để hiểu project, sau đó tạo:
1. File \`plan.md\` — phân tích kỹ thuật và thứ tự implement
2. File \`tasks.json\` — danh sách task theo format đã định nghĩa"

echo ""
echo "=== Done. Kiểm tra plan.md và tasks.json ==="
