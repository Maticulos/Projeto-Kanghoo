const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function executarParte3() {
  try {
    console.log('🔄 Executando PARTE 3: Criando funções, triggers e views...');
    
    // Ler o script SQL
    const sqlPath = path.join(__dirname, '../../database/parte3_funcoes_views.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o script
    await db.query(sqlScript);
    console.log('✅ Script executado com sucesso!');
    
    // Verificar se as funções foram criadas
    console.log('\n🔍 Verificando funções criadas:');
    const funcoes = await db.query(`
      SELECT routine_name, routine_type 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('atualizar_timestamp_modificacao', 'atualizar_capacidade_rota')
      ORDER BY routine_name
    `);
    
    funcoes.rows.forEach(func => {
      console.log(`  ✅ ${func.routine_name} (${func.routine_type})`);
    });
    
    // Verificar se as views foram criadas
    console.log('\n🔍 Verificando views criadas:');
    const views = await db.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'vw_%'
      ORDER BY table_name
    `);
    
    views.rows.forEach(view => {
      console.log(`  ✅ ${view.table_name}`);
    });
    
    // Verificar se os triggers foram criados
    console.log('\n🔍 Verificando triggers criados:');
    const triggers = await db.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE 'trigger_%'
      ORDER BY trigger_name
    `);
    
    triggers.rows.forEach(trigger => {
      console.log(`  ✅ ${trigger.trigger_name} (${trigger.event_object_table})`);
    });
    
    // Testar uma das views
    console.log('\n📊 Testando view vw_rotas_completas:');
    const testView = await db.query('SELECT COUNT(*) as total FROM vw_rotas_completas');
    console.log(`  - Total de registros na view: ${testView.rows[0].total}`);
    
    console.log('\n🎉 PARTE 3 concluída com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao executar PARTE 3:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

executarParte3();