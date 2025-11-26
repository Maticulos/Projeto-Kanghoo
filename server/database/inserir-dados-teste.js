const db = require('../config/db');

async function inserirDadosTeste() {
  try {
    console.log('Inserindo dados de teste para demonstração...');

    // Motorista demo
    const motorista = await db.query(
      `INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario, tipo_cadastro, celular, endereco_completo, criado_em)
       VALUES ('Motorista Demo', 'motorista.demo@kanghoo.com', 'hash_fake', 'motorista_escolar', 'motorista_escolar', '(11) 90000-0001', 'Rua Demo, 123', NOW())
       ON CONFLICT (email) DO UPDATE SET nome_completo=EXCLUDED.nome_completo
       RETURNING id`
    );
    const motoristaId = motorista.rows[0].id;

    // Rotas demo (manhã e tarde)
    const rota1 = await db.query(
      `INSERT INTO rotas (motorista_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativo, criado_em)
       VALUES ($1, 'Rota Demo Manhã', 'Rota criada pelo seed', '07:00', '12:00', 'seg-sex', true, NOW())
       ON CONFLICT DO NOTHING RETURNING id`,
      [motoristaId]
    );
    const rota2 = await db.query(
      `INSERT INTO rotas (motorista_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativo, criado_em)
       VALUES ($1, 'Rota Demo Tarde', 'Rota criada pelo seed', '13:00', '18:00', 'seg-sex', true, NOW())
       ON CONFLICT DO NOTHING RETURNING id`,
      [motoristaId]
    );
    const rotaId1 =
      rota1.rows[0]?.id ||
      (await db.query('SELECT id FROM rotas WHERE motorista_id=$1 AND nome_rota=$2 LIMIT 1', [motoristaId, 'Rota Demo Manhã']))
        .rows[0].id;
    const rotaId2 =
      rota2.rows[0]?.id ||
      (await db.query('SELECT id FROM rotas WHERE motorista_id=$1 AND nome_rota=$2 LIMIT 1', [motoristaId, 'Rota Demo Tarde']))
        .rows[0].id;

    // Responsáveis demo
    const respA = await db.query(
      `INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario, tipo_cadastro, celular, endereco_completo, criado_em)
       VALUES ('Ana Responsável', 'ana.resp@demo.com', 'hash_fake', 'responsavel', 'responsavel', '(11) 95555-0001', 'Av. Central, 100', NOW())
       ON CONFLICT (email) DO UPDATE SET nome_completo=EXCLUDED.nome_completo
       RETURNING id`
    );
    const respB = await db.query(
      `INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario, tipo_cadastro, celular, endereco_completo, criado_em)
       VALUES ('Bruno Responsável', 'bruno.resp@demo.com', 'hash_fake', 'responsavel', 'responsavel', '(11) 95555-0002', 'Rua das Flores, 50', NOW())
       ON CONFLICT (email) DO UPDATE SET nome_completo=EXCLUDED.nome_completo
       RETURNING id`
    );

    // Status ativos
    await db.query(
      `INSERT INTO usuarios_status (usuario_id, tipo_usuario, ativo, origem, criado_em, atualizado_em)
       VALUES ($1, 'responsavel', true, 'seed', NOW(), NOW())
       ON CONFLICT (usuario_id) DO UPDATE SET ativo=EXCLUDED.ativo, origem='seed'`,
      [respA.rows[0].id]
    );
    await db.query(
      `INSERT INTO usuarios_status (usuario_id, tipo_usuario, ativo, origem, criado_em, atualizado_em)
       VALUES ($1, 'responsavel', true, 'seed', NOW(), NOW())
       ON CONFLICT (usuario_id) DO UPDATE SET ativo=EXCLUDED.ativo, origem='seed'`,
      [respB.rows[0].id]
    );
    await db.query(
      `INSERT INTO usuarios_status (usuario_id, tipo_usuario, ativo, origem, criado_em, atualizado_em)
       VALUES ($1, 'motorista_escolar', true, 'seed', NOW(), NOW())
       ON CONFLICT (usuario_id) DO UPDATE SET ativo=EXCLUDED.ativo, origem='seed'`,
      [motoristaId]
    );

    // Crianças demo
    await db.query(
      `INSERT INTO criancas (nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, rota_id, ativo, criado_em, atualizado_em)
       VALUES 
       ('Lucas Demo', '2015-02-10', 'Rua Demo, 123', 'Escola Azul', 'Av Escola, 10', $1, $2, $3, true, NOW(), NOW()),
       ('Marina Demo', '2014-07-22', 'Av. Central, 100', 'Escola Azul', 'Av Escola, 10', $1, $2, $3, true, NOW(), NOW()),
       ('Pedro Demo', '2013-05-18', 'Rua das Flores, 50', 'Escola Verde', 'Rua Escola, 5', $4, $2, $5, true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [respA.rows[0].id, motoristaId, rotaId1, respB.rows[0].id, rotaId2]
    );

    console.log('✅ Motorista, rotas, responsáveis e crianças demo criados/atualizados.');

    // Resumo rápido
    const result = await db.query(`
      SELECT 'usuarios' as tabela, COUNT(*) as total FROM usuarios
      UNION ALL SELECT 'usuarios_status', COUNT(*) FROM usuarios_status
      UNION ALL SELECT 'rotas', COUNT(*) FROM rotas
      UNION ALL SELECT 'criancas', COUNT(*) FROM criancas
    `);
    console.table(result.rows);
    console.log('\n🎯 Dados de teste inseridos com sucesso!');
  } catch (error) {
    console.error('🚨 Erro ao inserir dados:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

inserirDadosTeste();
