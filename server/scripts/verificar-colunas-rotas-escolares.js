const db = require('../config/db');

async function verificarColunasRotasEscolares() {
  try {
    console.log('=== VERIFICANDO ESTRUTURA DA TABELA rotas_escolares ===');

    // Verificar se a tabela existe
    const tabelaExiste = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rotas_escolares'
      );
    `);

    if (!tabelaExiste.rows[0].exists) {
      console.log('❌ Tabela rotas_escolares não existe no banco de dados!');
      return;
    }

    console.log('✅ Tabela rotas_escolares existe');

    // Verificar colunas da tabela
    const colunas = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'rotas_escolares' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📋 Colunas encontradas:');
    colunas.rows.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - NULL: ${col.is_nullable}`);
    });

    // Verificar se a coluna origem existe
    const colunaOrigemExiste = colunas.rows.some(col => col.column_name === 'origem');
    console.log(`
🔍 Coluna "origem" existe: ${colunaOrigemExiste ? 'SIM' : 'NÃO'}`);

  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error.message);
  } finally {
    await db.pool.end();
    process.exit();
  }
}

verificarColunasRotasEscolares();