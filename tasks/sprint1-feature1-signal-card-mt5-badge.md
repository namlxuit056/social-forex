# Task: Hiển thị MT5 Verified badge trên Signal Card

**Sprint:** 1 | **Feature:** Verified Performance Card  
**File chính:** Tìm signal card component trong `src/components/signals/`  
**Trạng thái:** TODO

---

## Context

Trader xem danh sách signals chưa biết signal nào đến từ người có MT5 thực sự.  
Badge "Verified via MT5" ngay trên signal card sẽ tăng trust và conversion follow.

---

## Việc cần làm

### 1. Xác định component signal card

Tìm component hiển thị mỗi signal trong danh sách:
```bash
find src/components/signals -name "*.tsx" | sort
```

### 2. Truyền `authorHasMt5` prop

Từ page `src/app/[locale]/signals/page.tsx`, khi query signals thêm:
```ts
// Lấy danh sách userId có MT5 active
const mt5UserIds = await prisma.mt5Connection.findMany({
  where: { revokedAt: null },
  select: { userId: true },
  distinct: ["userId"],
});
const mt5Set = new Set(mt5UserIds.map((r) => r.userId));
```

Rồi pass `authorHasMt5: mt5Set.has(signal.authorId)` vào từng signal item.

### 3. Render badge

```tsx
{authorHasMt5 && (
  <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-400 text-[10px] px-1.5 py-0.5">
    <ShieldCheck className="size-2.5" />
    MT5
  </Badge>
)}
```

Đặt cạnh tên author trên card.

---

## Notes

- 1 query `mt5Connection` cho cả trang, không query per-signal
- Badge nhỏ gọn — không chiếm diện tích card
- i18n: dùng key `profile.mt5ReadOnlyBadge` đã có
