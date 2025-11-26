require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Conectando ao banco...');
    await db.query('SELECT 1');

    console.log('🔧 Alterando constraint viagens_ativas_status_check para aceitar "concluida" também...');
    try {
      await db.query("ALTER TABLE viagens_ativas DROP CONSTRAINT IF EXISTS viagens_ativas_status_check");
      await db.query("ALTER TABLE viagens_ativas ADD CONSTRAINT viagens_ativas_status_check CHECK (status IN ('iniciada','em_andamento','finalizada','concluida','cancelada'))");
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
