const db = require('../config/db');

async function verificarEstrutura() {
  try {
    console.log('🔍 Verificando estrutura atual das tabelas...');
    
    // Verificar se a tabela rotas_escolares existe
    const tabelaExiste = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rotas_escolares'
      )
    `);
    
    console.log('Tabela rotas_escolares existe:', tabelaExiste.rows[0].exists);
    
    if (tabelaExiste.rows[0].exists) {
      // Verificar colunas da tabela rotas_escolares
      const colunas = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Colunas atuais da tabela rotas_escolares:');
      colunas.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Verificar outras tabelas relacionadas
    const tabelas = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('usuarios', 'criancas', 'planos_assinatura', 'criancas_rotas', 'veiculos')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tabelas relacionadas existentes:');
    tabelas.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });
    
    // Verificar estrutura da tabela usuarios
    const colunasUsuarios = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas da tabela usuarios:');
    colunasUsuarios.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Verificar estrutura da tabela veiculos se existir
    const veiculosExiste = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'veiculos'
      )
    `);
    
    if (veiculosExiste.rows[0].exists) {
      const colunasVeiculos = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'veiculos' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Colunas da tabela veiculos:');
      colunasVeiculos.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
    process.exit(1);
  }
}

verificarEstrutura();