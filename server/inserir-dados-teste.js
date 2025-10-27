const db = require('./config/db');

async function inserirDadosTeste() {
  try {
    console.log('Inserindo dados de teste...');
    
    // Inserir algumas assinaturas de teste para usuários existentes
    const assinaturasQuery = `
      INSERT INTO assinaturas (usuario_id, plano_id, status, data_inicio, data_vencimento, valor)
      SELECT 
        u.id,
        1,
        'ativa',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        29.90
      FROM usuarios u 
      WHERE u.tipo_usuario = 'responsavel'
      LIMIT 3
      ON CONFLICT (usuario_id) DO NOTHING;
    `;
    
    await db.query(assinaturasQuery);
    console.log('✅ Assinaturas de teste inseridas');
    
    // Inserir algumas rotas escolares de teste
    const rotasQuery = `
      INSERT INTO rotas_escolares (usuario_id, nome, origem, destino, horario_ida, horario_volta)
      SELECT 
        u.id,
        'Rota ' || u.nome_completo,
        'Centro da Cidade',
        'Escola Municipal',
        '07:00',
        '17:30'
      FROM usuarios u 
      WHERE u.tipo_usuario = 'motorista'
      LIMIT 2
      ON CONFLICT DO NOTHING;
    `;
    
    await db.query(rotasQuery);
    console.log('✅ Rotas escolares de teste inseridas');
    
    // Verificar dados inseridos
    const verificarQuery = `
      SELECT 
        'assinaturas' as tabela,
        COUNT(*) as total
      FROM assinaturas
      UNION ALL
      SELECT 
        'rotas_escolares' as tabela,
        COUNT(*) as total
      FROM rotas_escolares
      UNION ALL
      SELECT 
        'notificacoes' as tabela,
        COUNT(*) as total
      FROM notificacoes
      UNION ALL
      SELECT 
        'preferencias_notificacao' as tabela,
        COUNT(*) as total
      FROM preferencias_notificacao;
    `;
    
    const result = await db.query(verificarQuery);
    console.log('\nResumo das tabelas:');
    console.table(result.rows);
    
    console.log('\n🎉 Dados de teste inseridos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

inserirDadosTeste();