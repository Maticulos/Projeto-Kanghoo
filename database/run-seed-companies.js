const fs = require('fs');
const path = require('path');
const db = require('../server/config/db');

async function runSeedCompanies() {
  try {
    console.log('🚀 Executando seed de empresas...');
    
    const sqlPath = path.join(__dirname, 'seed_companies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sql);

    console.log('✅ Seed de empresas executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar seed de empresas:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runSeedCompanies();
