#!/usr/bin/env bash
# Healthcheck simples para uso em CI/monitoramento
set -euo pipefail

URL=${1:-http://localhost:5000/api/health}

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$STATUS" = "200" ]; then
  echo "SERVIÇO SAUDÁVEL: $URL -> $STATUS"
  exit 0
else
  echo "ERRO: $URL -> $STATUS"
  exit 2
fi
