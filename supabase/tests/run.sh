#!/usr/bin/env bash
# فحص ملفات الهجرة على Postgres محلي داخل Docker — لا يمس مشروع Supabase الحقيقي.
# Verifies the migrations against a throwaway Postgres container.
#
#   bash supabase/tests/run.sh
set -euo pipefail

# Git Bash rewrites /tmp/... into a Windows path before Docker sees it, which
# breaks container-side arguments. Disable that, then convert host paths back
# with cygpath (absent on Linux/macOS, where the paths are already correct).
export MSYS_NO_PATHCONV=1
hostpath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}

CONTAINER=mi-migration-test
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "→ starting postgres:17-alpine"
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=test -e POSTGRES_DB=app postgres:17-alpine >/dev/null

for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres -d app >/dev/null 2>&1 && break
  sleep 1
done

copy_in() { docker cp "$(hostpath "$1")" "$CONTAINER:/tmp/"; }

copy_in "$ROOT/supabase/tests/00_stubs.sql"
copy_in "$ROOT/supabase/seed.sql"
copy_in "$ROOT/supabase/tests/01_logic.sql"
copy_in "$ROOT/supabase/tests/02_rls.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do copy_in "$f"; done

run() { docker exec "$CONTAINER" psql -U postgres -d app -v ON_ERROR_STOP=1 -q -f "/tmp/$1"; }

echo "→ applying stubs + migrations"
run 00_stubs.sql
for f in "$ROOT"/supabase/migrations/*.sql; do run "$(basename "$f")"; done

echo "→ logic checks"
docker exec "$CONTAINER" psql -U postgres -d app -f /tmp/01_logic.sql

echo "→ RLS checks"
docker exec "$CONTAINER" psql -U postgres -d app -f /tmp/02_rls.sql

echo "✓ done — every 'pass' column should read t, and every NOTICE should end in t"
