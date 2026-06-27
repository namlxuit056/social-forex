---
name: role-based-cursor-rules
description: >-
  Guides setup and use of separate Cursor rules per role (PM/BA, UX/UI, Senior Dev)
  under .cursor/rules/, avoids cramming every responsibility into a single prompt,
  and points to GitHub MCP for issues. Use when creating or editing role rules,
  PRDs, UX consistency checks, TDD workflow, or when the user mentions
  multi-role workflows or .cursor/rules/.
---

# Role-based Cursor rules (social-forex)

## Mục đích

Chia trách nhiệm theo **vai trò** bằng các file rule riêng. Một lệnh đơn không nên yêu cầu AI: phân tích nghiệp vụ + thiết kế UI + kiến trúc + code + test + tạo Issue cùng lúc.

## Vị trí file

| Vai trò | File |
|--------|------|
| Luồng làm việc (một việc / một lần) | `.cursor/rules/workflow-role-lanes.mdc` |
| PM/BA | `.cursor/rules/pm-ba.mdc` |
| UX/UI | `.cursor/rules/ux-ui.mdc` |
| Senior Dev | `.cursor/rules/senior-dev.mdc` |

## Cách kích hoạt

1. **Luôn bật**: `workflow-role-lanes.mdc` (`alwaysApply: true`) nhắc chia nhỏ công việc.
2. **Theo ngữ cảnh**: Bật rule vai trò phù hợp trong Rule picker hoặc `@` rule khi bắt đầu phiên (PM viết PRD, UX chỉnh giao diện, Dev implement + test).
3. **Theo file**: `ux-ui.mdc` có `globs` cho `*.tsx` / `globals.css`; các rule khác chủ yếu bật thủ công khi cần.

## Quy ước ngắn

- **PM/BA**: Hiểu yêu cầu → PRD/tài liệu → phân rã → Issue (GitHub MCP nếu có).
- **UX/UI**: Tailwind + Shadcn UI; kiểm tra palette, spacing, typography trước khi coi là xong.
- **Senior Dev**: Clean code, pattern phù hợp; **test trước hoặc cùng lúc với spec rõ** (TDD); không bỏ qua edge cases đã thống nhất.

## Khi chỉnh sửa rule

- Một concern / một file; giữ ngắn (khuyến nghị < 50 dòng mỗi rule nếu có thể).
- Cập nhật mô tả trong frontmatter để Rule picker dễ tìm.

## Tài liệu thêm

- Định dạng rule Cursor: xem skill `create-rule` (`.cursor/rules/*.mdc`, frontmatter `description`, `globs`, `alwaysApply`).
