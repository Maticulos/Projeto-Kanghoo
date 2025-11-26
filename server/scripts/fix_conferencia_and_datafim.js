require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Conectando ao banco...');
    await db.query('SELECT 1');
    console.log('✅ Conexão OK');

    console.log('🔧 Adicionando coluna tipo_conferencia em conferencia_criancas (se não existir)...');
    await db.query("ALTER TABLE conferencia_criancas ADD COLUMN IF NOT EXISTS tipo_conferencia VARCHAR(50)");
    console.log('✅ tipo_conferencia adicionada (ou já existia)');

    console.log('🔧 Adicionando coluna responsavel_conferencia_id em conferencia_criancas (se não existir)...');
    await db.query("ALTER TABLE conferencia_criancas ADD COLUMN IF NOT EXISTS responsavel_conferencia_id INTEGER");
    console.log('✅ responsavel_conferencia_id adicionada (ou já existia)');

    try {
      console.log('🔐 Tentando adicionar FK responsavel_conferencia_id -> usuarios(id)...');
      await db.query("ALTER TABLE conferencia_criancas ADD CONSTRAINT fk_conferencia_responsavel FOREIGN KEY (responsavel_conferencia_id) REFERENCES usuarios(id)");
      console.log('✅ FK responsavel_conferencia adicionada');
    } catch (e) {
      console.log('⚠️ FK responsavel_conferencia não adicionada (talvez já exista):', e.message);
    }

    console.log('🔧 Adicionando coluna data_fim em viagens_ativas (se não existir)...');
    await db.query("ALTER TABLE viagens_ativas ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP WITH TIME ZONE");
    console.log('✅ data_fim adicionada (ou já existia)');

    console.log('Concluído');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
