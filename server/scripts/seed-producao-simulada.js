/**
 * 🎯 Script para criar ambiente de produção simulado
 * 
 * Executa o seed completo com:
 * - 3 motoristas (Basic, Premium, Excursão)
 * - 3 responsáveis com crianças
 * - Rotas escolares ativas
 * - Associações criança-rota
 * 
 * USO: node server/scripts/seed-producao-simulada.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function executarSeed() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🎯 Criando Ambiente de Produção Simulado             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  try {
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../../database/seed_test_users.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`❌ Arquivo não encontrado: ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executando script SQL...\n');
    
    // Executar SQL
    await db.query(sql);
    
    console.log('\n✅ Seed executado com sucesso!\n');
    
    // Validar dados criados
    console.log('🔍 Validando dados criados...\n');
    
    const motoristas = await db.query(`
      SELECT email, nome_completo, tipo_usuario
      FROM usuarios
      WHERE email IN ('basic@motorista.com', 'premium@motorista.com', 'excursao@motorista.com')
      ORDER BY email
    `);
    
    const responsaveis = await db.query(`
      SELECT email, nome_completo
      FROM usuarios
      WHERE email IN ('pai1@email.com', 'pai2@email.com', 'pai3@email.com')
      ORDER BY email
    `);
    
    const criancas = await db.query(`
      SELECT c.nome_completo, c.idade, u.nome_completo as responsavel
      FROM criancas c
      JOIN usuarios u ON c.responsavel_id = u.id
      WHERE c.email_responsavel IN ('pai1@email.com', 'pai2@email.com', 'pai3@email.com')
      ORDER BY c.nome_completo
    `);
    
    const rotas = await db.query(`
      SELECT r.nome_rota, r.turno, u.nome_completo as motorista,
             (SELECT COUNT(*) FROM criancas_rotas cr WHERE cr.rota_id = r.id) as total_criancas
      FROM rotas_escolares r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE u.email IN ('basic@motorista.com', 'premium@motorista.com')
      ORDER BY r.nome_rota
    `);
    
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMO DOS DADOS CRIADOS                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('🚐 MOTORISTAS:');
    console.log('─'.repeat(60));
    motoristas.rows.forEach(m => {
      console.log(`   📧 ${m.email}`);
      console.log(`   👤 ${m.nome_completo}`);
      console.log(`   🏷️  ${m.tipo_usuario}`);
      console.log('');
    });
    
    console.log('👨‍👩‍👧 RESPONSÁVEIS:');
    console.log('─'.repeat(60));
    responsaveis.rows.forEach(r => {
      console.log(`   📧 ${r.email}`);
      console.log(`   👤 ${r.nome_completo}`);
      console.log('');
    });
    
    console.log('👶 CRIANÇAS:');
    console.log('─'.repeat(60));
    criancas.rows.forEach(c => {
      console.log(`   👶 ${c.nome_completo} (${c.idade} anos)`);
      console.log(`   👨‍👩‍👧 Responsável: ${c.responsavel}`);
      console.log('');
    });
    
    console.log('🗺️  ROTAS:');
    console.log('─'.repeat(60));
    rotas.rows.forEach(r => {
      console.log(`   🗺️  ${r.nome_rota}`);
      console.log(`   🚐 Motorista: ${r.motorista}`);
      console.log(`   ⏰ Turno: ${r.turno}`);
      console.log(`   👶 Crianças: ${r.total_criancas}`);
      console.log('');
    });
    
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ AMBIENTE PRONTO PARA USO!                         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('🔐 Acesse: http://localhost:3000/auth/login.html');
    console.log('🔑 Senha padrão: teste123\n');
    
  } catch (error) {
    console.error('\n❌ Erro ao executar seed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Executar
executarSeed();
