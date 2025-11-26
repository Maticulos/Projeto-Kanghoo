require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔍 Verificando coluna usuario_id em viagens_ativas...');

    // Listar todas as colunas da tabela
    const allCols = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'viagens_ativas'
      ORDER BY ordinal_position
    `);

    console.log('📋 Colunas encontradas em viagens_ativas:');
    for (const r of allCols.rows) {
      console.log(` - ${r.column_name} : ${r.data_type}`);
    }

    const countRes = await db.query(`SELECT COUNT(*)::int as total, COUNT(usuario_id)::int as usuario_id_not_null, COUNT(veiculo_id)::int as veiculo_id_not_null FROM viagens_ativas`);
    console.log('📊 Contagens na tabela viagens_ativas:', countRes.rows[0]);

    const sample = await db.query(`SELECT * FROM viagens_ativas ORDER BY id DESC LIMIT 5`);
    console.log('🔎 Exemplos (últimas 5 linhas):');
    console.table(sample.rows);

  } catch (err) {
    console.error('Erro na verificação:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
