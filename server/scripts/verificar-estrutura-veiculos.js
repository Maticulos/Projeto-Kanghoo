require('dotenv').config();
const db = require('../config/db');

(async () => {
  try {
    // Verificar se a tabela existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'veiculos'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Tabela veiculos NÃO existe');
      process.exit(0);
    }
    
    console.log('✅ Tabela veiculos existe');
    
    // Listar colunas
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'veiculos' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas da tabela veiculos:');
    columns.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type}) ${r.is_nullable === 'YES' ? '[NULL]' : '[NOT NULL]'}`);
    });
    
    // Verificar se tem dados
    const count = await db.query('SELECT COUNT(*) as total FROM veiculos');
    console.log(`\n📊 Total de registros: ${count.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.pool?.end();
    process.exit(0);
  }
})();

