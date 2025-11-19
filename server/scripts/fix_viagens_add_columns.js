require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Testando conexão com o banco...');
    await db.query('SELECT 1');
    console.log('✅ Conexão OK');

    console.log('📋 Adicionando coluna veiculo_id em viagens_ativas (se não existir)...');
    await db.query("ALTER TABLE viagens_ativas ADD COLUMN IF NOT EXISTS veiculo_id INTEGER");
    console.log('✅ veiculo_id adicionada (ou já existia)');

    console.log('📋 Adicionando colunas de odometro e distancia (se não existirem)...');
    await db.query("ALTER TABLE viagens_ativas ADD COLUMN IF NOT EXISTS odometro_inicial NUMERIC(12,2)");
    await db.query("ALTER TABLE viagens_ativas ADD COLUMN IF NOT EXISTS odometro_final NUMERIC(12,2)");
    await db.query("ALTER TABLE viagens_ativas ADD COLUMN IF NOT EXISTS distancia_percorrida_km NUMERIC(12,3)");
    console.log('✅ Colunas de odometro e distancia adicionadas (ou já existiam)');

    try {
      console.log('🔐 Tentando adicionar constraint FK (veiculo_id -> veiculos.id)...');
      await db.query("ALTER TABLE viagens_ativas ADD CONSTRAINT fk_viagens_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)");
      console.log('✅ Constraint FK veiculo adicionada');
    } catch (fkErr) {
      console.log('⚠️ Constraint FK veiculo não adicionada (talvez já exista ou tabela veiculos ausente):', fkErr.message);
    }

    // Opcional: garantir status default
    try {
      await db.query("ALTER TABLE viagens_ativas ALTER COLUMN status SET DEFAULT 'em_andamento'");
    } catch (e) {
      // ignore if column missing or default already set
    }

    console.log('Concluído');
  } catch (err) {
    console.error('❌ Erro ao ajustar schema:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    if (db.pool) {
      await db.pool.end();
    }
  }
}

main();
