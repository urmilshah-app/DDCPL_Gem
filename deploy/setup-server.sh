#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup-server.sh — one-shot server bootstrap (run ON the VPS as root/ubuntu)
# Usage:  bash setup-server.sh <path-to-gem-monitor.zip> <domain> [<db-password>]
# Example: bash setup-server.sh ~/gem-monitor.zip mygem.duckdns.org 'Str0ng-Db-Pass'
# ---------------------------------------------------------------------------

set -euo pipefail

ARCHIVE="${1:?usage: setup-server.sh <gem-monitor.zip> <domain> [db-password]}"
DOMAIN="${2:?usage: setup-server.sh <gem-monitor.zip> <domain> [db-password]}"
DB_PASS="${3:-gem}"
APP_DIR="$HOME/gem-monitor"

echo "==> Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi
if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y docker-compose-plugin
fi

echo "==> Extracting app to $APP_DIR"
command -v unzip >/dev/null 2>&1 || sudo apt-get install -y unzip
mkdir -p "$APP_DIR"
unzip -oq "$ARCHIVE" -d "$APP_DIR"
cd "$APP_DIR"

echo "==> Writing .env"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
CRON_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
cat > .env <<EOF
# Generated $(date -u +%FT%TZ) by setup-server.sh
DATABASE_URL=postgresql://gem:${DB_PASS}@postgres:5432/gem_website?schema=public
POSTGRES_PASSWORD=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
CRON_SECRET=${CRON_SECRET}
AUTH_COOKIE_SECURE=true
DOMAIN=${DOMAIN}
SOURCE_DEMO_MODE=false
NEXT_TELEMETRY_DISABLED=1
EOF
chmod 600 .env

echo "==> Building & starting stack (app + postgres + redis + worker + caddy)"
docker compose --profile with-worker --profile https up -d --build

echo "==> Waiting for Postgres"
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U gem -d gem_website >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "==> Verifying"
sleep 5
docker compose ps
echo
echo "If the database was not restored yet, run deploy/Restore-Database.ps1 from your PC (DEPLOY.md step 5)."
echo "Site: https://${DOMAIN}  (certificate issues normally resolve within ~1 min)"
