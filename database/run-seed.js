/**
 * Script para executar o seed de usuários de teste
 * Executa o arquivo seed_test_users.sql no banco de dados
 */

const fs = require('fs');
const path = require('path');
const db = require('../server/config/db');

async function runSeed() {

  try {
    console.log('🚀 Executando seed de usuários de teste...');
    console.log('');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'seed_test_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executando seed_test_users.sql...');
    console.log('');

    // Executar o SQL
    await db.query(sql);

    console.log('');
    console.log('✅ Seed executado com sucesso!');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao executar seed:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Executar
runSeed();
