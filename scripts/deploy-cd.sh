#!/usr/bin/env bash
# Script de deploy simples para CI/CD: roda testes, build e sobe stack de produção
set -euo pipefail

echo "1) Rodando testes unitários"
cd "$(dirname "$0")/../server"
npm test

echo "2) Build de assets (se aplicável)"
npm run build || true

echo "3) Subindo containers de produção"
cd "$(dirname "$0")/.."
docker-compose -f docker-compose.prod.yml up -d --build

echo "Deploy executado (verifique logs e migrations)."