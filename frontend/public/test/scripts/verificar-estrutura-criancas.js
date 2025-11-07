const db = require('./config/db');

async function verificarEstrutura() {
  try {
    // Verificar estrutura da tabela criancas
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'criancas'
      ORDER BY ordinal_position;
    `;
    
    const result = await db.query(query);
    console.log('Estrutura da tabela criancas:');
    console.table(result.rows);
    
    // Verificar se existem crianças
    const countQuery = 'SELECT COUNT(*) as total FROM criancas';
    const countResult = await db.query(countQuery);
    console.log(`\nTotal de crianças: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  }
  process.exit(0);
}

verificarEstrutura();