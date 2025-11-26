/**
 * Script para criar crianças de teste para as rotas escolares
 */

require('dotenv').config();
const db = require('../config/db');

async function criarCriancasTeste() {
  console.log('👶 Criando crianças de teste para rotas escolares...\n');
  
  try {
    // Buscar rotas escolares de teste
    const rotas = await db.query(`
      SELECT r.id, r.nome_rota, r.usuario_id, u.nome_completo as motorista_nome
      FROM rotas_escolares r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE u.email LIKE '%teste%'
      AND r.ativa = true
      ORDER BY r.id
    `);
    
    if (rotas.rows.length === 0) {
      console.log('⚠️  Nenhuma rota escolar encontrada.');
      return;
    }
    
    console.log(`📋 Encontradas ${rotas.rows.length} rotas escolares:\n`);
    
    // Buscar ou criar responsável de teste
    let responsavelId;
    const responsavel = await db.query(`
      SELECT id FROM usuarios
      WHERE email = 'responsavel.teste@email.com'
      AND tipo_usuario = 'responsavel'
    `);
    
    if (responsavel.rows.length === 0) {
      const senhaHash = '$2b$10$zPe12rT8.cDnSK.Y.EzVIO9Mu/yUboVImsiw.AgPJzirH/tKMpHY6'; // teste123
      const respResult = await db.query(`
        INSERT INTO usuarios (nome_completo, email, celular, tipo_usuario, senha)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['Responsável Teste', 'responsavel.teste@email.com', '(11) 99999-9999', 'responsavel', senhaHash]);
      responsavelId = respResult.rows[0].id;
      console.log(`✅ Responsável de teste criado (ID: ${responsavelId})`);
    } else {
      responsavelId = responsavel.rows[0].id;
      console.log(`ℹ️  Responsável de teste já existe (ID: ${responsavelId})`);
    }
    console.log('');
    
    // Para cada rota, criar 3-5 crianças de teste
    for (const rota of rotas.rows) {
      console.log(`📍 Rota: ${rota.nome_rota} (Motorista: ${rota.motorista_nome})`);
      
      const numCriancas = 3 + Math.floor(Math.random() * 3); // 3-5 crianças
      const nomes = ['Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Julia Lima'];
      
      for (let i = 0; i < numCriancas; i++) {
        const nome = nomes[i % nomes.length] + ` ${i + 1}`;
        const dataNascimento = new Date(2015 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        
        // Verificar se criança já existe
        const criancaExistente = await db.query(`
          SELECT id FROM criancas
          WHERE nome_completo = $1 AND responsavel_id = $2
        `, [nome, responsavelId]);
        
        let criancaId;
        if (criancaExistente.rows.length === 0) {
          const idade = new Date().getFullYear() - dataNascimento.getFullYear();
          const cpf = `${Math.floor(100000000 + Math.random() * 900000000)}${Math.floor(10 + Math.random() * 90)}`;
          const escolaNome = rota.nome_rota.includes('São João') ? 'Escola Municipal São João' : 
                             rota.nome_rota.includes('Santa Maria') ? 'Colégio Santa Maria' :
                             'Escola Internacional';
          
          const criancaResult = await db.query(`
            INSERT INTO criancas (
              nome_completo, cpf, idade, data_nascimento,
              nome_responsavel, telefone_responsavel, email_responsavel,
              endereco_residencial, escola, endereco_escola,
              responsavel_id, ativo
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `, [
            nome, cpf, idade, dataNascimento,
            'Responsável Teste', '(11) 99999-9999', 'responsavel.teste@email.com',
            `Rua Exemplo, ${100 + i}`, escolaNome,
            `${escolaNome} - Rua da Escola, 456`,
            responsavelId, true
          ]);
          criancaId = criancaResult.rows[0].id;
        } else {
          criancaId = criancaExistente.rows[0].id;
        }
        
        // Associar criança à rota (se a tabela criancas_rotas existir)
        try {
          const associacaoExistente = await db.query(`
            SELECT id FROM criancas_rotas
            WHERE crianca_id = $1 AND rota_id = $2
          `, [criancaId, rota.id]);
          
          if (associacaoExistente.rows.length === 0) {
            await db.query(`
              INSERT INTO criancas_rotas (
                crianca_id, rota_id, endereco_embarque, endereco_desembarque,
                latitude_embarque, longitude_embarque,
                latitude_desembarque, longitude_desembarque,
                horario_embarque_previsto, horario_desembarque_previsto,
                ativo
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              criancaId, rota.id,
              `Rua Exemplo, ${100 + i}`, rota.nome_rota.includes('São João') ? 'Escola Municipal São João' : 'Colégio',
              -23.5505 + (i * 0.001), -46.6333 + (i * 0.001),
              -23.5615, -46.6565,
              '07:00', '12:00',
              true
            ]);
          }
        } catch (error) {
          // Tabela não existe, continuar sem ela
          console.log(`      ⚠️  Tabela criancas_rotas não encontrada, pulando associação`);
        }
      }
      
      console.log(`   ✅ ${numCriancas} crianças criadas/verificadas`);
    }
    
    console.log('\n✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function main() {
  try {
    await criarCriancasTeste();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();

