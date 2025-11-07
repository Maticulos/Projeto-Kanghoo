const db = require('./config/db');

async function verificarRotas() {
  try {
    // Verificar estrutura da tabela rotas_escolares
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'rotas_escolares'
      ORDER BY ordinal_position;
    `;
    
    const result = await db.query(query);
    console.log('Estrutura da tabela rotas_escolares:');
    console.table(result.rows);
    
    // Verificar se existem rotas
    const countQuery = 'SELECT COUNT(*) as total FROM rotas_escolares';
    const countResult = await db.query(countQuery);
    console.log(`\nTotal de rotas: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  }
  process.exit(0);
}

verificarRotas();