require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Testando conexão com o banco...');
    await db.query('SELECT 1');
    console.log('✅ Conexão OK');

    console.log('📋 Adicionando coluna usuario_id em viagens_ativas (se não existir)...');
    await db.query('ALTER TABLE viagens_ativas ADD COLUMN IF NOT EXISTS usuario_id INTEGER');
    console.log('✅ Coluna adicionada (ou já existia)');

    console.log('🔁 Copiando valores de motorista_id para usuario_id quando aplicável...');
    await db.query('UPDATE viagens_ativas SET usuario_id = motorista_id WHERE usuario_id IS NULL AND motorista_id IS NOT NULL');
    console.log('✅ Valores copiados');

    try {
      console.log('🔐 Tentando adicionar constraint FK (usuario_id -> usuarios.id)...');
      await db.query('ALTER TABLE viagens_ativas ADD CONSTRAINT fk_viagens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)');
      console.log('✅ Constraint FK adicionada');
    } catch (fkErr) {
      console.log('⚠️ Constraint FK não adicionada (talvez já exista):', fkErr.message);
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
