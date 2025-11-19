/**
 * Script Node.js para executar a migração completa do schema.
 * 
 * USO: cd teste/server && node ../database/run-migration.js
 */

const fs = require('fs');
const path = require('path');

// Salvar caminhos antes de mudar diretório
const scriptDir = __dirname; // Diretório database
const serverDir = path.join(scriptDir, '../server');
const databaseDir = scriptDir;

// Mudar para o diretório do servidor ANTES de carregar módulos
process.chdir(serverDir);

// Agora carregar módulos do servidor
require('dotenv').config();
const db = require('./config/db');
const logger = require('./utils/logger');

async function executeSqlFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    // Dividir o script em comandos individuais. Simples split por ';' pode ser frágil
    // para blocos PL/pgSQL, mas para CREATE TABLE e INDEX, geralmente funciona.
    // Uma abordagem mais robusta seria necessária para scripts complexos com funções.
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim() && !command.trim().startsWith('--')) {
        try {
          await db.query(command);
          logger.info(`  ✅ Comando ${i + 1}/${commands.length} executado com sucesso.`);
        } catch (error) {
          // Ignorar erros comuns de "já existe" para tornar o script repetível
          if (error.code === '42P07' || error.code === '23505') { // 42P07: duplicate_table, 23505: unique_violation
            logger.warn(`  ⚠️  Comando ${i + 1} ignorado (tabela/índice/dado já existe).`);
          } else {
            logger.error(`  ❌ Erro no comando ${i + 1}:`, error);
            throw error; // Lançar erro para parar a migração em caso de falha séria
          }
        }
      }
    }
  } catch (error) {
    logger.error(`❌ Falha ao ler ou executar o arquivo SQL: ${filePath}`, error);
    throw error;
  }
}

async function main() {
  console.log('======================================================');
  console.log('EXECUTANDO MIGRAÇÃO COMPLETA DO BANCO DE DADOS');
  console.log('======================================================');
  
  try {
    logger.info('🔌 Testando conexão com banco de dados...');
    await db.query('SELECT 1');
    logger.info('✅ Conexão estabelecida!');
    
    // Lista de scripts de migração em ordem
    const migrationScripts = [
      'etapa6_conferencia_rastreamento.sql'
    ];

    for (const scriptName of migrationScripts) {
      const scriptPath = path.join(databaseDir, scriptName);
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Arquivo de migração não encontrado: ${scriptName}`);
      }
      logger.info(`📋 Executando migração: ${scriptName}...`);
      await executeSqlFile(scriptPath);
      logger.info(`✅ Migração ${scriptName} concluída!`);
    }
    
    console.log('\n==========================================');
    console.log('✅ Migração concluída com sucesso!');
    console.log('==========================================');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERRO DURANTE A MIGRAÇÃO:', error.message);
    process.exit(1);
  } finally {
    if (db.pool) {
      await db.pool.end();
    }
  }
}

main();
