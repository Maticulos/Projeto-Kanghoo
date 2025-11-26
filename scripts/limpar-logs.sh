#!/usr/bin/env bash
# Remove ou compacta logs antigos (mais de X dias)
set -euo pipefail
DAYS=${1:-30}
LOG_DIR="$(dirname "$0")/../logs"

if [ ! -d "$LOG_DIR" ]; then
  echo "Diretório de logs não existe: $LOG_DIR"
  exit 0
fi

echo "Limpando arquivos de log com mais de $DAYS dias em $LOG_DIR"
find "$LOG_DIR" -type f -mtime +$DAYS -print -exec gzip -9 {} \;

echo "Arquivos antigos compactados."