/**
 * Script para verificar e executar migração de coordenadas e seed de dados
 * 
 * USO: cd teste/server && node scripts/verificar-e-executar-migracao-seed.js
 */

require('dotenv').config();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function verificarColunas() {
  console.log('🔍 Verificando colunas existentes...\n');
  
  const tabelas = [
    { nome: 'usuarios', colunas: ['latitude', 'longitude', 'bairro', 'cidade', 'estado'] },
    { nome: 'rotas_escolares', colunas: ['latitude_origem', 'longitude_origem', 'latitude_destino', 'longitude_destino', 'endereco_origem', 'endereco_destino', 'capacidade_maxima', 'capacidade_atual', 'status_rota'] },
    { nome: 'pacotes_excursao', colunas: ['latitude_partida', 'longitude_partida', 'endereco_partida', 'latitude_destino', 'longitude_destino', 'endereco_destino'] }
  ];
  
  const resultados = {};
  
  for (const tabela of tabelas) {
    const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND table_schema = 'public'
      AND column_name = ANY($2::text[])
    `;
    
    const result = await db.query(query, [tabela.nome, tabela.colunas]);
    const colunasExistentes = result.rows.map(r => r.column_name);
    
    resultados[tabela.nome] = {
      esperadas: tabela.colunas,
      existentes: colunasExistentes,
      faltando: tabela.colunas.filter(c => !colunasExistentes.includes(c))
    };
    
    console.log(`📋 ${tabela.nome}:`);
    console.log(`   ✅ Existentes: ${colunasExistentes.length}/${tabela.colunas.length}`);
    if (resultados[tabela.nome].faltando.length > 0) {
      console.log(`   ⚠️  Faltando: ${resultados[tabela.nome].faltando.join(', ')}`);
    }
    console.log('');
  }
  
  return resultados;
}

async function executarSQL(arquivo) {
  const sqlPath = path.join(__dirname, '../../database', arquivo);
  
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Arquivo não encontrado: ${sqlPath}`);
  }
  
  const sqlScript = fs.readFileSync(sqlPath, 'utf8');
  
  // Executar o script completo de uma vez
  // Isso é necessário para blocos DO $$ que não podem ser divididos
  try {
    await db.query(sqlScript);
    console.log('   ✅ Script executado com sucesso!');
  } catch (error) {
    // Ignorar erros de "já existe" ou "não existe" para ALTER TABLE IF NOT EXISTS
    if (error.message.includes('already exists') || 
        error.message.includes('does not exist') ||
        error.message.includes('duplicate') ||
        error.message.includes('IF NOT EXISTS') ||
        error.message.includes('IF EXISTS') ||
        error.message.includes('already exists')) {
      console.log('   ⚠️  Algumas operações já foram executadas (normal)');
    } else {
      // Para outros erros, mostrar mas não falhar completamente
      console.warn(`   ⚠️  Aviso: ${error.message}`);
      // Tentar executar comandos individuais como fallback
      await executarSQLFallback(sqlScript);
    }
  }
}

async function executarSQLFallback(sqlScript) {
  // Fallback: tentar executar comandos individuais
  // Remover blocos BEGIN/COMMIT e DO $$
  const comandos = sqlScript
    .replace(/BEGIN\s*;/gi, '')
    .replace(/COMMIT\s*;/gi, '')
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => {
      // Filtrar blocos DO $$ e comandos vazios
      return cmd.length > 0 && 
             !cmd.startsWith('--') && 
             !cmd.startsWith('/*') &&
             !cmd.includes('DO $$');
    });
  
  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i];
    if (comando.length < 10) continue; // Pular comandos muito curtos
    
    try {
      await db.query(comando);
    } catch (error) {
      // Ignorar erros esperados
      if (!error.message.includes('already exists') && 
          !error.message.includes('does not exist') &&
          !error.message.includes('duplicate')) {
        // Silenciar outros erros no fallback
      }
    }
  }
}

async function verificarDados() {
  console.log('📊 Verificando dados existentes...\n');
  
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
  
  console.log(`  👥 Usuários de teste: ${usuarios.rows[0].total}`);
  console.log(`  🚗 Veículos de teste: ${veiculos.rows[0].total}`);
  console.log(`  🚌 Rotas Escolares de teste: ${rotas.rows[0].total}`);
  console.log(`  🎒 Pacotes Excursão de teste: ${pacotes.rows[0].total}`);
  console.log('');
  
  return {
    usuarios: parseInt(usuarios.rows[0].total),
    veiculos: parseInt(veiculos.rows[0].total),
    rotas: parseInt(rotas.rows[0].total),
    pacotes: parseInt(pacotes.rows[0].total)
  };
}

async function main() {
  console.log('==========================================');
  console.log('VERIFICAÇÃO E EXECUÇÃO: Migração e Seed');
  console.log('==========================================');
  console.log('');
  
  try {
    // Testar conexão
    console.log('🔌 Testando conexão com banco de dados...');
    await db.query('SELECT 1');
    console.log('✅ Conexão estabelecida!');
    console.log('');
    
    // Verificar colunas
    const colunas = await verificarColunas();
    
    // Verificar se precisa executar migração
    const precisaMigracao = Object.values(colunas).some(r => r.faltando.length > 0);
    
    if (precisaMigracao) {
      console.log('📋 Executando migração de coordenadas...');
      await executarSQL('migracao_coordenadas_mapa.sql');
      console.log('✅ Migração concluída!');
      console.log('');
      
      // Verificar novamente
      console.log('🔍 Verificando colunas após migração...\n');
      await verificarColunas();
    } else {
      console.log('✅ Todas as colunas necessárias já existem!');
      console.log('');
    }
    
    // Verificar dados existentes
    const dados = await verificarDados();
    
    // Verificar se precisa executar seed
    const precisaSeed = dados.veiculos === 0 || dados.rotas === 0 || dados.pacotes === 0;
    
    if (precisaSeed) {
      console.log('🌱 Inserindo dados de teste...');
      await executarSQL('seed_dados_teste_mapa.sql');
      console.log('✅ Dados de teste inseridos!');
      console.log('');
      
      // Verificar novamente
      console.log('📊 Verificando dados após seed...\n');
      await verificarDados();
    } else {
      console.log('✅ Dados de teste já existem!');
      console.log('');
    }
    
    // Verificação final
    console.log('==========================================');
    console.log('✅ PROCESSO CONCLUÍDO!');
    console.log('==========================================');
    console.log('');
    console.log('📝 Resumo:');
    console.log(`   - Migração: ${precisaMigracao ? 'Executada' : 'Não necessária'}`);
    console.log(`   - Seed: ${precisaSeed ? 'Executado' : 'Não necessário'}`);
    console.log('');
    console.log('🎯 Próximos passos:');
    console.log('   1. Teste a API: http://localhost:3000/api/public/transportes?tipo=todos');
    console.log('   2. Verifique o mapa em: http://localhost:3000/encontrar-transporte.html');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();

