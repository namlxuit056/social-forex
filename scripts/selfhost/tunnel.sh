#!/usr/bin/env bash
# Exposes 127.0.0.1:3000 to the internet via Cloudflare Tunnel (no port forwarding,
# HTTPS terminated at Cloudflare). See docs/self-hosting.md.
set -euo pipefail
CF="$(command -v cloudflared || echo /opt/homebrew/bin/cloudflared)"
if [[ -f "$HOME/.cloudflared/config.yml" ]]; then
  exec "$CF" tunnel --no-autoupdate run
fi
echo "[tunnel] no ~/.cloudflared/config.yml — starting temporary quick tunnel"
exec "$CF" tunnel --no-autoupdate --url http://127.0.0.1:3000
