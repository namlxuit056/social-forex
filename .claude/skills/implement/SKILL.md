---
name: implement
description: Đọc .claude/features.md và implement feature tiếp theo (hoặc feature được chỉ định). Dùng khi user gõ "/implement next feature" hoặc "/implement [tên feature]".
---

# Implement Feature từ Backlog

## Bước 1 — Xác định feature cần làm

Đọc `.claude/features.md`.

- Nếu args là `next feature` (hoặc không có args): chọn item `- [ ]` **đầu tiên** trong danh sách High Priority, sau đó Medium Priority.
- Nếu args là tên/từ khóa cụ thể: tìm item `- [ ]` khớp nhất với từ khóa đó.

Thông báo ngắn: "Implementing: **[tên feature]**"

## Bước 2 — Research codebase

Trước khi viết bất kỳ dòng code nào, đọc:
- Các file liên quan mà description của feature đề cập (model, route, component)
- Pattern tương tự trong codebase để follow đúng convention
- Schema Prisma nếu feature cần DB change

## Bước 3 — Tạo TodoWrite

Breakdown feature thành tasks nhỏ (3–8 tasks). Mark task đầu tiên `in_progress`.

## Bước 4 — Implement

Thực hiện từng task theo thứ tự:
- Tuân thủ patterns trong `CLAUDE.md` và `developer.md`
- Thêm i18n keys vào cả `messages/vi.json` và `messages/en.json`
- Nếu cần Prisma migration: tạo file migration thủ công trong `prisma/migrations/` và chạy `npx prisma migrate deploy`, sau đó `npx prisma generate`
- Mark completed sau khi xong mỗi task

## Bước 5 — Lint + Build

```bash
npm run lint
npm run build
```

Sửa tất cả errors trước khi tiếp tục. Warnings ở file cũ không phải của mình thì bỏ qua.

## Bước 6 — Đánh dấu hoàn thành trong backlog

Trong `.claude/features.md`:
- Đổi `- [ ]` → `- [x]` cho feature vừa làm xong
- Di chuyển dòng đó xuống section `## Completed`

## Bước 7 — Commit + Push

```bash
git add <only relevant files>
git commit -m "feat(...): ..."
git push origin main
```

**Không commit** file không liên quan (`.cursor/`, files cũ bị xóa, v.v.).

## Kết thúc

Báo cáo ngắn:
- Feature đã implement là gì
- Files đã thay đổi/tạo mới
- Feature tiếp theo trong backlog là gì
