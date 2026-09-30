#!/usr/bin/env bash
# Copy the Neon database into the local Docker Postgres and point .env at it.
# Re-runnable: each run REPLACES the local DB with a fresh snapshot of Neon.
#
#   bash scripts/selfhost/pull-neon-db.sh            # dump + restore + switch .env
#   bash scripts/selfhost/pull-neon-db.sh --no-switch  # dump + restore only
#
# Neon URL is read from NEON_DATABASE_URL, else from DATABASE_URL if it points at neon.tech.
set -euo pipefail
cd "$(dirname "$0")/../.."

LOCAL_URL="postgresql://postgres:postgres@localhost:5432/socialforex"
SWITCH=1; [[ "${1:-}" == "--no-switch" ]] && SWITCH=0

getenv() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
NEON="$(getenv NEON_DATABASE_URL || true)"
if [[ -z "$NEON" ]]; then
  CUR="$(getenv DATABASE_URL || true)"
  [[ "$CUR" == *neon.tech* ]] && NEON="$CUR"
fi
[[ -z "$NEON" ]] && { echo "✗ Không tìm thấy URL Neon (NEON_DATABASE_URL / DATABASE_URL)"; exit 1; }

echo "→ Kiểm tra version Neon…"
MAJOR="$(docker run --rm postgres:17-alpine psql "$NEON" -Atc 'show server_version_num' | cut -c1-2)"
echo "  Neon = Postgres $MAJOR"
(( MAJOR > 17 )) && { echo "✗ Neon > 17: đổi image trong docker-compose.yml thành postgres:${MAJOR}-alpine rồi chạy lại"; exit 1; }

echo "→ Khởi động Postgres local…"
docker compose --env-file /dev/null up -d postgres
CID="$(docker compose --env-file /dev/null ps -q postgres)"
until docker exec "$CID" pg_isready -U postgres -q; do sleep 1; done

DUMP="$(mktemp -d)/neon.dump"
echo "→ pg_dump từ Neon → $DUMP"
docker run --rm -v "$(dirname "$DUMP")":/out postgres:17-alpine \
  pg_dump "$NEON" --format=custom --no-owner --no-acl --file=/out/neon.dump
ls -lh "$DUMP" | awk '{print "  size:", $5}'

echo "→ Reset DB local + restore…"
docker exec "$CID" psql -U postgres -q -c "DROP DATABASE IF EXISTS socialforex WITH (FORCE)" -c "CREATE DATABASE socialforex"
docker cp "$DUMP" "$CID":/tmp/neon.dump
# Neon-only extensions/comments may error harmlessly; data restore is checked below.
docker exec "$CID" pg_restore -U postgres -d socialforex --no-owner --no-acl /tmp/neon.dump || true
docker exec "$CID" rm /tmp/neon.dump
rm -rf "$(dirname "$DUMP")"

echo "→ So sánh số dòng vài bảng chính (Neon vs local):"
for t in '"User"' '"Signal"' '"Notification"' '"_prisma_migrations"'; do
  a="$(docker run --rm postgres:17-alpine psql "$NEON" -Atc "select count(*) from $t" 2>/dev/null || echo '?')"
  b="$(docker exec "$CID" psql -U postgres -d socialforex -Atc "select count(*) from $t" 2>/dev/null || echo '?')"
  printf "  %-22s neon=%-8s local=%s\n" "$t" "$a" "$b"
done

if (( SWITCH )); then
  echo "→ Chuyển .env sang DB local (giữ URL Neon ở NEON_DATABASE_URL)…"
  cp .env ".env.bak.$(date +%Y%m%d%H%M%S)"
  # Appending to a file without a trailing newline would glue onto the last variable.
  [[ -n "$(tail -c1 .env)" ]] && echo >> .env
  grep -q '^NEON_DATABASE_URL=' .env || echo "NEON_DATABASE_URL=\"$NEON\"" >> .env
  sed -i '' '/^DATABASE_URL=/d' .env
  echo "DATABASE_URL=\"$LOCAL_URL\"" >> .env
  npx prisma migrate deploy
  if command -v pm2 >/dev/null && pm2 describe sf-web >/dev/null 2>&1; then
    for app in sf-web sf-cron; do pm2 reload "$app" --update-env; done
  fi
fi
echo "✓ Xong."
