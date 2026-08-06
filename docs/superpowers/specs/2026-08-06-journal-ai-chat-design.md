# Journal AI Chat — Design

## Mục tiêu
Thêm 1 tab chat AI trong trang Journal để user thảo luận với AI về:
- Tại sao thua nhiều trong 1 khoảng thời gian (dựa vào lịch sử trade)
- Tìm phương pháp/cải thiện thói quen giao dịch
- Hỏi ý kiến tham khảo TRƯỚC khi vào lệnh (dựa vào thống kê quá khứ + user tự mô tả setup, không gọi giá real-time)

## Quyết định đã chốt (qua trao đổi với user)
1. **1 thread chat chung, liên tục** cho mỗi user (không tách theo từng trade).
2. Context cho AI = thống kê/pattern từ `TradeJournal` của user (tái dùng `buildJournalAnalysisContext`) + lịch sử hội thoại gần đây. Không gọi `/api/quotes` real-time.
3. UI đặt ở **tab mới "AI Chat"** trong `/journal` (cạnh trades/weekly/edge/stats), không phải widget nổi.
4. **VIP-only** — giống `ArticleChat`, non-VIP thấy teaser + CTA nâng cấp, không gọi được API.

## Data model
Model mới, mirror `ArticleChatMessage` nhưng không gắn `articleId` (1 thread/user):

```prisma
model JournalChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String
  content   String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```
Thêm `journalChatMessages JournalChatMessage[]` vào `User`.

## Backend

### `src/lib/ai/journal-chat.ts` (mirror `article-chat.ts` + `journal-analysis.ts`)
- `buildSystemPrompt(locale, context)`: persona "conservative trading journal coach", 3 nhánh hướng dẫn rõ ràng trong prompt:
  - Loss review: khi user hỏi về thua lỗ trong quá khứ, đối chiếu với `recentTrades`/`symbolStats` trong context để chỉ ra pattern cụ thể (không đoán mò nếu data không đủ).
  - Improvement: gợi ý dựa trên `symbolStats`/`directionStats`/`totals` (win rate, profit factor, avg loss...).
  - Pre-trade check-in: khi user mô tả 1 lệnh **định** vào, trả lời bằng risk checklist (size, R:R, invalidation) đối chiếu lịch sử của symbol/setup đó — không phán "nên vào lệnh hay không", không hứa lợi nhuận.
  - Luôn nhắc: chỉ là coaching giáo dục, không phải lời khuyên tài chính.
- `getAiJournalChatReply({ trades, messages, locale })`: gọi `buildJournalAnalysisContext(trades)` (tái dùng nguyên hàm hiện có), `createAiClient`/`resolveAiProvider` như các module AI khác, `messages.slice(-10)` làm context hội thoại, `max_tokens` ~800 (dài hơn advisor vì có thể phải liệt kê vài điểm).
- `AiJournalChatUnavailableError` — theo đúng convention error class hiện có.

### `src/app/api/ai/journal-chat/route.ts` (mirror `article-chat/route.ts`)
- `requireVipUser()`: auth + check `isVipActive(user.vipUntil)`, 401 nếu chưa login, 403 nếu không VIP.
- `GET`: trả lịch sử. Khác với article-chat (thread ngắn theo từng bài viết), thread này sống lâu dài nên lấy **N tin nhắn mới nhất** đúng nghĩa: `orderBy: createdAt desc, take: 50`, rồi reverse trước khi trả về — tránh bug "luôn thấy 50 tin đầu tiên" nếu chỉ lấy `asc + take`.
- `POST`:
  - zod validate `{ content: string, 1..2000 ký tự }`.
  - rate limit `ai-journal-chat:${userId}`, 12 req / 5 phút (VIP-only nên chỉ 1 mức, dùng chung ngưỡng VIP đã có ở advisor/article-chat).
  - Query `trades = prisma.tradeJournal.findMany({ where: { userId }, orderBy: { openedAt: "desc" }, take: 200 })` — đủ cho `buildJournalAnalysisContext` (hàm này tự cắt `recentTrades` còn 80).
  - Query lịch sử hội thoại gần đây (`take: 20`, `orderBy: createdAt desc` rồi reverse) làm context messages.
  - Gọi `getAiJournalChatReply`, lưu cặp user+assistant message qua `prisma.$transaction` (đúng pattern article-chat), trả `{ userMessage, assistantMessage, disclaimer }`.

### `src/lib/ai/types.ts`
Thêm (mirror các type `AiArticleChat*` hiện có, không có `articleId`):
- `aiJournalChatRequestSchema`
- `AiJournalChatMessage`
- `AiJournalChatHistoryResponse`
- `AiJournalChatSendResponse`

## Frontend

### `src/app/[locale]/journal/journal-chat.tsx` (client component, mirror `ArticleChat`)
Props: `{ isLoggedIn: boolean; isVip: boolean }`.
- Nếu `!isVip`: hiện teaser (icon Lock) + mô tả tính năng + CTA link nâng cấp VIP (giống nhánh khoá của `ArticleChat`).
- Nếu `isVip`: load history qua `GET /api/ai/journal-chat` khi mount, textarea + nút gửi, render markdown câu trả lời AI (dùng `marked`, đồng nhất với `ArticleChat`), quick-prompt suggestions:
  - "Vì sao tôi hay thua lệnh gần đây?"
  - "Tìm phương pháp cải thiện win rate"
  - "Tôi định vào lệnh, cho tôi tham khảo trước"

### `src/app/[locale]/journal/page.tsx`
- Thêm tab `"chat"` vào danh sách tab (`activeTab` switch + `<nav>` links `/journal?tab=chat`).
- Query thêm `vipUntil` của user hiện tại (1 field, không cần query mới nếu đã có sẵn — nếu chưa, thêm `select: { vipUntil: true }` song song với các query hiện tại) để tính `isVip` truyền xuống `JournalChat`.
- Render `<JournalChat isLoggedIn isVip={isVip} />` khi `activeTab === "chat"`.

## i18n
- `messages/vi.json` / `messages/en.json`, namespace `journal`: thêm `tabChat`.
- Namespace mới `journalChat` (mirror cấu trúc namespace `articleChat` hiện có: title, placeholder, quick prompts, error, vip lock copy, disclaimer label...). Thêm đồng bộ cả 2 file.

## Ngoài phạm vi (out of scope)
- Không gọi giá real-time (`/api/quotes`) trong context — đã chốt ở bước hỏi đáp.
- Không hỗ trợ streaming response — giữ nguyên convention non-streaming JSON của toàn bộ AI features hiện tại (không có Vercel AI SDK trong deps).
- Không có nút "xoá lịch sử chat" trong bản đầu — có thể thêm sau nếu cần.
- Không tách chat riêng theo từng trade.

## Testing
- Không cần DB/HTTP mock theo convention Vitest hiện tại của repo — không có pure-logic mới đáng kể để unit test ngoài phần đã có sẵn (`buildJournalAnalysisContext` đã được test/dùng ở journal-analysis). Nếu có logic parse/validate mới (vd. schema zod), có thể thêm test nhỏ tương tự các test hiện có trong `src/lib/**/*.test.ts`.
- Verify thủ công: build không lỗi, `npm run lint`, thử chat trên dev server với tài khoản VIP và non-VIP.
