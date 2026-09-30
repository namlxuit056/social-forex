#!/usr/bin/env bash
# One-shot move of toolforex.xyz from Vercel to this machine. Order matters:
#   1. pause the Vercel project  → no more writes to Neon, no Vercel crons
#   2. copy Neon → local DB       → nothing written since the last copy is lost
#   3. point DNS at the tunnel    → site served from here
#   4. enable the local cron runner
# Requires: `vercel login` done, `cloudflared tunnel login` + tunnel "social-forex" created.
set -euo pipefail
cd "$(dirname "$0")/../.."

TUNNEL=social-forex
HOSTS=(toolforex.xyz www.toolforex.xyz)

FROM_DNS=0; [[ "${1:-}" == "--from-dns" ]] && FROM_DNS=1

if (( ! FROM_DNS )); then
echo "== 1/4 Tạm dừng project Vercel"
AUTH="$HOME/Library/Application Support/com.vercel.cli/auth.json"
TOKEN="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["token"])' "$AUTH")"
PROJECT="$(python3 -c 'import json;print(json.load(open(".vercel/project.json"))["projectId"])')"
TEAM="$(python3 -c 'import json;print(json.load(open(".vercel/project.json"))["orgId"])')"
code="$(curl -s -o /tmp/sf_pause.json -w '%{http_code}' -X POST -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v1/projects/$PROJECT/pause?teamId=$TEAM")"
if [[ "$code" != 2* ]]; then
  echo "✗ Pause Vercel thất bại (HTTP $code): $(head -c 300 /tmp/sf_pause.json)"
  echo "  → Tự pause ở Vercel dashboard (Project → Settings → General → Pause), rồi chạy: $0 --skip-vercel"
  [[ "${1:-}" == "--skip-vercel" ]] || exit 1
fi
rm -f /tmp/sf_pause.json
echo "  ✓ Vercel đã dừng"

echo "== 2/4 Copy Neon → DB local"
bash scripts/selfhost/pull-neon-db.sh
fi


echo "== 3/4 Trỏ DNS về tunnel"
# --overwrite-dns only replaces CNAMEs; imported A/AAAA records must be deleted in the
# Cloudflare dashboard first, then resume with: npm run selfhost:cutover -- --from-dns
for h in "${HOSTS[@]}"; do cloudflared tunnel route dns --overwrite-dns "$TUNNEL" "$h"; done
pm2 restart sf-tunnel >/dev/null

echo "== 4/4 Bật cron local"
[[ -n "$(tail -c1 .env)" ]] && echo >> .env
sed -i '' '/^SELFHOST_CRON_ENABLED=/d' .env
echo 'SELFHOST_CRON_ENABLED=1' >> .env
pm2 restart sf-cron >/dev/null
pm2 save >/dev/null

echo "== Kiểm tra"
sleep 10
for h in "${HOSTS[@]}"; do
  curl -s -o /dev/null -L -w "  https://$h → %{http_code} (%{time_total}s)\n" "https://$h/" || true
done
pm2 logs sf-cron --nostream --lines 3 | tail -1
echo "✓ Xong. DNS có thể mất vài phút để mọi nơi thấy bản mới."
