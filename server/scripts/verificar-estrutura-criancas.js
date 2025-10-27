const db = require('../config/db');

async function verificarEstruturaCriancas() {
  try {
    console.log('🔍 Verificando estrutura da tabela criancas...\n');
    
    const resultado = await db.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'criancas' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura da tabela criancas:');
    console.log('='.repeat(80));
    
    resultado.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✅ NULL' : '❌ NOT NULL';
      const defaultVal = col.column_default ? ` (Default: ${col.column_default})` : '';
      console.log(`${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | ${nullable}${defaultVal}`);
    });
    
    console.log('='.repeat(80));
    console.log(`\n📊 Total de colunas: ${resultado.rows.length}`);
    
    // Verificar dados existentes
    const count = await db.query('SELECT COUNT(*) FROM criancas');
    console.log(`📈 Registros existentes: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  } finally {
    process.exit(0);
  }
}

verificarEstruturaCriancas();