const db = require('../config/db');

async function verificarColunasCriancas() {
  try {
    console.log('Verificando colunas da tabela criancas...');

    // Verifica se a tabela criancas existe
    const tableCheck = await db.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'criancas');");
    if (!tableCheck.rows[0].exists) {
      console.log('A tabela criancas não existe.');
      return;
    }

    // Lista todas as colunas da tabela criancas
    const columnsResult = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'criancas';");
    const colunasCriancas = columnsResult.rows.map(row => row.column_name);
    console.log('Colunas existentes na tabela criancas:', colunasCriancas);

    // Verifica especificamente a coluna nome_responsavel
    if (colunasCriancas.includes('nome_responsavel')) {
      console.log('A coluna nome_responsavel existe na tabela criancas.');
    } else {
      console.log('A coluna nome_responsavel NÃO existe na tabela criancas.');
    }

  } catch (error) {
    console.error('Erro ao verificar colunas da tabela criancas:', error);
  } finally {
    if (db.pool && db.pool.end) {
      await db.pool.end();
    }
  }
}

verificarColunasCriancas();