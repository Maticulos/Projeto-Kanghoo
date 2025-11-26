#!/usr/bin/env bash
# Executa seeds (rodar seeders ou script de seeds personalizado)
set -euo pipefail

cd "$(dirname "$0")/../../database"

if [ -f "run-seed.js" ]; then
  echo "Executando run-seed.js"
  node run-seed.js
else
  echo "Nenhum script de seed encontrado em ./database. Verifique o repositório."
  exit 1
fi

echo "Seeds aplicados."