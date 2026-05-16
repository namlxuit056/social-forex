#!/usr/bin/env bash
# Usage: ./scripts/03-implement.sh [TASK_ID]
# Nếu không truyền TASK_ID, implement tất cả task theo thứ tự depends_on
set -euo pipefail

if [[ ! -f "tasks.json" || ! -f "task-board.md" || ! -f "plan.md" ]]; then
  echo "Lỗi: Cần chạy 01-plan.sh và 02-create-tasks.sh trước."
  exit 1
fi

FILTER_ID="${1:-}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Lấy danh sách task (lọc theo ID nếu có)
if [[ -n "$FILTER_ID" ]]; then
  TASKS=$(jq -c --arg id "$FILTER_ID" '.tasks[] | select(.id == $id)' tasks.json)
else
  TASKS=$(jq -c '.tasks[]' tasks.json)
fi

if [[ -z "$TASKS" ]]; then
  echo "Không tìm thấy task${FILTER_ID:+ với ID $FILTER_ID}."
  exit 1
fi

while IFS= read -r task; do
  TASK_ID=$(echo "$task" | jq -r '.id')
  TASK_TITLE=$(echo "$task" | jq -r '.title')

  echo ""
  echo "=========================================="
  echo "Implementing $TASK_ID: $TASK_TITLE"
  echo "=========================================="

  # Xóa BLOCKED.md cũ nếu còn
  rm -f BLOCKED.md

  claude \
    --system-prompt ".claude/developer.md" \
    "Implement task sau đây.

--- Task ---
$(echo "$task" | jq .)

--- Checklist từ task-board.md ---
$(awk "/## \[$TASK_ID\]/,/^## \[/" task-board.md | head -n -1)

--- Context (plan.md) ---
$(cat plan.md)"

  if [[ -f "BLOCKED.md" ]]; then
    echo ""
    echo "BLOCKED ở task $TASK_ID — cần human review:"
    cat BLOCKED.md
    exit 1
  fi

  # Auto-commit sau moi task (chua push)
  if [[ -n "$(git status --porcelain)" ]]; then
    echo ""
    echo "--- Git: commit changes cho $TASK_ID ---"

    # Stage các file liên quan đến task (lấy từ tasks.json)
    TASK_FILES=$(echo "$task" | jq -r '.files[]?' 2>/dev/null || true)
    if [[ -n "$TASK_FILES" ]]; then
      while IFS= read -r file; do
        if [[ -e "$file" ]]; then
          git add "$file"
          echo "  staged: $file"
        fi
      done <<< "$TASK_FILES"
    fi

    # Chỉ commit nếu có gì được staged
    if [[ -n "$(git diff --cached --name-only)" ]]; then
      COMMIT_MSG="feat($TASK_ID): $TASK_TITLE"
      git commit -m "$COMMIT_MSG"
      echo "  committed: $COMMIT_MSG"
    else
      echo "  (không có file nào được staged — bỏ qua commit)"
    fi
  else
    echo "  (không có thay đổi — bỏ qua commit)"
  fi

  echo ""
  echo "$TASK_ID done."

done <<< "$TASKS"

echo ""
echo "=== Tat ca task hoan thanh. Pushing len $BRANCH... ==="
git push origin "$BRANCH"
echo "=== Done: da push len origin/$BRANCH ==="
