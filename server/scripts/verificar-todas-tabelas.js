require('dotenv').config();
const db = require('../config/db');

(async () => {
  try {
    const tabelas = ['veiculos', 'rotas_escolares', 'pacotes_excursao', 'caracteristicas_veiculos', 'avaliacoes'];
    
    for (const tabela of tabelas) {
      const exists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabela]);
      
      if (exists.rows[0].exists) {
        console.log(`\n✅ Tabela ${tabela} existe`);
        const columns = await db.query(`
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tabela]);
        
        console.log(`   Colunas: ${columns.rows.map(r => r.column_name).join(', ')}`);
      } else {
        console.log(`\n❌ Tabela ${tabela} NÃO existe`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.pool?.end();
    process.exit(0);
  }
})();

