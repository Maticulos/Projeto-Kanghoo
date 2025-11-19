/**
 * Script Node.js para executar migração e seed
 * Usa a conexão do banco já configurada no projeto
 * 
 * USO: cd teste/server && node ../database/executar-migracao-seed.js
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

async function executarSQL(arquivo) {
  const caminhoArquivo = path.join(databaseDir, arquivo);
  
  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
  }
  
  const sql = fs.readFileSync(caminhoArquivo, 'utf8');
  
  // Dividir por comandos (separados por ;)
  // Mas manter blocos BEGIN/COMMIT juntos
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
  
  if (comandoAtual.trim()) {
    comandos.push(comandoAtual.trim());
  }
  
  // Executar cada comando
  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i];
    if (comando && !comando.startsWith('--') && !comando.startsWith('/*')) {
      try {
        await db.query(comando);
        console.log(`  ✅ Comando ${i + 1}/${comandos.length} executado`);
      } catch (error) {
        // Ignorar erros de "já existe" ou "não existe"
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate') ||
            error.message.includes('duplicado')) {
          console.log(`  ⚠️  Comando ${i + 1} ignorado (já existe ou não necessário)`);
        } else {
          console.error(`  ❌ Erro no comando ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
  }
}

async function main() {
  console.log('==========================================');
  console.log('MIGRAÇÃO E SEED: Dados para Mapa Interativo');
  console.log('==========================================');
  console.log('');
  
  try {
    // Testar conexão
    console.log('🔌 Testando conexão com banco de dados...');
    await db.query('SELECT 1');
    console.log('✅ Conexão estabelecida!');
    console.log('');
    
    // Executar migração
    console.log('📋 Executando migração de coordenadas...');
    await executarSQL('migracao_coordenadas_mapa.sql');
    console.log('✅ Migração concluída!');
    console.log('');
    
    // Executar seed
    console.log('🌱 Inserindo dados de teste...');
    await executarSQL('seed_dados_teste_mapa.sql');
    console.log('✅ Dados de teste inseridos!');
    console.log('');
    
    // Verificar dados inseridos
    console.log('📊 Verificando dados inseridos...');
    const usuarios = await db.query("SELECT COUNT(*) as total FROM usuarios WHERE email LIKE '%teste%'");
    const veiculos = await db.query(`
      SELECT COUNT(*) as total 
      FROM veiculos v
      JOIN usuarios u ON v.motorista_id = u.id
      WHERE u.email LIKE '%teste%'
    `);
    const rotas = await db.query(`
      SELECT COUNT(*) as total 
      FROM rotas_escolares r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE u.email LIKE '%teste%'
    `);
    const pacotes = await db.query(`
      SELECT COUNT(*) as total 
      FROM pacotes_excursao p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE u.email LIKE '%teste%'
    `);
    
    console.log(`  👥 Usuários: ${usuarios.rows[0].total}`);
    console.log(`  🚗 Veículos: ${veiculos.rows[0].total}`);
    console.log(`  🚌 Rotas Escolares: ${rotas.rows[0].total}`);
    console.log(`  🎒 Pacotes Excursão: ${pacotes.rows[0].total}`);
    console.log('');
    
    console.log('==========================================');
    console.log('✅ Processo concluído com sucesso!');
    console.log('==========================================');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Fechar conexão
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
}

main();

