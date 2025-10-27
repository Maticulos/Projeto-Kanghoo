const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function executarParte1() {
  try {
    console.log('🔄 Executando PARTE 1: Criação das novas tabelas...');
    
    // Ler o script SQL
    const sqlPath = path.join(__dirname, '../../database/parte1_criar_tabelas.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o script
    await db.query(sqlScript);
    console.log('✅ Script executado com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const verificacoes = [
      'planos_assinatura',
      'criancas_rotas', 
      'veiculos'
    ];
    
    console.log('\n🔍 Verificando tabelas criadas:');
    for (const tabela of verificacoes) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabela]);
      
      const existe = result.rows[0].exists;
      console.log(`  ${existe ? '✅' : '❌'} ${tabela}: ${existe ? 'criada' : 'não encontrada'}`);
    }
    
    // Verificar planos inseridos
    const planosResult = await db.query('SELECT COUNT(*) as total FROM planos_assinatura');
    console.log(`\n📊 Total de planos de assinatura: ${planosResult.rows[0].total}`);
    
    console.log('\n🎉 PARTE 1 concluída com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao executar PARTE 1:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

executarParte1();