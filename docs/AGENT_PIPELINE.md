# Agent Pipeline cho Social Forex

Mục tiêu: cho AI làm việc liên tục nhưng vẫn an toàn cho production. Pipeline này cho phép agent phân tích, lập task, implement trên branch riêng, review/test, rồi con người duyệt merge/deploy.

## Nguyên tắc an toàn

- AI không tự merge vào `main`.
- AI không tự deploy production.
- Mọi code change phải đi qua branch riêng + pull request + CI.
- Agent implement chỉ nhận task đã có acceptance criteria.
- Nếu thiếu dữ liệu, thiếu secret, hoặc test không chạy được, agent phải dừng và ghi blocker.
- Với Next.js trong repo này, agent phải đọc guide trong `node_modules/next/dist/docs/` trước khi sửa code Next.

## Vai trò

### Agent A — Research / Feedback

Nhiệm vụ:
- Đọc analytics, phản hồi user, issue, lỗi production, signup funnel.
- Tìm pattern: traffic thấp, conversion thấp, lỗi UX, lỗi SEO, lỗi kỹ thuật.
- Không sửa code.

Output:
- Báo cáo ngắn: vấn đề, bằng chứng, mức độ ảnh hưởng.
- 3-5 cơ hội cải thiện có đo lường.
- Đề xuất issue candidate.

Prompt mẫu:

```text
Bạn là Agent A cho Social Forex. Hãy phân tích dữ liệu/feedback hiện có để tìm vấn đề tăng trưởng hoặc chất lượng sản phẩm.

Không sửa code. Không tạo task mơ hồ.

Output:
1. Findings theo mức độ ảnh hưởng.
2. Bằng chứng từ file/log/analytics nếu có.
3. Đề xuất tối đa 5 task, mỗi task có user impact, scope, acceptance criteria.
4. Nếu thiếu dữ liệu, ghi rõ cần instrument gì.
```

### Agent B — Planner / Task Designer

Nhiệm vụ:
- Biến một issue hoặc đề xuất từ Agent A thành plan kỹ thuật.
- Chia task nhỏ, có dependency, file ownership, acceptance criteria.
- Xác định test cần chạy.

Output:
- `plan.md`
- `tasks.json`
- `task-board.md`

Prompt mẫu:

```text
Bạn là Agent B cho Social Forex. Từ issue bên dưới, hãy lập plan kỹ thuật và chia task có thể giao cho agent implement.

Yêu cầu:
- Đọc AGENTS.md và các docs liên quan.
- Với Next.js, đọc node_modules/next/dist/docs/ trước khi đề xuất API/convention.
- Không đề xuất rewrite lớn nếu có thể làm incremental.
- Mỗi task phải có files dự kiến, dependencies, acceptance criteria, test command.

Output:
- plan.md
- tasks.json
- task-board.md
```

### Agent C — Implementer

Nhiệm vụ:
- Tạo branch riêng.
- Implement task đã được duyệt.
- Chạy lint/test/typecheck/build phù hợp.
- Tạo PR hoặc patch, không tự merge.

Branch:
- `codex/agentc-issue-<number>-<short-slug>`

Quy tắc:
- Không sửa file ngoài scope nếu không cần.
- Không revert thay đổi không do mình tạo.
- Không thêm dependency nếu chưa có lý do rõ.
- Nếu CI/test fail vì lý do ngoài scope, ghi rõ trong PR.

Prompt mẫu:

```text
Bạn là Agent C cho Social Forex. Implement task đã được duyệt trên branch riêng.

Input:
- Issue / task-board
- Files ownership
- Acceptance criteria

Yêu cầu:
- Đọc AGENTS.md.
- Đọc Next docs trong node_modules/next/dist/docs/ nếu sửa App Router, metadata, server actions, cache, middleware hoặc config.
- Implement nhỏ gọn, theo pattern hiện có.
- Chạy test phù hợp.
- Không merge/deploy.

Output:
- Danh sách file đã đổi.
- Test đã chạy và kết quả.
- Blocker nếu có.
```

### Agent D — Reviewer / QA

Nhiệm vụ:
- Review PR như senior engineer.
- Ưu tiên bug, regression, security, missing tests, UX break.
- Chạy test hoặc chỉ rõ test chưa chạy được.
- Không tự sửa trừ khi được giao rõ.

Prompt mẫu:

```text
Bạn là Agent D cho Social Forex. Review PR/branch theo hướng code review.

Ưu tiên:
1. Bug hoặc regression.
2. Security / auth / data leak.
3. Missing tests hoặc test sai.
4. UX/i18n/accessibility issues.

Output:
- Findings trước, có file/line.
- Open questions.
- Test đã chạy.
- Kết luận: approve / request changes / needs human decision.
```

## Label gates trên GitHub

Đề xuất dùng các label:

- `agent:audit` — Agent A phân tích issue hoặc khu vực sản phẩm.
- `ready-to-plan` — Agent B lập plan.
- `planned` — đã có plan/task-board.
- `agent:implement` — Agent C được phép implement trên branch riêng.
- `agent:review` — Agent D review PR.
- `human-required` — cần người quyết định.
- `blocked` — agent không thể tiếp tục an toàn.

## Luồng chuẩn

1. Người dùng hoặc Agent A tạo issue có bối cảnh.
2. Gắn `ready-to-plan`.
3. Agent B tạo plan/task-board và đổi label sang `planned`.
4. Người duyệt scope, rồi gắn `agent:implement`.
5. Agent C tạo branch, implement, mở PR.
6. CI chạy `npm run lint`, `npm test`, `npm run build`.
7. Gắn `agent:review`.
8. Agent D review.
9. Người merge/deploy nếu ổn.

## Cadence 24/24 an toàn

Daily:
- Agent A: growth/product audit ngắn.
- Agent D: production smoke + route check.

Weekly:
- Agent A: SEO/content opportunities.
- Agent B: convert top opportunity thành backlog.

On demand:
- Agent C chỉ chạy khi issue đã có label `agent:implement`.

## Definition of Ready cho Agent C

Một task chỉ được implement khi có:

- User story hoặc bug report rõ.
- Scope trong/ngoài phạm vi.
- Files hoặc khu vực code dự kiến.
- Acceptance criteria.
- Test command.
- Quyết định product/compliance nếu liên quan VIP, payment, tài chính.

## Definition of Done cho PR agent

- Code nằm trên branch riêng.
- Không có thay đổi ngoài scope.
- i18n EN/VI nếu có user-facing copy.
- Không lộ secret.
- CI hoặc local checks đã chạy.
- PR mô tả: why, what changed, tests, risks, screenshots nếu UI.

