const db = require('./config/db');

async function verificarPlanos() {
  try {
    // Verificar estrutura da tabela planos_assinatura
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'planos_assinatura'
      ORDER BY ordinal_position;
    `;
    
    const result = await db.query(query);
    console.log('Estrutura da tabela planos_assinatura:');
    console.table(result.rows);
    
    // Verificar se existem planos
    const countQuery = 'SELECT COUNT(*) as total FROM planos_assinatura';
    const countResult = await db.query(countQuery);
    console.log(`\nTotal de planos: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  }
  process.exit(0);
}

verificarPlanos();