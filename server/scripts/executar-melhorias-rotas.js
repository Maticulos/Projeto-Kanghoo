const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function executarMelhorias() {
  try {
    console.log('🔄 Iniciando execução das melhorias do banco de dados...');
    
    const sqlScript = fs.readFileSync(
      path.join(__dirname, '..', '..', 'database', 'rotas_escolares_melhorias.sql'), 
      'utf8'
    );
    
    await db.query(sqlScript);
    
    console.log('✅ Melhorias do banco de dados executadas com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('planos_assinatura', 'criancas_rotas', 'veiculos')
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas criadas/atualizadas:');
    result.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });
    
    // Verificar planos inseridos
    const planos = await db.query('SELECT COUNT(*) as total FROM planos_assinatura');
    console.log(`📊 Total de planos de assinatura: ${planos.rows[0].total}`);
    
    // Verificar estrutura da tabela rotas_escolares
    const colunas = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'rotas_escolares' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela rotas_escolares:');
    colunas.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });
    
    // Verificar views criadas
    const views = await db.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'vw_%'
      ORDER BY table_name
    `);
    
    console.log('📋 Views criadas:');
    views.rows.forEach(view => {
      console.log('  ✓', view.table_name);
    });
    
    console.log('🎉 Todas as melhorias foram aplicadas com sucesso!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar melhorias:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

executarMelhorias();