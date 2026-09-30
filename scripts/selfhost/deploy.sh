#!/usr/bin/env bash
# Pull latest main, rebuild, zero-downtime-ish reload. Run from the repo root.
set -euo pipefail
cd "$(dirname "$0")/../.."
git pull --ff-only origin main
npm ci
npm run build
pm2 reload ecosystem.config.cjs --update-env
pm2 save
