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
   3. Đặt `NEXT_PUBLIC_SITE_URL=https://toolforex.xyz` trong `.env` → `npm run selfhost:deploy`.
5. **Telegram webhook**: gọi lại `/api/telegram/set-webhook` sau khi domain trỏ về máy.
6. **PayPal webhook**: URL giữ nguyên nếu domain giữ nguyên.

## Ghi chú

- `@vercel/analytics` / Speed Insights chỉ render khi `process.env.VERCEL` có — self-host sẽ không có số liệu Vercel Analytics.
- `@vercel/blob` vẫn dùng được ngoài Vercel (chỉ cần `BLOB_READ_WRITE_TOKEN`). TODO: nếu huỷ hẳn tài khoản Vercel thì phải chuyển storage ảnh (S3/R2 hoặc lưu local).
- DB vẫn là Neon (us-east-1) → mỗi query ~200ms từ VN, trang tải chậm. Có thể chuyển sang Postgres local
  (`npm run docker:up`, `pg_dump` từ Neon → `pg_restore` vào local, đổi `DATABASE_URL`) — TODO: quyết định có migrate dữ liệu không.
- Không bind `-H 127.0.0.1`: next-intl rewrite sang `localhost` bị Next coi là external → redirect loop.
