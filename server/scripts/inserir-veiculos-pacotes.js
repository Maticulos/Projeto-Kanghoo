/**
 * Script para inserir veículos e pacotes de teste diretamente
 * 
 * USO: cd teste/server && node scripts/inserir-veiculos-pacotes.js
 */

require('dotenv').config();
delete process.env.DATABASE_URL; // Remove DATABASE_URL to force using individual params
process.env.DB_HOST = 'localhost'; // Force localhost for local script execution
const db = require('../config/db');

async function inserirDados() {
  console.log('🚀 Inserindo veículos e pacotes de teste...\n');
  
  try {
    // Primeiro, criar/atualizar usuários de teste do seed se não existirem
    const senhaHash = '$2b$10$zPe12rT8.cDnSK.Y.EzVIO9Mu/yUboVImsiw.AgPJzirH/tKMpHY6'; // teste123
    
    const usuariosSeed = [
      { email: 'joao.silva.teste@email.com', nome: 'João Silva', tipo: 'motorista_escolar', lat: -23.5505, lng: -46.6333, bairro: 'Vila Madalena', cidade: 'São Paulo', estado: 'SP', endereco: 'Rua das Flores, 123, Vila Madalena', celular: '(11) 98765-4321' },
      { email: 'maria.santos.teste@email.com', nome: 'Maria Santos', tipo: 'motorista_escolar', lat: -23.5615, lng: -46.6565, bairro: 'Pinheiros', cidade: 'São Paulo', estado: 'SP', endereco: 'Av. Faria Lima, 456, Pinheiros', celular: '(11) 97654-3210' },
      { email: 'carlos.oliveira.teste@email.com', nome: 'Carlos Oliveira', tipo: 'motorista_excursao', lat: -23.5395, lng: -46.6103, bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP', endereco: 'Rua Augusta, 789, Consolação', celular: '(11) 96543-2109' },
      { email: 'ana.costa.teste@email.com', nome: 'Ana Costa', tipo: 'motorista_excursao', lat: -23.5725, lng: -46.6412, bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', endereco: 'Av. Paulista, 1000, Bela Vista', celular: '(11) 95432-1098' },
      { email: 'pedro.alves.teste@email.com', nome: 'Pedro Alves', tipo: 'motorista_escolar_excursao', lat: -23.5635, lng: -46.6700, bairro: 'Jardins', cidade: 'São Paulo', estado: 'SP', endereco: 'Rua Oscar Freire, 200, Jardins', celular: '(11) 94321-0987' }
    ];
    
    console.log('📝 Criando/atualizando usuários de teste do seed...\n');
    for (const userSeed of usuariosSeed) {
      await db.query(`
        INSERT INTO usuarios (nome_completo, email, celular, tipo_usuario, endereco_completo, senha, latitude, longitude, bairro, cidade, estado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (email) DO UPDATE SET 
          nome_completo = EXCLUDED.nome_completo,
          senha = EXCLUDED.senha,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          bairro = EXCLUDED.bairro,
          cidade = EXCLUDED.cidade,
          estado = EXCLUDED.estado
      `, [userSeed.nome, userSeed.email, userSeed.celular, userSeed.tipo, userSeed.endereco, senhaHash, userSeed.lat, userSeed.lng, userSeed.bairro, userSeed.cidade, userSeed.estado]);
    }
    console.log('   ✅ Usuários criados/atualizados\n');
    
    // Buscar IDs dos usuários de teste
    const usuarios = await db.query(`
      SELECT id, email, nome_completo, tipo_usuario
      FROM usuarios
      WHERE email IN (
        'joao.silva.teste@email.com',
        'maria.santos.teste@email.com',
        'carlos.oliveira.teste@email.com',
        'ana.costa.teste@email.com',
        'pedro.alves.teste@email.com'
      )
    `);
    
    if (usuarios.rows.length === 0) {
      console.log('⚠️  Nenhum usuário de teste encontrado. Execute o seed primeiro.');
      return;
    }
    
    console.log(`📋 Encontrados ${usuarios.rows.length} usuários de teste:\n`);
    usuarios.rows.forEach(u => {
      console.log(`   - ${u.email} (${u.nome_completo}) - ${u.tipo_usuario}`);
    });
    console.log('');
    
    const userMap = {};
    usuarios.rows.forEach(u => {
      userMap[u.email] = u.id;
    });
    
    // ==========================================
    // 1. JOÃO SILVA - Transporte Escolar
    // ==========================================
    if (userMap['joao.silva.teste@email.com']) {
      const userId = userMap['joao.silva.teste@email.com'];
      console.log(`🔧 Inserindo dados para João Silva (ID: ${userId})...`);
      
      // Veículo (verificar se já existe)
      const veiculoExistente = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['ABC-1234']);
      if (veiculoExistente.rows.length === 0) {
        await db.query(`
          INSERT INTO veiculos (motorista_id, placa, modelo, marca, capacidade, ano, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, 'ABC-1234', 'Sprinter', 'Mercedes-Benz', 25, 2020, 'ativo']);
      } else {
        await db.query(`
          UPDATE veiculos SET marca = $1, modelo = $2 WHERE id = $3
        `, ['Mercedes-Benz', 'Sprinter', veiculoExistente.rows[0].id]);
      }
      
      // Buscar ID do veículo
      const veiculo = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['ABC-1234']);
      if (veiculo.rows.length > 0) {
        const veiculoId = veiculo.rows[0].id;
        
        // Características (verificar se já existe)
        const caracExistente = await db.query('SELECT veiculo_id FROM caracteristicas_veiculos WHERE veiculo_id = $1', [veiculoId]);
        if (caracExistente.rows.length === 0) {
          await db.query(`
            INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento)
            VALUES ($1, $2, $3, $4, $5)
          `, [veiculoId, true, true, false, true]);
        } else {
            await db.query(`
                UPDATE caracteristicas_veiculos 
                SET ar_condicionado = $1, wifi = $2, acessibilidade_pcd = $3, gps_rastreamento = $4
                WHERE veiculo_id = $5
            `, [true, true, false, true, veiculoId]);
        }
      }
      
      // Rota (verificar se já existe antes de inserir)
      const rotaExistente = await db.query(`
        SELECT id FROM rotas_escolares 
        WHERE usuario_id = $1 AND nome_rota = $2
      `, [userId, 'Rota Centro - Zona Sul']);
      
      if (rotaExistente.rows.length === 0) {
        await db.query(`
          INSERT INTO rotas_escolares (
            usuario_id, nome_rota, escola_destino, turno, horario_ida, horario_volta,
            valor_mensal, preco_mensal, vagas_disponiveis, ativa, status_rota,
            latitude_origem, longitude_origem, latitude_destino, longitude_destino,
            endereco_origem, endereco_destino, capacidade_maxima, capacidade_atual
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
        userId, 'Rota Centro - Zona Sul', 'Escola Municipal São João', 'Manhã',
        '07:00', '12:00', 180.00, 180.00, 5, true, 'ativa',
        -23.5505, -46.6333, -23.5615, -46.6565,
        'Rua das Flores, 123, Vila Madalena', 'Av. Paulista, 1000, Bela Vista',
        25, 20
        ]);
      }
      
      // Avaliações (ignorar erros de duplicação)
      try {
        await db.query(`
          INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
          VALUES ($1, $2, $3, $4, $5), ($1, $2, $6, $7, $5), ($1, $2, $8, $9, $5)
        `, [userId, userId, 5, 'Excelente serviço!', true, 4, 'Muito pontual e seguro', 5, 'Recomendo!']);
      } catch (e) {
        // Ignorar erros de duplicação
      }
      
      console.log('   ✅ Dados inseridos para João Silva\n');
    }
    
    // ==========================================
    // 2. MARIA SANTOS - Transporte Escolar
    // ==========================================
    if (userMap['maria.santos.teste@email.com']) {
      const userId = userMap['maria.santos.teste@email.com'];
      console.log(`🔧 Inserindo dados para Maria Santos (ID: ${userId})...`);
      
      const veiculoExistente2 = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['DEF-5678']);
      if (veiculoExistente2.rows.length === 0) {
        await db.query(`
          INSERT INTO veiculos (motorista_id, placa, modelo, marca, capacidade, ano, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, 'DEF-5678', 'Kombi', 'Volkswagen', 15, 2019, 'ativo']);
      } else {
        await db.query(`
          UPDATE veiculos SET marca = $1, modelo = $2 WHERE id = $3
        `, ['Volkswagen', 'Kombi', veiculoExistente2.rows[0].id]);
      }
      
      const veiculo = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['DEF-5678']);
      if (veiculo.rows.length > 0) {
        const caracExistente2 = await db.query('SELECT veiculo_id FROM caracteristicas_veiculos WHERE veiculo_id = $1', [veiculo.rows[0].id]);
        if (caracExistente2.rows.length === 0) {
          await db.query(`
            INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento)
            VALUES ($1, $2, $3, $4, $5)
          `, [veiculo.rows[0].id, true, true, false, true]);
        } else {
            await db.query(`
                UPDATE caracteristicas_veiculos 
                SET ar_condicionado = $1, wifi = $2, acessibilidade_pcd = $3, gps_rastreamento = $4
                WHERE veiculo_id = $5
            `, [true, true, false, true, veiculo.rows[0].id]);
        }
      }
      
      const rotaExistente2 = await db.query(`
        SELECT id FROM rotas_escolares 
        WHERE usuario_id = $1 AND nome_rota = $2
      `, [userId, 'Rota Pinheiros - Centro']);
      
      if (rotaExistente2.rows.length === 0) {
        await db.query(`
          INSERT INTO rotas_escolares (
            usuario_id, nome_rota, escola_destino, turno, horario_ida, horario_volta,
            valor_mensal, preco_mensal, vagas_disponiveis, ativa, status_rota,
            latitude_origem, longitude_origem, latitude_destino, longitude_destino,
            endereco_origem, endereco_destino, capacidade_maxima, capacidade_atual
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
        userId, 'Rota Pinheiros - Centro', 'Colégio Santa Maria', 'Tarde',
        '13:00', '17:30', 150.00, 150.00, 3, true, 'ativa',
        -23.5615, -46.6565, -23.5505, -46.6333,
        'Av. Faria Lima, 456, Pinheiros', 'Rua Augusta, 500, Consolação',
        15, 12
        ]);
      }
      
      try {
        await db.query(`
          INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
          VALUES ($1, $2, $3, $4, $5), ($1, $2, $6, $7, $5)
        `, [userId, userId, 5, 'Ótimo atendimento', true, 4, 'Pontual e confiável']);
      } catch (e) {}
      
      console.log('   ✅ Dados inseridos para Maria Santos\n');
    }
    
    // ==========================================
    // 3. CARLOS OLIVEIRA - Excursão
    // ==========================================
    if (userMap['carlos.oliveira.teste@email.com']) {
      const userId = userMap['carlos.oliveira.teste@email.com'];
      console.log(`🔧 Inserindo dados para Carlos Oliveira (ID: ${userId})...`);
      
      const veiculoExistente3 = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['GHI-9012']);
      if (veiculoExistente3.rows.length === 0) {
        await db.query(`
          INSERT INTO veiculos (motorista_id, placa, modelo, marca, capacidade, ano, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, 'GHI-9012', 'Tourismo', 'Mercedes-Benz', 45, 2021, 'ativo']);
      } else {
        await db.query(`
          UPDATE veiculos SET marca = $1, modelo = $2 WHERE id = $3
        `, ['Mercedes-Benz', 'Tourismo', veiculoExistente3.rows[0].id]);
      }
      
      const veiculo = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['GHI-9012']);
      if (veiculo.rows.length > 0) {
        const caracExistente3 = await db.query('SELECT veiculo_id FROM caracteristicas_veiculos WHERE veiculo_id = $1', [veiculo.rows[0].id]);
        if (caracExistente3.rows.length === 0) {
          await db.query(`
            INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, banheiro, tv_dvd, poltronas_reclinaveis)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [veiculo.rows[0].id, true, true, true, true, true, true, true]);
        } else {
            await db.query(`
                UPDATE caracteristicas_veiculos 
                SET ar_condicionado = $1, wifi = $2, acessibilidade_pcd = $3, gps_rastreamento = $4, banheiro = $5, tv_dvd = $6, poltronas_reclinaveis = $7
                WHERE veiculo_id = $8
            `, [true, true, true, true, true, true, true, veiculo.rows[0].id]);
        }
      }
      
      const pacoteExistente = await db.query(`
        SELECT id FROM pacotes_excursao 
        WHERE usuario_id = $1 AND nome_pacote = $2
      `, [userId, 'Excursão Campos do Jordão']);
      
      if (pacoteExistente.rows.length === 0) {
        await db.query(`
          INSERT INTO pacotes_excursao (
            usuario_id, nome_pacote, destino, data_inicio, data_fim, duracao_dias,
            preco_por_pessoa, valor_por_pessoa, vagas_disponiveis, ativo,
            latitude_partida, longitude_partida, latitude_destino, longitude_destino,
            endereco_partida, endereco_destino
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
        userId, 'Excursão Campos do Jordão', 'Campos do Jordão - SP',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 dias
        new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // +9 dias
        2, 80.00, 80.00, 10, true,
        -23.5395, -46.6103, -22.7397, -45.5912,
        'Terminal Rodoviário Tietê, São Paulo', 'Centro de Campos do Jordão'
        ]);
      }
      
      try {
        await db.query(`
          INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
          VALUES ($1, $2, $3, $4, $5), ($1, $2, $3, $6, $5), ($1, $2, $6, $7, $5)
        `, [userId, userId, 5, 'Viagem incrível!', true, 'Super recomendo', 4, 'Ótimo passeio']);
      } catch (e) {}
      
      console.log('   ✅ Dados inseridos para Carlos Oliveira\n');
    }
    
    // ==========================================
    // 4. ANA COSTA - Excursão
    // ==========================================
    if (userMap['ana.costa.teste@email.com']) {
      const userId = userMap['ana.costa.teste@email.com'];
      console.log(`🔧 Inserindo dados para Ana Costa (ID: ${userId})...`);
      
      const veiculoExistente4 = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['JKL-3456']);
      if (veiculoExistente4.rows.length === 0) {
        await db.query(`
          INSERT INTO veiculos (motorista_id, placa, modelo, marca, capacidade, ano, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, 'JKL-3456', 'Intercity', 'Scania', 50, 2022, 'ativo']);
      } else {
        await db.query(`
          UPDATE veiculos SET marca = $1, modelo = $2 WHERE id = $3
        `, ['Scania', 'Intercity', veiculoExistente4.rows[0].id]);
      }
      
      const veiculo = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['JKL-3456']);
      if (veiculo.rows.length > 0) {
        const caracExistente4 = await db.query('SELECT veiculo_id FROM caracteristicas_veiculos WHERE veiculo_id = $1', [veiculo.rows[0].id]);
        if (caracExistente4.rows.length === 0) {
          await db.query(`
            INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, banheiro, tv_dvd, frigobar, poltronas_reclinaveis)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [veiculo.rows[0].id, true, true, false, true, true, true, true, true]);
        } else {
            await db.query(`
                UPDATE caracteristicas_veiculos 
                SET ar_condicionado = $1, wifi = $2, acessibilidade_pcd = $3, gps_rastreamento = $4, banheiro = $5, tv_dvd = $6, frigobar = $7, poltronas_reclinaveis = $8
                WHERE veiculo_id = $9
            `, [true, true, false, true, true, true, true, true, veiculo.rows[0].id]);
        }
      }
      
      const pacoteExistente2 = await db.query(`
        SELECT id FROM pacotes_excursao 
        WHERE usuario_id = $1 AND nome_pacote = $2
      `, [userId, 'Passeio Serra da Mantiqueira']);
      
      if (pacoteExistente2.rows.length === 0) {
        await db.query(`
          INSERT INTO pacotes_excursao (
            usuario_id, nome_pacote, destino, data_inicio, data_fim, duracao_dias,
            preco_por_pessoa, valor_por_pessoa, vagas_disponiveis, ativo,
            latitude_partida, longitude_partida, latitude_destino, longitude_destino,
            endereco_partida, endereco_destino
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
        userId, 'Passeio Serra da Mantiqueira', 'Monte Verde - MG',
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 dias
        new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // +16 dias
        2, 120.00, 120.00, 15, true,
        -23.5725, -46.6412, -22.8642, -46.0356,
        'Terminal Rodoviário Barra Funda, São Paulo', 'Centro de Monte Verde'
        ]);
      }
      
      try {
        await db.query(`
          INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
          VALUES ($1, $2, $3, $4, $5), ($1, $2, $6, $7, $5), ($1, $2, $3, $8, $5)
        `, [userId, userId, 5, 'Excelente experiência', true, 4, 'Muito bom', 'Recomendo!']);
      } catch (e) {}
      
      console.log('   ✅ Dados inseridos para Ana Costa\n');
    }
    
    // ==========================================
    // 5. PEDRO ALVES - Misto (Escolar + Excursão)
    // ==========================================
    if (userMap['pedro.alves.teste@email.com']) {
      const userId = userMap['pedro.alves.teste@email.com'];
      console.log(`🔧 Inserindo dados para Pedro Alves (ID: ${userId})...`);
      
      const veiculoExistente5 = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['MNO-7890']);
      if (veiculoExistente5.rows.length === 0) {
        await db.query(`
          INSERT INTO veiculos (motorista_id, placa, modelo, marca, capacidade, ano, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, 'MNO-7890', 'Daily', 'Iveco', 30, 2020, 'ativo']);
      } else {
        await db.query(`
          UPDATE veiculos SET marca = $1, modelo = $2 WHERE id = $3
        `, ['Iveco', 'Daily', veiculoExistente5.rows[0].id]);
      }
      
      const veiculo = await db.query('SELECT id FROM veiculos WHERE placa = $1', ['MNO-7890']);
      if (veiculo.rows.length > 0) {
        const caracExistente5 = await db.query('SELECT veiculo_id FROM caracteristicas_veiculos WHERE veiculo_id = $1', [veiculo.rows[0].id]);
        if (caracExistente5.rows.length === 0) {
          await db.query(`
            INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento)
            VALUES ($1, $2, $3, $4, $5)
          `, [veiculo.rows[0].id, true, true, true, true]);
        } else {
            await db.query(`
                UPDATE caracteristicas_veiculos 
                SET ar_condicionado = $1, wifi = $2, acessibilidade_pcd = $3, gps_rastreamento = $4
                WHERE veiculo_id = $5
            `, [true, true, true, true, veiculo.rows[0].id]);
        }
      }
      
      // Rota Escolar
      const rotaExistente3 = await db.query(`
        SELECT id FROM rotas_escolares 
        WHERE usuario_id = $1 AND nome_rota = $2
      `, [userId, 'Rota Jardins - Zona Oeste']);
      
      if (rotaExistente3.rows.length === 0) {
        await db.query(`
          INSERT INTO rotas_escolares (
            usuario_id, nome_rota, escola_destino, turno, horario_ida, horario_volta,
            valor_mensal, preco_mensal, vagas_disponiveis, ativa, status_rota,
            latitude_origem, longitude_origem, latitude_destino, longitude_destino,
            endereco_origem, endereco_destino, capacidade_maxima, capacidade_atual
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
        userId, 'Rota Jardins - Zona Oeste', 'Escola Internacional', 'Manhã',
        '07:30', '12:30', 200.00, 200.00, 8, true, 'ativa',
        -23.5635, -46.6700, -23.5505, -46.6333,
        'Rua Oscar Freire, 200, Jardins', 'Av. Brigadeiro Faria Lima, 2000, Itaim Bibi',
        30, 22
        ]);
      }
      
      // Pacote Excursão
      const pacoteExistente3 = await db.query(`
        SELECT id FROM pacotes_excursao 
        WHERE usuario_id = $1 AND nome_pacote = $2
      `, [userId, 'City Tour São Paulo']);
      
      if (pacoteExistente3.rows.length === 0) {
        await db.query(`
          INSERT INTO pacotes_excursao (
            usuario_id, nome_pacote, destino, data_inicio, data_fim, duracao_dias,
            preco_por_pessoa, valor_por_pessoa, vagas_disponiveis, ativo,
            latitude_partida, longitude_partida, latitude_destino, longitude_destino,
            endereco_partida, endereco_destino
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
        userId, 'City Tour São Paulo', 'Centro Histórico de São Paulo',
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 dias
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 dias
        1, 50.00, 50.00, 20, true,
        -23.5635, -46.6700, -23.5505, -46.6333,
        'Rua Oscar Freire, 200, Jardins', 'Praça da Sé, Centro'
        ]);
      }
      
      try {
        await db.query(`
          INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
          VALUES ($1, $2, $3, $4, $5), ($1, $2, $3, $6, $5)
        `, [userId, userId, 5, 'Serviço completo!', true, 'Muito profissional']);
      } catch (e) {}
      
      console.log('   ✅ Dados inseridos para Pedro Alves\n');
    }
    
    // Verificação final
    console.log('📊 Verificação final:\n');
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
    
    console.log(`  🚗 Veículos: ${veiculos.rows[0].total}`);
    console.log(`  🚌 Rotas Escolares: ${rotas.rows[0].total}`);
    console.log(`  🎒 Pacotes Excursão: ${pacotes.rows[0].total}`);
    console.log('');
    console.log('✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function main() {
  try {
    await inserirDados();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();

