const db = require('../config/db');

async function verificarOrdemColunas() {
  try {
    const resultado = await db.query(`
      SELECT column_name, ordinal_position 
      FROM information_schema.columns 
      WHERE table_name = 'criancas' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Ordem das colunas na tabela criancas:');
    console.log('='.repeat(50));
    
    resultado.rows.forEach((col, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${col.column_name}`);
    });
    
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    process.exit(0);
  }
}

verificarOrdemColunas();