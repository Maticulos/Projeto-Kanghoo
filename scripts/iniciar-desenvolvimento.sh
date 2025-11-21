#!/usr/bin/env bash
# Inicia a aplicação em modo desenvolvimento (Linux/macOS)
# Uso: ./iniciar-desenvolvimento.sh
set -euo pipefail

# Variáveis padrão — ajuste conforme necessário
export NODE_ENV=${NODE_ENV:-development}
export DEMO_MODE=${DEMO_MODE:-true}
export CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:3000}

echo "Iniciando aplicação em modo desenvolvimento..."
cd "$(dirname "$0")/../server"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
  echo "Instalando dependências..."
  npm ci
fi

# Rodar em watch
node --watch server.js
