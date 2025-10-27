const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function executarParte2() {
  try {
    console.log('🔄 Executando PARTE 2: Atualizando tabelas existentes...');
    
    // Ler o script SQL
    const sqlPath = path.join(__dirname, '../../database/parte2_atualizar_tabelas.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o script
    await db.query(sqlScript);
    console.log('✅ Script executado com sucesso!');
    
    // Verificar as novas colunas adicionadas
    console.log('\n🔍 Verificando novas colunas em rotas_escolares:');
    const colunasRotas = await db.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'rotas_escolares' 
      AND table_schema = 'public'
      AND column_name IN ('tipo_rota', 'endereco_origem', 'endereco_destino', 'capacidade_maxima', 'capacidade_atual', 'status_rota')
      ORDER BY column_name
    `);
    
    colunasRotas.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n🔍 Verificando novas colunas em veiculos:');
    const colunasVeiculos = await db.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'veiculos' 
      AND table_schema = 'public'
      AND column_name IN ('capacidade', 'tipo_veiculo', 'ativo')
      ORDER BY column_name
    `);
    
    colunasVeiculos.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`);
    });
    
    // Verificar dados atualizados
    const rotasAtualizadas = await db.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN capacidade_maxima IS NOT NULL THEN 1 END) as com_capacidade,
             COUNT(CASE WHEN status_rota IS NOT NULL THEN 1 END) as com_status
      FROM rotas_escolares
    `);
    
    console.log('\n📊 Estatísticas das rotas escolares:');
    console.log(`  - Total de rotas: ${rotasAtualizadas.rows[0].total}`);
    console.log(`  - Com capacidade definida: ${rotasAtualizadas.rows[0].com_capacidade}`);
    console.log(`  - Com status definido: ${rotasAtualizadas.rows[0].com_status}`);
    
    console.log('\n🎉 PARTE 2 concluída com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao executar PARTE 2:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

executarParte2();