require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Conectando ao banco...');
    await db.query('SELECT 1');

    console.log('🔧 Alterando constraint conferencia_criancas_tipo_evento_check para aceitar variações como "embarque_ida"...');
    try {
      await db.query("ALTER TABLE conferencia_criancas DROP CONSTRAINT IF EXISTS conferencia_criancas_tipo_evento_check");
      await db.query("ALTER TABLE conferencia_criancas ADD CONSTRAINT conferencia_criancas_tipo_evento_check CHECK (tipo_evento ~ '^(embarque|desembarque)')");
      console.log('✅ Constraint atualizada com sucesso');
    } catch (e) {
      console.error('Erro ao alterar constraint:', e.message);
    }

  } catch (err) {
    console.error('Erro geral:', err.message);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
