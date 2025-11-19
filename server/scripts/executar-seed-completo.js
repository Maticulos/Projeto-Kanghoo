/**
 * Script para executar o seed completo, garantindo que todos os blocos DO $$ sejam executados
 * 
 * USO: cd teste/server && node scripts/executar-seed-completo.js
 */

require('dotenv').config();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function executarSeed() {
  console.log('🌱 Executando seed completo...\n');
  
  const sqlPath = path.join(__dirname, '../../database/seed_dados_teste_mapa.sql');
  
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Arquivo não encontrado: ${sqlPath}`);
  }
  
  const sqlScript = fs.readFileSync(sqlPath, 'utf8');
  
  // Remover comentários de verificação no final (SELECTs)
  const sqlLimpo = sqlScript.split('-- ==========================================')[0] + 'COMMIT;';
  
  try {
    // Executar o script completo de uma vez
    // Isso é necessário para blocos DO $$ e BEGIN/COMMIT
    console.log('   Executando script SQL...');
    await db.query(sqlLimpo);
    console.log('   ✅ Script executado com sucesso!');
    
    // Verificar dados inseridos
    console.log('\n📊 Verificando dados inseridos...\n');
    
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
    const caracteristicas = await db.query(`
      SELECT COUNT(*) as total 
      FROM caracteristicas_veiculos cv
      JOIN veiculos v ON cv.veiculo_id = v.id
      JOIN usuarios u ON v.motorista_id = u.id
      WHERE u.email LIKE '%teste%'
    `);
    const avaliacoes = await db.query(`
      SELECT COUNT(*) as total 
      FROM avaliacoes a
      JOIN usuarios u ON a.avaliado_id = u.id
      WHERE u.email LIKE '%teste%'
    `);
    
    console.log(`  👥 Usuários: ${usuarios.rows[0].total}`);
    console.log(`  🚗 Veículos: ${veiculos.rows[0].total}`);
    console.log(`  🔧 Características de veículos: ${caracteristicas.rows[0].total}`);
    console.log(`  🚌 Rotas Escolares: ${rotas.rows[0].total}`);
    console.log(`  🎒 Pacotes Excursão: ${pacotes.rows[0].total}`);
    console.log(`  ⭐ Avaliações: ${avaliacoes.rows[0].total}`);
    console.log('');
    
    // Listar alguns dados para verificação
    if (parseInt(veiculos.rows[0].total) > 0) {
      console.log('📋 Veículos criados:');
      const veiculosList = await db.query(`
        SELECT v.placa, v.modelo, u.nome_completo, u.email
        FROM veiculos v
        JOIN usuarios u ON v.motorista_id = u.id
        WHERE u.email LIKE '%teste%'
        ORDER BY v.placa
      `);
      veiculosList.rows.forEach(v => {
        console.log(`   - ${v.placa} (${v.modelo}) - ${v.nome_completo}`);
      });
      console.log('');
    }
    
    if (parseInt(rotas.rows[0].total) > 0) {
      console.log('📋 Rotas Escolares criadas:');
      const rotasList = await db.query(`
        SELECT r.nome_rota, r.escola_destino, u.nome_completo
        FROM rotas_escolares r
        JOIN usuarios u ON r.usuario_id = u.id
        WHERE u.email LIKE '%teste%'
        ORDER BY r.nome_rota
      `);
      rotasList.rows.forEach(r => {
        console.log(`   - ${r.nome_rota} → ${r.escola_destino} (${r.nome_completo})`);
      });
      console.log('');
    }
    
    if (parseInt(pacotes.rows[0].total) > 0) {
      console.log('📋 Pacotes Excursão criados:');
      const pacotesList = await db.query(`
        SELECT p.nome_pacote, p.destino, u.nome_completo
        FROM pacotes_excursao p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE u.email LIKE '%teste%'
        ORDER BY p.nome_pacote
      `);
      pacotesList.rows.forEach(p => {
        console.log(`   - ${p.nome_pacote} → ${p.destino} (${p.nome_completo})`);
      });
      console.log('');
    }
    
    console.log('✅ Seed concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function main() {
  try {
    await executarSeed();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();

