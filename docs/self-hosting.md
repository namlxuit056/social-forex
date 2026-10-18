# Self-hosting trên máy Mac (thay Vercel)

Stack chạy bằng **pm2** (`ecosystem.config.cjs`):

| Process    | Việc                                                                 |
|------------|----------------------------------------------------------------------|
| `sf-web`   | `next start -p 3000` (bản build production)                           |
| `sf-cron`  | `scripts/selfhost/cron-runner.mjs` — thay Vercel Cron, đọc lịch từ `vercel.json` (UTC) |
| `sf-tunnel`| Cloudflare Tunnel → public HTTPS, không cần mở port router            |
| `sf-awake` | `caffeinate -i -s` — chặn Mac idle-sleep                              |

## Lệnh hằng ngày

```bash
npm run selfhost:deploy     # git pull + npm ci + build + pm2 reload
pm2 ls                      # trạng thái
pm2 logs sf-web             # log app  (sf-cron / sf-tunnel tương tự)
npm run selfhost:cron -- list                          # xem lịch cron
npm run selfhost:cron -- run /api/calendar/sync/run    # chạy tay 1 job
```

## Cài đặt 1 lần (cần bạn tự làm)

1. **Tự khởi động khi bật máy**: `pm2 startup` → copy lệnh `sudo ...` nó in ra và chạy.
2. **Không cho máy ngủ** (kể cả khi chạy pin / màn hình tắt):
   `sudo pmset -a sleep 0 disksleep 0 && sudo pmset -a autorestart 1` (tự bật lại sau mất điện).
   MacBook: gập nắp vẫn sẽ ngủ trừ khi cắm màn hình ngoài — để mở nắp.
3. **Domain `toolforex.xyz`** (hiện DNS đang ở Vercel):
   1. Tạo tài khoản Cloudflare (free) → *Add site* `toolforex.xyz` → đổi nameserver ở nhà đăng ký domain sang 2 NS Cloudflare đưa.
   2. `cloudflared tunnel login`
   3. `cloudflared tunnel create social-forex`
   4. `cloudflared tunnel route dns social-forex toolforex.xyz` và `... www.toolforex.xyz`
   5. Tạo `~/.cloudflared/config.yml`:
      ```yaml
      tunnel: social-forex
      credentials-file: /Users/<you>/.cloudflared/<TUNNEL_ID>.json
      ingress:
        - hostname: toolforex.xyz
          service: http://localhost:3000
        - hostname: www.toolforex.xyz
          service: http://localhost:3000
        - service: http_status:404
      ```
   6. `pm2 restart sf-tunnel` — script tự dùng named tunnel khi có `config.yml`
      (khi chưa có thì chạy quick tunnel `*.trycloudflare.com`, URL đổi mỗi lần restart).
4. **Cutover cron** (tránh chạy trùng → đăng signal 2 lần):
   1. Tắt/xoá project trên Vercel (hoặc xoá mảng `crons` ở Vercel dashboard).
   2. Thêm `SELFHOST_CRON_ENABLED=1` vào `.env` → `pm2 restart sf-cron`.
   3. Đặt `NEXT_PUBLIC_SITE_URL=https://toolforex.xyz` trong `.env` → `npm run selfhost:deploy`. pm2 (`ecosystem.config.cjs`) dùng giá trị này làm `AUTH_URL` cho Auth.js — thiếu nó thì đăng xuất/đăng nhập sẽ redirect về `localhost:3000`.
5. **Telegram webhook**: gọi lại `/api/telegram/set-webhook` sau khi domain trỏ về máy.
6. **PayPal webhook**: URL giữ nguyên nếu domain giữ nguyên.

## Ghi chú

- `@vercel/analytics` / Speed Insights chỉ render khi `process.env.VERCEL` có — self-host sẽ không có số liệu Vercel Analytics.
- `@vercel/blob` vẫn dùng được ngoài Vercel (chỉ cần `BLOB_READ_WRITE_TOKEN`). TODO: nếu huỷ hẳn tài khoản Vercel thì phải chuyển storage ảnh (S3/R2 hoặc lưu local).
- **Chuyển DB Neon → Postgres local**: `npm run selfhost:pull-db`
  (dump Neon bằng pg_dump 17 trong Docker → restore vào container `postgres:17-alpine` →
  đổi `DATABASE_URL` sang local, giữ URL Neon ở `NEON_DATABASE_URL`, backup `.env.bak.*`, reload pm2).
  Chạy lại lúc nào cũng được — mỗi lần là snapshot mới, **ghi đè** DB local.
  Chạy lần cuối ngay lúc tắt Vercel để không mất dữ liệu ghi vào Neon trong lúc chuyển.
  Quay lại Neon: đổi `DATABASE_URL` về giá trị `NEON_DATABASE_URL` → `pm2 reload sf-web sf-cron --update-env`.
- Migration history không dựng được DB trống từ đầu (TODO: một migration tham chiếu `TradeJournal` trước khi tạo) —
  DB local luôn phải được tạo bằng restore từ dump, không bằng `migrate deploy` trên DB rỗng.
- `docker compose` phải chạy với `--env-file /dev/null` (dòng 48 của `.env` không parse được theo cú pháp compose).
- Không bind `-H 127.0.0.1`: next-intl rewrite sang `localhost` bị Next coi là external → redirect loop.
