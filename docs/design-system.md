# Design system — Social Forex (cấu trúc UI)

Bổ sung cho `DESIGN-TOKENS.md` (màu, type). Tài liệu này mô tả **bố cục & pattern** theo màn hình để đồng bộ UX/Dev.

---

## Signal Room — `/[locale]/signals`

**Tham chiếu:** [social-forex.vercel.app/en/signals](https://social-forex.vercel.app/en/signals)

### Cột dọc trang (desktop ≥1024px)

```
┌─────────────────────────────────────────────┐
│ H1 + mô tả (max-width prose / full)         │
├─────────────────────────────────────────────┤
│ [Alert] Login CTA (guest only)              │
│ [Alert] VIP upsell (logged in, có VIP list) │
├─────────────────────────────────────────────┤
│ [Primary] Post signal — form (collapsible)   │
├─────────────────────────────────────────────┤
│ H2 “List” + optional toolbar (filter P1)     │
│ ┌ card ─────────────────────────────────┐   │
│ │ Row1: symbol (mono lg) · badges · meta  │   │
│ │ Row2: thumbnails (gallery)             │   │
│ │ Row3: masked OR price grid             │   │
│ │ Row4: notes                            │   │
│ │ Row5: status + author actions          │   │
│ │ Row6: reactions + link detail →          │   │
│ └────────────────────────────────────────┘   │
│ … repeat …                                    │
├─────────────────────────────────────────────┤
│ Disclaimer (card muted / border)            │
├─────────────────────────────────────────────┤
│ PageCtaRow                                    │
└─────────────────────────────────────────────┘
```

### Card signal — thứ bậc thị giác

1. **Tier 1:** `symbol` (font-mono, semibold, ~text-lg) + `direction` + `tier` badges cùng hàng.
2. **Tier 2:** Thời gian + author — `text-xs text-muted-foreground`, canh phải trên desktop; trên mobile xếp dưới tier 1 full width.
3. **Tier 3:** Ảnh chart (gallery `sm`) — đã có lightbox full màn, không mở tab mới.
4. **Tier 4:** Giá — grid 3 cột **cố định** (`Entry | SL | TP`), label `text-muted-foreground`, value `font-mono`; masked: một khối amber thay thế.
5. **Tier 5:** Notes (truncated 2 dòng P2 nếu dài).
6. **Tier 6:** Status badge + nút đóng lệnh (author + ACTIVE).
7. **Tier 7:** Like / dislike / comment count + link chi tiết (primary hoặc ghost link có underline).

### Trạng thái & màu (đề xuất)

| Trạng thái    | Badge variant gợi ý | Ghi chú |
|---------------|---------------------|---------|
| ACTIVE        | `default` / outline emerald | Nổi bật “đang mở”. |
| CLOSED_WIN    | `secondary` hoặc success tint | Không trùng destructive. |
| CLOSED_LOSS   | `destructive` outline | |
| CANCELLED     | `outline` muted | |

### Form “Post signal”

- **Mặc định (P1):** thu gọn — chỉ hiện `CardTitle` + nút “Expand” / chevron; mở rộng giữ layout grid hiện tại.
- File upload: giữ ngoài `<form action>` server action (đã có); hint định dạng dưới label.

### Mobile (≤640px)

- Card: bỏ `flex-wrap` chồng chéo nếu gây 3+ hàng lộn xộn; ưu tiên **stack vertical** rõ: symbol row → badges row → meta row.
- Touch: nút “View detail” và reaction đủ khoảng cách; tránh vùng bấm dính nhau.

### Component tái sử dụng

- `Card`, `Badge`, `Button`, `EmptyState`, `Disclaimer`, `PageCtaRow`, `SignalImageGallery`, `SignalCreateForm`.

---

*Cập nhật khi ship từng phase trong `docs/specs.md` (Signal Room UX/UI).*
