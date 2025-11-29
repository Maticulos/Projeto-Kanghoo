#!/bin/bash
# Script para executar migração e seed de dados de teste

echo "=========================================="
echo "MIGRAÇÃO E SEED: Dados para Mapa Interativo"
echo "=========================================="

# Verificar se psql está disponível
if ! command -v psql &> /dev/null; then
    echo "❌ psql não encontrado. Por favor, instale o PostgreSQL client."
    exit 1
fi

# Carregar variáveis de ambiente
if [ -f ../server/.env ]; then
    export $(cat ../server/.env | grep -v '^#' | xargs)
fi

# Executar migração
echo ""
echo "📋 Executando migração de coordenadas..."
psql "$DATABASE_URL" -f migracao_coordenadas_mapa.sql

if [ $? -eq 0 ]; then
    echo "✅ Migração concluída com sucesso!"
else
    echo "❌ Erro na migração"
    exit 1
fi

# Executar seed
echo ""
echo "🌱 Inserindo dados de teste..."
psql "$DATABASE_URL" -f seed_dados_teste_mapa.sql

if [ $? -eq 0 ]; then
    echo "✅ Dados de teste inseridos com sucesso!"
else
    echo "❌ Erro ao inserir dados de teste"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Processo concluído!"
echo "=========================================="

