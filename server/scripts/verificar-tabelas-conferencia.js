/**
 * Script para verificar se as tabelas do sistema de conferência existem
 */

require('dotenv').config();
const db = require('../config/db');

async function verificarTabelas() {
  console.log('🔍 Verificando tabelas do sistema de conferência...\n');
  
  const tabelas = [
    'viagens_ativas',
    'conferencia_criancas',
    'rastreamento_gps',
    'paradas_rota'
  ];
  
  for (const tabela of tabelas) {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabela]);
      
      const existe = result.rows[0].exists;
      
      if (existe) {
        // Contar registros
        const count = await db.query(`SELECT COUNT(*) as total FROM ${tabela}`);
        console.log(`✅ ${tabela}: Existe (${count.rows[0].total} registros)`);
        
        // Mostrar estrutura
        const columns = await db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tabela]);
        
        console.log(`   Colunas: ${columns.rows.map(c => c.column_name).join(', ')}`);
      } else {
        console.log(`❌ ${tabela}: NÃO existe`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${tabela}: Erro ao verificar - ${error.message}`);
      console.log('');
    }
  }
  
  await db.pool.end();
}

verificarTabelas();

