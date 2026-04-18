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

## Signal detail — bối cảnh tin (*News context strip*)

**Tham chiếu spec:** `docs/specs.md` — *Bối cảnh tin tức: lịch kinh tế gắn với cặp & tín hiệu*.  
**Vị trí:** `/[locale]/signals/[id]` — dưới khối giá/notes (trong cùng flow với nội dung signal), **trước** reactions/comments nếu muốn nhấn “bối cảnh trước khi tương tác”; hoặc ngay dưới card chính, tách `Card` riêng để không lẫn tier thị giác của signal.

### Wireframe (desktop)

```
┌── Card: News context ────────────────────────────────┐
│ H3 + optional icon (Calendar)                         │
│ Disclaimer: 1 dòng, text-xs text-muted-foreground   │
├─────────────────────────────────────────────────────┤
│ List (max ~8–12 dòng, scroll nội bộ nếu dài)        │
│  • time (tabular) · CUR · title truncated…  [impact]  │
│  • …                                                │
├─────────────────────────────────────────────────────┤
│ [outline Button / Link] → Economic calendar         │
└──────────────────────────────────────────────────────┘
```

### Trạng thái

| Trạng thái | UI |
|------------|-----|
| Có sự kiện | Danh sách theo thời gian tăng dần; mỗi dòng: **thời gian** (theo zone VN hoặc UTC — đồng bộ quy ước với trang calendar), **currency** (`font-mono` text-xs), **title** (`text-sm`, line-clamp-2 nếu cần). |
| Empty (0 row) | Một dòng empty state muted, không icon cảnh báo đỏ; không coi là lỗi. |
| Symbol không map được tiền tệ | **Ẩn cả khối** (không chiếm chỗ); không hiện “lỗi”. |

### Badge impact — **đồng bộ với Economic Calendar**

Dùng **cùng class tailwind** như `economic-calendar.tsx` (`impactBadge`):

- **low:** `bg-muted text-muted-foreground`
- **medium:** `bg-amber-500/15 text-amber-200/95`
- **high:** `bg-destructive/20 text-destructive`

Nhãn chữ lấy từ `calendar.impactLow` / `impactMedShort` / `impactHigh` (i18n), không hardcode.

### Mobile

- Card full width; list không cần cột bảng — stack **time + currency** trên một hàng, **title** hàng dưới, badge impact canh phải hoặc dưới title.
- Nút “Mở lịch” full width `sm` nếu cần touch target.

### Component

- `SignalNewsContext` (RSC): nhận dữ liệu đã query; không fetch trong client.

---

## Public profile — `/[locale]/u/[userId]`

**Tham chiếu spec:** `docs/specs.md` — *Trang hồ sơ công khai `/u/[userId]`: làm lại UX/UI (P2)*.

### Thứ tự section (dọc trang)

1. **Profile hero** — nhận diện + hành động (Follow / Message / Sign in).
2. **Trader performance card** — thống kê signal đã đóng (RSC).
3. **Stats strip** — Followers · Following · Threads (`dl` grid 3 cột).
4. **Optional:** link ngắn tới **Forum** khi `threadCount > 0` (không giả deep-link theo author nếu chưa có API).
5. **Followers list** — tối đa N bản ghi server; UI **co giãn** (12 mục + “Show more”) để giảm DOM ban đầu trên mobile.
6. **PageCtaRow** — discovery.

### Wireframe — mobile (≤640px)

```
┌── Card hero (rounded-xl border bg-card/50) ─────────────┐
│ ┌──────┐                                                 │
│ │avatar│  H1 display name (truncate)                      │
│ │ 20   │  text-xs muted: subtitle “Trader on …”          │
│ │ sm   │  Member since {date}                            │
│ └──────┘  Bio (prose muted, max-w readable)              │
│                                                           │
│ [ Follow ] [ Message ]   hoặc   [ Sign in to follow ]     │
│ (flex-wrap gap-2; nút sm, đủ vùng chạm)                   │
└───────────────────────────────────────────────────────────┘
```

### Wireframe — desktop (≥640px)

```
┌── Card hero ──────────────────────────────────────────────┐
│ ┌────────┐   H1 + subtitle + date                         │  ┌ actions ─┐
│ │ avatar │   bio                                           │  │ Follow   │
│ │ 20×20  │                                                 │  │ Message  │
│ │ (lg)   │                                                 │  └──────────┘
│ └────────┘                                                 │
└─────────────────────────────────────────────────────────────┘
```

- **Avatar:** `size-20` (`5rem`) desktop; `size-16` mobile nếu cần cân đối — giữ đồng bộ với `rounded-full`, `ring-1 ring-border`, fallback chữ cái `text-sm font-semibold`.
- **H1:** `font-heading text-2xl font-semibold` — một H1 duy nhất trên trang.

### Performance card (trên profile)

- Nút chính: **`/signals?author=…`** khi có **display name** hợp lệ để lọc theo tác giả (contains name/email — xem spec kỹ thuật); fallback `/signals` nếu không có tên.
- Copy nút: `traderStats.viewSignalsByAuthor` vs `viewSignals` (i18n).

### Followers block

- Heading H2 `text-lg` + danh sách dạng grid `gap-2 sm:grid-cols-2`.
- **Load more:** `Button variant="ghost" size="sm"` hoặc link-styled; không tăng số bản ghi server — chỉ mở rộng hiển thị client trong giới hạn đã fetch.

### Skeleton (`u/[userId]/loading.tsx`)

- Khối hero placeholder (avatar circle + lines), một card performance placeholder, strip 3 ô, vài dòng follower — `animate-pulse`, `bg-muted/40`.

---

## Public profile — thẻ uy tín trader (*performance card*)

**Tham chiếu spec:** `docs/specs.md` — *Thẻ uy tín trader (public performance) trên `/u/[userId]`*.  
**Vị trí:** Ngay **dưới profile hero**, **trên** grid follower/following/thread.

### Wireframe

```
┌── Card (border-muted, bg-card/50) ──────────────────┐
│ Title: “Signal performance” (i18n)                  │
│ Disclaimer: text-xs text-muted-foreground, 1–2 dòng │
├────────────────────────────────────────────────────┤
│ [ Đủ mẫu ]   Win rate lớn (tabular-nums) + %        │
│              Sub: X wins · Y losses · Z total       │
│ [ Ít mẫu ]   Copy “chưa đủ lệnh đóng để hiển thị %” │
│ [ Zero ]     Empty state ngắn                        │
├────────────────────────────────────────────────────┤
│ [outline] → `/signals` hoặc `/signals?author=…`     │
└────────────────────────────────────────────────────┘
```

### Màu & thứ bậc

- **Không** dùng xanh lá “đảm bảo lợi nhuận”; win rate dùng `text-foreground` hoặc accent nhẹ (`primary` tinh chỉnh opacity).  
- Số win/loss: `text-muted-foreground`; có thể badge outline `secondary` cho “W / L” count.

### Component

- RSC nhận aggregate từ server; không tính trên client.

---

*Cập nhật khi ship từng phase trong `docs/specs.md` (Signal Room UX/UI).*
