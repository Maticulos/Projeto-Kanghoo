/**
 * Script para executar a migração do sistema de conferência
 */

require('dotenv').config();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function executarMigracao() {
  console.log('🔄 Executando migração do sistema de conferência...\n');
  
  const sqlPath = path.join(__dirname, '../../database/migracao_sistema_conferencia.sql');
  
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Arquivo não encontrado: ${sqlPath}`);
  }
  
  const sqlScript = fs.readFileSync(sqlPath, 'utf8');
  
  try {
    // Remover a parte de verificação no final (SELECTs)
    const sqlLimpo = sqlScript.split('-- ==========================================')[0] + 'COMMIT;';
    
    await db.query(sqlLimpo);
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar tabelas criadas
    console.log('\n📊 Verificando tabelas criadas...\n');
    const tabelas = ['viagens_ativas', 'conferencia_criancas', 'rastreamento_gps', 'paradas_rota'];
    
    for (const tabela of tabelas) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabela]);
      
      if (result.rows[0].exists) {
        const count = await db.query(`SELECT COUNT(*) as total FROM ${tabela}`);
        console.log(`✅ ${tabela}: Criada (${count.rows[0].total} registros)`);
      } else {
        console.log(`❌ ${tabela}: Não foi criada`);
      }
    }
    
    console.log('\n✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await executarMigracao();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();

