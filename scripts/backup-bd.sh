#!/usr/bin/env bash
# Faz dump do banco Postgres para backups/ com timestamp
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

# Espera variáveis de ambiente: DATABASE_URL ou DB_HOST, DB_NAME, DB_USER
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Usando DATABASE_URL para dump..."
  pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_DIR/kanghoo_backup_$TIMESTAMP.dump"
else
  PGHOST=${DB_HOST:-localhost}
  PGPORT=${DB_PORT:-5432}
  PGUSER=${DB_USER:-postgres}
  PGPASSWORD=${DB_PASSWORD:-}
  export PGPASSWORD
  DBNAME=${DB_NAME:-kanghoo_db}
  pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -Fc -f "$BACKUP_DIR/kanghoo_backup_$TIMESTAMP.dump" "$DBNAME"
fi

echo "Backup criado: $BACKUP_DIR/kanghoo_backup_$TIMESTAMP.dump"