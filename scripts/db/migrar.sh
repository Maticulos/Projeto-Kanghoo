#!/usr/bin/env bash
# Executa migrations usando knex (chamado a partir do diretório repo/teste)
set -euo pipefail

echo "Executando migrations (knex)..."
cd "$(dirname "$0")/../../server"

# Use npx para garantir execução da versão local
npx knex migrate:latest --knexfile ./knexfile.js

echo "Migrations aplicadas com sucesso."
