/**
 * Script para executar a migração do sistema de conferência (versão granular)
 */

require('dotenv').config();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function executarComando(comando, descricao) {
  try {
    await db.query(comando);
    console.log(`✅ ${descricao}`);
    return true;
  } catch (error) {
    console.error(`❌ ${descricao}: ${error.message}`);
    return false;
  }
}

async function executarMigracao() {
  console.log('🔄 Executando migração do sistema de conferência (granular)...\n');
  
  // 1. viagens_ativas
  console.log('📋 Criando tabela viagens_ativas...');
  await executarComando(`
    CREATE TABLE IF NOT EXISTS viagens_ativas (
      id SERIAL PRIMARY KEY,
      rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
      motorista_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo_viagem VARCHAR(10) NOT NULL CHECK (tipo_viagem IN ('ida', 'volta')),
      data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
      horario_inicio TIMESTAMP WITH TIME ZONE,
      horario_fim TIMESTAMP WITH TIME ZONE,
      status VARCHAR(20) DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'em_andamento', 'finalizada', 'cancelada')),
      quilometragem_inicial DECIMAL(10, 2),
      quilometragem_final DECIMAL(10, 2),
      quilometragem_total DECIMAL(10, 2),
      combustivel_gasto DECIMAL(8, 2),
      tempo_total_minutos INTEGER,
      total_criancas_esperadas INTEGER DEFAULT 0,
      total_criancas_embarcadas INTEGER DEFAULT 0,
      total_criancas_desembarcadas INTEGER DEFAULT 0,
      observacoes TEXT,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `, 'Tabela viagens_ativas criada');
  
  await executarComando('CREATE INDEX IF NOT EXISTS idx_viagens_rota ON viagens_ativas(rota_id)', 'Índice idx_viagens_rota');
  await executarComando('CREATE INDEX IF NOT EXISTS idx_viagens_motorista ON viagens_ativas(motorista_id)', 'Índice idx_viagens_motorista');
  await executarComando('CREATE INDEX IF NOT EXISTS idx_viagens_status ON viagens_ativas(status)', 'Índice idx_viagens_status');
  
  // 2. conferencia_criancas
  console.log('\n📋 Criando tabela conferencia_criancas...');
  await executarComando(`
    CREATE TABLE IF NOT EXISTS conferencia_criancas (
      id SERIAL PRIMARY KEY,
      viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
      crianca_id INTEGER NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
      tipo_evento VARCHAR(15) NOT NULL CHECK (tipo_evento IN ('embarque', 'desembarque')),
      horario_previsto TIMESTAMP WITH TIME ZONE,
      horario_real TIMESTAMP WITH TIME ZONE,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      endereco TEXT,
      confirmado BOOLEAN DEFAULT false,
      observacoes TEXT,
      notificacao_enviada BOOLEAN DEFAULT false,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `, 'Tabela conferencia_criancas criada');
  
  await executarComando('CREATE INDEX IF NOT EXISTS idx_conferencia_viagem ON conferencia_criancas(viagem_id)', 'Índice idx_conferencia_viagem');
  await executarComando('CREATE INDEX IF NOT EXISTS idx_conferencia_crianca ON conferencia_criancas(crianca_id)', 'Índice idx_conferencia_crianca');
  
  // 3. rastreamento_gps
  console.log('\n📋 Criando tabela rastreamento_gps...');
  await executarComando(`
    CREATE TABLE IF NOT EXISTS rastreamento_gps (
      id SERIAL PRIMARY KEY,
      viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      velocidade DECIMAL(5, 2),
      direcao INTEGER,
      precisao DECIMAL(8, 2),
      altitude DECIMAL(8, 2),
      timestamp_gps TIMESTAMP WITH TIME ZONE NOT NULL,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `, 'Tabela rastreamento_gps criada');
  
  await executarComando('CREATE INDEX IF NOT EXISTS idx_gps_viagem ON rastreamento_gps(viagem_id)', 'Índice idx_gps_viagem');
  await executarComando('CREATE INDEX IF NOT EXISTS idx_gps_timestamp ON rastreamento_gps(timestamp_gps)', 'Índice idx_gps_timestamp');
  
  // 4. paradas_rota
  console.log('\n📋 Criando tabela paradas_rota...');
  await executarComando(`
    CREATE TABLE IF NOT EXISTS paradas_rota (
      id SERIAL PRIMARY KEY,
      rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
      ordem_parada INTEGER NOT NULL,
      endereco TEXT NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      horario_previsto TIME,
      raio_deteccao INTEGER DEFAULT 50,
      tipo_parada VARCHAR(15) CHECK (tipo_parada IN ('embarque', 'desembarque', 'escola')),
      ativo BOOLEAN DEFAULT true,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(rota_id, ordem_parada)
    )
  `, 'Tabela paradas_rota criada');
  
  await executarComando('CREATE INDEX IF NOT EXISTS idx_paradas_rota ON paradas_rota(rota_id)', 'Índice idx_paradas_rota');
  
  // 5. Funções e triggers
  console.log('\n📋 Criando funções e triggers...');
  await executarComando(`
    CREATE OR REPLACE FUNCTION atualizar_timestamp_atualizacao()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.atualizado_em = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `, 'Função atualizar_timestamp_atualizacao criada');
  
  // Verificar tabelas
  console.log('\n📊 Verificando tabelas criadas...\n');
  const tabelas = ['viagens_ativas', 'conferencia_criancas', 'rastreamento_gps', 'paradas_rota'];
  
  for (const tabela of tabelas) {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tabela]);
    
    if (result.rows[0].exists) {
      const count = await db.query(`SELECT COUNT(*) as total FROM ${tabela}`);
      console.log(`✅ ${tabela}: Existe (${count.rows[0].total} registros)`);
    } else {
      console.log(`❌ ${tabela}: Não existe`);
    }
  }
  
  console.log('\n✅ Processo concluído!');
}

async function main() {
  try {
    await executarMigracao();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();

