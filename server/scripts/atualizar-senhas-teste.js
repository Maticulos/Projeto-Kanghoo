/**
 * Script para atualizar todas as senhas de usuários de teste para "teste123"
 * 
 * USO: cd teste/server && node scripts/atualizar-senhas-teste.js
 */

require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcrypt');

async function atualizarSenhas() {
  console.log('🔐 Atualizando senhas de usuários de teste...\n');
  
  try {
    // Hash da senha "teste123"
    const senhaHash = await bcrypt.hash('teste123', 10);
    
    // Atualizar todos os usuários de teste
    const result = await db.query(`
      UPDATE usuarios 
      SET senha = $1
      WHERE email LIKE '%teste%'
    `, [senhaHash]);
    
    console.log(`✅ ${result.rowCount} usuários atualizados com sucesso!`);
    console.log(`   Senha padrão: teste123`);
    console.log('');
    
    // Listar usuários atualizados
    const usuarios = await db.query(`
      SELECT email, nome_completo, tipo_usuario
      FROM usuarios
      WHERE email LIKE '%teste%'
      ORDER BY email
    `);
    
    console.log('📋 Usuários atualizados:');
    usuarios.rows.forEach(u => {
      console.log(`   - ${u.email} (${u.nome_completo}) - ${u.tipo_usuario}`);
    });
    console.log('');
    
    console.log('✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await db.pool.end();
  }
}

atualizarSenhas();


