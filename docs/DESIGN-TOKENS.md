# Design tokens — Social Forex

Tài liệu tham chiếu nhanh cho UI (Shadcn base-nova + Tailwind CSS 4). Nguồn sự thật: `src/app/globals.css` (`:root` / `.dark`).

## Chế độ màu

- Ứng dụng dùng **`class="dark"`** trên `<html>` (xem `src/app/layout.tsx`).
- Màu semantic map tới biến CSS `--background`, `--foreground`, `--primary`, v.v.

## Semantic (trích ý chính)

| Token | Ý nghĩa trong dự án |
|--------|----------------------|
| `--background` | Nền app (zinc tối) |
| `--foreground` | Chữ chính |
| `--primary` / `--primary-foreground` | CTA chính (emerald / chữ sáng) |
| `--muted` / `--muted-foreground` | Vùng phụ, mô tả |
| `--border` / `--input` / `--ring` | Viền, ô nhập, focus |
| `--destructive` | Lỗi, cảnh báo bán |
| `--card` / `--card-foreground` | Thẻ nội dung |
| `--chart-1` … `--chart-5` | Biểu đồ / long-short / heatmap |

## Typography

- **Sans:** Geist Sans (`--font-geist-sans`) — body & heading mặc định.
- **Mono:** Geist Mono (`--font-geist-mono`) — giá, mã, bảng số.
- Class Tailwind: `font-heading` trùng sans cho tiêu đề.

## Bo góc

- `--radius` mặc định ~ `0.625rem`; Shadcn map `--radius-sm` … `--radius-4xl`.

## Component library

- Nút, thẻ, input: `@/components/ui/*` (Shadcn registry).
- Layout hỗ trợ Giai đoạn A:
  - `EmptyState` — trạng thái trống + CTA.
  - `PageCtaRow` — hàng nút “Tiếp theo”.
  - `BackLink` — điều hướng “← …”.

## Preset CTA

- `src/lib/page-cta-presets.ts` — nhóm link lặp lại (`explore`, `trading`, `community`, `learn`, `risk`).

---

*Cập nhật khi thay đổi `globals.css` hoặc theme.*
