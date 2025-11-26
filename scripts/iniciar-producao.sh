#!/usr/bin/env bash
# Inicia a stack de produção via docker-compose
# Uso: ./iniciar-producao.sh
set -euo pipefail

COMPOSE_PROD_FILE="$(dirname "$0")/../docker-compose.prod.yml"
if [ ! -f "$COMPOSE_PROD_FILE" ]; then
  echo "Arquivo docker-compose.prod.yml não encontrado em: $COMPOSE_PROD_FILE"
  exit 1
fi

echo "Subindo stack de produção (build + detach)..."
docker-compose -f "$COMPOSE_PROD_FILE" up -d --build

echo "Stack de produção iniciada. Verifique containers com: docker ps" 
