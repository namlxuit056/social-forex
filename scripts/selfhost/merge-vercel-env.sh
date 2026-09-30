#!/usr/bin/env bash
# Pull Production env vars from Vercel and merge them into .env (Vercel wins),
# except the keys that must stay machine-local. Backs up .env first, then rebuilds
# (NEXT_PUBLIC_* are inlined at build time) and reloads pm2.
set -euo pipefail
cd "$(dirname "$0")/../.."

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
npx -y vercel@latest env pull "$TMP" --environment=production --yes >/dev/null

cp .env ".env.bak.$(date +%Y%m%d%H%M%S)"
python3 - "$TMP" <<'EOF'
import re, sys

KEEP_LOCAL = {"DATABASE_URL", "NEON_DATABASE_URL", "SELFHOST_CRON_ENABLED", "SELFHOST_CRON_BASE_URL"}
SKIP_PREFIX = ("VERCEL", "NX_", "TURBO_")

def parse(path):
    out = {}
    for line in open(path):
        m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line.rstrip("\n"))
        if m:
            out[m.group(1)] = m.group(2)
    return out

remote = parse(sys.argv[1])
lines = open(".env").read().splitlines()
local = parse(".env")
added, changed, skipped_empty = [], [], []

for k, v in remote.items():
    if k in KEEP_LOCAL or k.startswith(SKIP_PREFIX):
        continue
    # "Sensitive" vars come back empty or as the literal "[SENSITIVE]" — keep whatever is local.
    if v in ('""', "") or "[SENSITIVE]" in v:
        skipped_empty.append(k)
        continue
    if k not in local:
        lines.append(f"{k}={v}")
        added.append(k)
    elif local[k] != v:
        lines = [f"{k}={v}" if re.match(rf"^{k}=", l) else l for l in lines]
        changed.append(k)

open(".env", "w").write("\n".join(lines) + "\n")
print("  thêm mới :", ", ".join(added) or "—")
print("  cập nhật :", ", ".join(changed) or "—")
if skipped_empty:
    print("  ⚠ Vercel không trả giá trị (biến Sensitive) — cần tự điền nếu thiếu:", ", ".join(skipped_empty))
EOF

echo "→ Build lại + reload"
npm run build >/dev/null
for app in sf-web sf-cron; do pm2 reload "$app" --update-env >/dev/null; done
pm2 save >/dev/null
echo "✓ Xong. Kiểm tra: pm2 logs sf-cron"
