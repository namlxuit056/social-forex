# Journal "Lessons" Tab — Design

**Date:** 2026-09-01
**Area:** Journal → new tab `/journal?tab=lessons`
**Status:** approved, implementing

## Vấn đề

Không có nơi để trader ghi lại **bài học cần cải thiện** (kèm ảnh chart). Emotion
diary là date-keyed note; lesson là danh sách chạy tự do.

## Giải pháp

Tab mới "Bài học" — danh sách note thuần + 1 ảnh tùy chọn, sửa/xóa. Không trạng
thái, không tag (user chọn "chỉ note thuần").

## Model — `JournalLesson`

```prisma
model JournalLesson {
  id       String  @id @default(cuid())
  userId   String
  body     String
  imageUrl String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId, createdAt])
}
```

Back-relation `journalLessons JournalLesson[]` trên `User`. Migration tay
`20260901120000_journal_lesson` (CREATE TABLE + index + FK).

## Actions — `src/actions/journal.ts`

- `saveJournalLesson(_prev, formData)` — auth → zod `body` (1..4000) → `imageUrl`
  qua `parseJournalImageUrl` → nếu có `lessonId` (check ownership) thì update,
  không thì create → `revalidateJournalPaths()`. Trả `{ ok } | { error }`.
- `deleteJournalLesson(formData)` — auth + ownership + delete (giống
  `deleteEmotionDiaryEntry`).

## Component — `src/app/[locale]/journal/journal-lessons.tsx`

Client, copy pattern `JournalEmotionDiary`:
- Form: `<Textarea name="body">` + `<JournalImageField>` (đã có, `name="imageUrl"`,
  upload `/api/signal-images/upload`) + submit. Edit: hidden `lessonId`,
  `JournalImageField defaultUrl`. `useActionState(saveJournalLesson)`,
  `formKey` reset sau khi lưu.
- List: card body (`whitespace-pre-wrap`) + thumbnail ảnh (link tab mới) +
  ngày tạo + Sửa/Xóa (confirm).
- `EmptyState` khi rỗng.

## Wiring — `page.tsx`

- `activeTab` thêm nhánh `"lessons"`.
- `prisma.journalLesson.findMany({ where:{userId}, orderBy:{createdAt:"desc"},
  take: 200 })` khi tab active (trong `Promise.all` sẵn có).
- `<Link href="/journal?tab=lessons">` sau tab "Cảm xúc" (tab journal là Link
  inline — **không** đụng nav-config.ts vì không phải route mới).
- Render `<JournalLessons lessons={...} locale={locale} />`, serialize `createdAt`
  → ISO string.

## i18n — `journal.*` vi + en

`tabLessons`, `lessonsFormTitle`, `lessonBody`, `lessonBodyPlaceholder`,
`lessonSave`, `lessonSaveEdit`, `lessonCancelEdit`, `lessonEmpty`,
`lessonEmptyHint`.

## Test

Không — chỉ có server action, codebase chỉ unit-test pure function.
`parseJournalImageUrl` đã có coverage.

## Ngoài phạm vi

- Trạng thái "đã cải thiện" / resolvedAt.
- Gắn lesson với mistake tag / trade.
- Nhiều ảnh / tiêu đề riêng.
