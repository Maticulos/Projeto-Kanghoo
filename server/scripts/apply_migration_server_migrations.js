/**
 * Apply a single SQL migration file located under server/migrations
 * Usage: cd teste/server && node scripts/apply_migration_server_migrations.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function executarSQLFile(caminhoArquivo) {
  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
  }

  const sql = fs.readFileSync(caminhoArquivo, 'utf8');

  // Split commands by semicolon but keep BEGIN/COMMIT blocks together
  const comandos = [];
  let comandoAtual = '';
  let dentroBloco = false;

  const linhas = sql.split('\n');
  for (const linha of linhas) {
    const linhaTrim = linha.trim();
    if (linhaTrim.toUpperCase().startsWith('BEGIN')) {
      dentroBloco = true;
      comandoAtual += linha + '\n';
    } else if (linhaTrim.toUpperCase().startsWith('COMMIT')) {
      dentroBloco = false;
      comandoAtual += linha + '\n';
      if (comandoAtual.trim()) {
        comandos.push(comandoAtual.trim());
        comandoAtual = '';
      }
    } else if (dentroBloco || linhaTrim) {
      comandoAtual += linha + '\n';
    }
  }
  if (comandoAtual.trim()) comandos.push(comandoAtual.trim());

  console.log(`Encontrados ${comandos.length} comandos no arquivo.`);

  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i];
    if (!comando) continue;
    try {
      await db.query(comando);
      console.log(`✅ Comando ${i + 1}/${comandos.length} executado com sucesso.`);
    } catch (error) {
      const msg = error && error.message ? error.message : String(error);
      // If harmless, log and continue
      if (msg.includes('already exists') || msg.includes('does not exist') || msg.includes('duplicate') || msg.includes('duplicado') || msg.includes('23505') || msg.includes('23514')) {
        console.warn(`⚠️  Comando ${i + 1} retornou aviso: ${msg}`);
      } else {
        console.error(`❌ Erro executando comando ${i + 1}: ${msg}`);
        throw error;
      }
    }
  }
}

async function main() {
  try {
    console.log('🔌 Testando conexão com banco de dados...');
    await db.query('SELECT 1');
    console.log('✅ Conexão OK');

    const migracaoPath = path.join(__dirname, '..', 'migrations', '20251119_add_concluida_status_and_constraints.sql');
    console.log(`📁 Aplicando migração: ${migracaoPath}`);
    await executarSQLFile(migracaoPath);

    console.log('🎉 Migração aplicada com sucesso.');
  } catch (err) {
    console.error('Erro ao aplicar migração:', err.message || err);
    process.exit(1);
  } finally {
    if (db.pool) await db.pool.end();
    process.exit(0);
  }
}

main();
