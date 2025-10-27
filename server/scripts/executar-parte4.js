const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function executarParte4() {
  console.log('🚀 Iniciando PARTE 4: Tabelas Complementares...\n');
  
  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '../../database/parte4_tabelas_complementares.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executando script SQL da Parte 4...');
    
    // Executar o script SQL
    await db.query(sqlContent);
    
    console.log('✅ Script SQL executado com sucesso!\n');
    
    // Verificações
    console.log('🔍 Verificando criação das tabelas...\n');
    
    // 1. Verificar tabela interesses_rotas
    const interessesResult = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'interesses_rotas' 
      ORDER BY ordinal_position
    `);
    
    if (interessesResult.rows.length > 0) {
      console.log('✅ Tabela "interesses_rotas" criada com sucesso');
      console.log(`   - ${interessesResult.rows.length} colunas criadas`);
    } else {
      console.log('❌ Tabela "interesses_rotas" não foi criada');
    }
    
    // 2. Verificar tabela avaliacoes_rotas
    const avaliacoesResult = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'avaliacoes_rotas' 
      ORDER BY ordinal_position
    `);
    
    if (avaliacoesResult.rows.length > 0) {
      console.log('✅ Tabela "avaliacoes_rotas" criada com sucesso');
      console.log(`   - ${avaliacoesResult.rows.length} colunas criadas`);
    } else {
      console.log('❌ Tabela "avaliacoes_rotas" não foi criada');
    }
    
    // 3. Verificar tabela notificacoes
    const notificacoesResult = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notificacoes' 
      ORDER BY ordinal_position
    `);
    
    if (notificacoesResult.rows.length > 0) {
      console.log('✅ Tabela "notificacoes" criada com sucesso');
      console.log(`   - ${notificacoesResult.rows.length} colunas criadas`);
    } else {
      console.log('❌ Tabela "notificacoes" não foi criada');
    }
    
    // 4. Verificar tabela historico_rotas
    const historicoResult = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'historico_rotas' 
      ORDER BY ordinal_position
    `);
    
    if (historicoResult.rows.length > 0) {
      console.log('✅ Tabela "historico_rotas" criada com sucesso');
      console.log(`   - ${historicoResult.rows.length} colunas criadas`);
    } else {
      console.log('❌ Tabela "historico_rotas" não foi criada');
    }
    
    console.log('\n🔍 Verificando views criadas...\n');
    
    // 5. Verificar views
    const viewsResult = await db.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name IN ('vw_estatisticas_interesses', 'vw_ranking_rotas', 'vw_notificacoes_resumo')
      ORDER BY table_name
    `);
    
    console.log(`✅ ${viewsResult.rows.length} views criadas:`);
    viewsResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n🔍 Verificando funções criadas...\n');
    
    // 6. Verificar funções
    const funcoesResult = await db.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_type = 'FUNCTION' 
      AND routine_name IN ('criar_notificacao', 'registrar_historico_rota', 'notificar_novo_interesse', 'notificar_resposta_interesse')
      ORDER BY routine_name
    `);
    
    console.log(`✅ ${funcoesResult.rows.length} funções criadas:`);
    funcoesResult.rows.forEach(row => {
      console.log(`   - ${row.routine_name}`);
    });
    
    console.log('\n🔍 Verificando triggers criados...\n');
    
    // 7. Verificar triggers
    const triggersResult = await db.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%interesse%' OR trigger_name LIKE '%timestamp%'
      ORDER BY trigger_name
    `);
    
    console.log(`✅ ${triggersResult.rows.length} triggers relacionados criados:`);
    triggersResult.rows.forEach(row => {
      console.log(`   - ${row.trigger_name} (tabela: ${row.event_object_table})`);
    });
    
    console.log('\n🔍 Testando função de notificação...\n');
    
    // 8. Testar função de notificação (se houver usuários)
    const usuariosResult = await db.query(`
      SELECT id FROM usuarios WHERE tipo_usuario = 'motorista_escolar' LIMIT 1
    `);
    
    if (usuariosResult.rows.length > 0) {
      const usuarioId = usuariosResult.rows[0].id;
      
      const testeNotificacao = await db.query(`
        SELECT criar_notificacao($1, 'teste', 'Teste de Notificação', 'Esta é uma notificação de teste do sistema.') as notificacao_id
      `, [usuarioId]);
      
      if (testeNotificacao.rows[0].notificacao_id) {
        console.log('✅ Função de notificação testada com sucesso');
        console.log(`   - ID da notificação de teste: ${testeNotificacao.rows[0].notificacao_id}`);
        
        // Limpar notificação de teste
        await db.query(`DELETE FROM notificacoes WHERE id = $1`, [testeNotificacao.rows[0].notificacao_id]);
        console.log('   - Notificação de teste removida');
      } else {
        console.log('❌ Erro ao testar função de notificação');
      }
    } else {
      console.log('⚠️  Nenhum usuário motorista encontrado para testar notificação');
    }
    
    console.log('\n🎉 PARTE 4 concluída com sucesso!');
    console.log('\n📋 Resumo das tabelas complementares criadas:');
    console.log('   ✅ interesses_rotas - Para registrar interesses em rotas');
    console.log('   ✅ avaliacoes_rotas - Para avaliações de rotas');
    console.log('   ✅ notificacoes - Sistema de notificações');
    console.log('   ✅ historico_rotas - Auditoria de alterações');
    console.log('\n📊 Views especializadas:');
    console.log('   ✅ vw_estatisticas_interesses - Estatísticas de interesses');
    console.log('   ✅ vw_ranking_rotas - Ranking por avaliações');
    console.log('   ✅ vw_notificacoes_resumo - Resumo de notificações');
    console.log('\n🔧 Funcionalidades automáticas:');
    console.log('   ✅ Notificações automáticas para novos interesses');
    console.log('   ✅ Notificações automáticas para respostas');
    console.log('   ✅ Timestamps automáticos');
    console.log('   ✅ Funções auxiliares para notificações e histórico');
    
  } catch (error) {
    console.error('❌ Erro ao executar PARTE 4:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarParte4()
    .then(() => {
      console.log('\n✅ Processo concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro no processo:', error);
      process.exit(1);
    });
}

module.exports = { executarParte4 };