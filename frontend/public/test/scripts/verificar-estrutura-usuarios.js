const db = require('./config/db');

async function verificarEstrutura() {
  try {
    // Verificar estrutura da tabela usuarios
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position;
    `;
    
    const result = await db.query(query);
    console.log('Estrutura da tabela usuarios:');
    console.table(result.rows);
    
    // Verificar se existem usuários
    const countQuery = 'SELECT COUNT(*) as total FROM usuarios';
    const countResult = await db.query(countQuery);
    console.log(`\nTotal de usuários: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  }
  process.exit(0);
}

verificarEstrutura();