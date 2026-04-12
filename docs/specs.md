# Spec — Lịch kinh tế API (Giai đoạn B)

## User story

Là **trader**, tôi muốn xem **lịch sự kiện kinh tế** với giờ rõ ràng (VN/UTC), biết sự kiện **sắp diễn / đang công bó / đã xong**, và dữ liệu **ưu tiên từ nguồn thật**; khi API lỗi hoặc hết hạn tôi vẫn thấy **cache hoặc dữ liệu mẫu** kèm **cảnh báo**, không bị trang trắng.

## Nguồn dữ liệu

- **Chính:** Financial Modeling Prep (FMP) — endpoint `stable/economic-calendar`, tham số `from` / `to` / `apikey`.
- **Yêu cầu:** Biến môi trường `FMP_API_KEY` (đăng ký tại [financialmodelingprep.com](https://financialmodelingprep.com)).
- **Lưu ý gói FMP:** Endpoint lịch kinh tế có thể trả **HTTP 402** (Restricted Endpoint) trên gói free — khi đó ứng dụng **chỉ hiển thị dữ liệu mẫu** và thông báo thân thiện, không dump lỗi thô.
- **Fallback:** Bảng dữ liệu mẫu trong code (`sampleCalendar`) khi không có key, FMP trả 0 sự kiện, 402/subscription, hoặc lỗi không có cache DB.

## Tần suất đồng bộ & cache

- **TTL:** `CALENDAR_SYNC_TTL_MINUTES` (mặc định **45** phút). Trong TTL, server **đọc từ PostgreSQL** (`EconomicCalendarEvent`), **không** gọi lại FMP.
- **Khi hết TTL hoặc DB trống:** Gọi FMP, **xóa và ghi lại** bảng sự kiện, cập nhật `CalendarSyncMeta.lastSyncAt`.
- **Khi FMP lỗi** nhưng DB còn dữ liệu cũ: Trả **cache DB** + `warning` (nguồn `stale_db`).

## Xử lý lỗi API

- Lỗi HTTP / parse / timeout → thử hiển thị **cache DB**; nếu không có → **mẫu** + thông báo lỗi ngắn.
- Không throw ra UI: trang `/calendar` luôn render được.

## Đồng bộ timezone

- **Lưu:** `timeUtc` dạng ISO UTC trong DB.
- **Hiển thị:** Toggle **VN** (`Asia/Ho_Chi_Minh`) / **UTC** trên client; không đổi dữ liệu gốc, chỉ đổi cách format.
- Trạng thái **Sắp diễn / Đang công bố / Đã xong** tính từ so sánh `timeUtc` với **giờ hiện tại** trình duyệt (cập nhật ~30s), cửa sổ “live” ~**90 phút** sau giờ sự kiện.

## Tiêu chí chấp nhận

- [ ] Có `FMP_API_KEY` → sau sync lần đầu, bảng có sự kiện thật (khoảng ngày theo API).
- [ ] Không có key → cảnh báo + dữ liệu mẫu.
- [ ] Toggle VN/UTC không làm mất scroll / không crash; chuyển zone dùng `startTransition` để giảm giật.
- [ ] Cột trạng thái phản ánh thời gian thực (upcoming / live / finished).

## Staging & CI (P1)

- **CI:** GitHub Actions chạy `npm ci` → `npm run lint` → `prisma migrate deploy` → `next build` với PostgreSQL service.
- **Staging:** Dùng `DATABASE_URL` riêng (Neon branch / Postgres), copy `.env.example` → `.env.staging`, set `FMP_API_KEY` và secrets Auth; deploy preview (Vercel/GitHub) trỏ DB staging.

---

# Spec — Signal: upload ảnh (chart / setup)

## Mục tiêu

Là **trader đăng signal**, tôi muốn **đính kèm một hoặc vài ảnh** (screenshot chart, setup) cùng tín hiệu để người xem hiểu ngữ cảnh nhanh hơn chỉ bằng số entry/SL/TP.

## Phạm vi (MVP đề xuất)

- **Có:** Upload khi **tạo signal** (form `/signals`); hiển thị thumbnail + lightbox/xem lớn trên **danh sách** và **trang chi tiết** `/signals/[id]`.
- **Số lượng:** Tối đa **3 ảnh** / signal (tránh abuse & chi phí lưu trữ).
- **Định dạng:** `image/jpeg`, `image/png`, `image/webp` (từ chối SVG upload trực tiếp — rủi ro XSS nếu serve sai).
- **Kích thước:** Tối đa **~2 MB** / file (có thể resize phía client trước khi gửi).
- **Quyền xem:** Giữ **cùng quy tắc VIP** như signal: nếu signal VIP và user không VIP → **không hiển thị ảnh** (hoặc placeholder “VIP”), tránh lộ setup qua ảnh.

## Ngoài phạm vi (có thể P2)

- Sửa/xóa ảnh sau khi đăng (chỉ author hoặc MOD).
- OCR / auto-detect giá từ ảnh.
- Video / GIF động.

## Dữ liệu

- **Ưu tiên:** Bảng con `SignalImage` — `id`, `signalId`, `url` (public URL object storage), `sortOrder`, `createdAt`. Không lưu binary trong Postgres.
- **Lưu trữ:** Object storage có CDN (Vercel Blob, S3 + CloudFront, Cloudinary, Uploadthing). Biến môi trường: token/key bucket; URL public chỉ đọc.

## Luồng kỹ thuật (gợi ý)

1. Client chọn file → validate type/size → (optional) resize Web API.
2. **Presigned URL** hoặc API route nhận `multipart` → upload lên storage → trả `url`.
3. `createSignal` nhận thêm danh sách `imageUrls[]` (hoặc `imageIds[]`) đã upload; transaction tạo `Signal` + `SignalImage`.

## Bảo mật & kiểm duyệt

- Chỉ user đã đăng nhập; rate limit theo user (đã có pattern trên signal).
- MOD/ADMIN: có thể ẩn signal (đã có) — ảnh đi theo; cân nhắc xóa object khi signal bị xóa (lifecycle hook hoặc cron).

## Tiêu chí chấp nhận

- [ ] Đăng signal kèm 0–3 ảnh thành công; ảnh hiện đúng trên list + detail.
- [ ] Signal VIP + viewer không VIP: không thấy nội dung ảnh thật (placeholder).
- [ ] Từ chối file quá lớn / sai MIME; thông báo rõ ràng (i18n).
- [ ] Build & typecheck pass; không lộ secret storage ra client.

## Rủi ro

- **Chi phí** storage/băng thông nếu traffic lớn — cần giới hạn số file & dung lượng.
- **Nội dung vi phạm** trên ảnh — giữ báo cáo signal (mở rộng sau) hoặc dựa vào moderation hiện có.
