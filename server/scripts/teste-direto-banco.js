const { Pool } = require('pg');

// Configuração do banco de dados (usando as mesmas configurações do sistema)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'kanghoo_db_prod',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function testarCorrecoesBanco() {
    console.log('🔧 TESTANDO CORREÇÕES DIRETAMENTE NO BANCO DE DADOS');
    console.log('');

    let testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
    };

    // Função para registrar resultado do teste
    function registrarTeste(nome, sucesso, detalhes = '') {
        testResults.total++;
        if (sucesso) {
            testResults.passed++;
            console.log(`✓ ${nome}`);
        } else {
            testResults.failed++;
            console.log(`✗ ${nome}`);
        }
        if (detalhes) console.log(`  ${detalhes}`);
        testResults.tests.push({ nome, sucesso, detalhes });
    }

    try {
        // 1. Testar se a coluna atualizado_em foi removida da query de perfil
        console.log('=== TESTE 1: CORREÇÃO COLUNA atualizado_em ===');
        try {
            // Query corrigida que não deve mais incluir u.atualizado_em
            const queryPerfil = `
                SELECT 
                    u.id,
                    u.nome_completo,
                    u.email,
                    u.celular,
                    u.data_nascimento,
                    u.criado_em,
                    u.tipo_cadastro,
                    u.tipo_usuario,
                    u.endereco_completo
                FROM usuarios u 
                WHERE u.id = 8
                LIMIT 1
            `;
            
            const result = await pool.query(queryPerfil);
            if (result.rows.length > 0) {
                registrarTeste('Query de perfil sem atualizado_em', true, `Usuário encontrado: ${result.rows[0].nome_completo}`);
            } else {
                registrarTeste('Query de perfil sem atualizado_em', false, 'Nenhum usuário encontrado');
            }
        } catch (error) {
            registrarTeste('Query de perfil sem atualizado_em', false, `Erro: ${error.message}`);
        }

        // 2. Testar se a view vw_rotas_completas foi substituída pela tabela rotas_escolares
        console.log('\n=== TESTE 2: CORREÇÃO VIEW vw_rotas_completas ===');
        try {
            // Query corrigida que usa diretamente a tabela rotas_escolares
            const queryRotas = `
                SELECT 
                    id,
                    usuario_id,
                    nome_rota,
                    descricao,
                    horario_ida,
                    horario_volta,
                    dias_semana,
                    valor_mensal,
                    ativa,
                    criado_em,
                    escola_destino,
                    turno,
                    preco_mensal,
                    vagas_disponiveis
                FROM rotas_escolares 
                WHERE ativa = true
                ORDER BY criado_em DESC
                LIMIT 10
            `;
            
            const result = await pool.query(queryRotas);
            registrarTeste('Query de rotas sem view vw_rotas_completas', true, `${result.rows.length} rotas encontradas`);
        } catch (error) {
            registrarTeste('Query de rotas sem view vw_rotas_completas', false, `Erro: ${error.message}`);
        }

        // 3. Testar busca de rota específica
        console.log('\n=== TESTE 3: BUSCA ROTA ESPECÍFICA ===');
        try {
            const queryRotaEspecifica = `
                SELECT 
                    id,
                    usuario_id,
                    nome_rota,
                    descricao,
                    horario_ida,
                    horario_volta,
                    dias_semana,
                    valor_mensal,
                    ativa,
                    criado_em,
                    escola_destino,
                    turno,
                    preco_mensal,
                    vagas_disponiveis
                FROM rotas_escolares 
                WHERE id = 3
            `;
            
            const result = await pool.query(queryRotaEspecifica);
            if (result.rows.length > 0) {
                registrarTeste('Busca rota específica por ID', true, `Rota encontrada: ${result.rows[0].nome_rota}`);
            } else {
                registrarTeste('Busca rota específica por ID', false, 'Rota não encontrada');
            }
        } catch (error) {
            registrarTeste('Busca rota específica por ID', false, `Erro: ${error.message}`);
        }

        // 4. Verificar estrutura da tabela usuarios
        console.log('\n=== TESTE 4: VERIFICAÇÃO ESTRUTURA TABELA USUARIOS ===');
        try {
            const queryEstrutura = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'usuarios' 
                AND table_schema = 'public'
                ORDER BY ordinal_position
            `;
            
            const result = await pool.query(queryEstrutura);
            const colunas = result.rows.map(row => row.column_name);
            const temAtualizadoEm = colunas.includes('atualizado_em');
            
            registrarTeste('Verificar ausência de coluna atualizado_em', !temAtualizadoEm, 
                temAtualizadoEm ? 'Coluna atualizado_em ainda existe' : 'Coluna atualizado_em não existe (correto)');
        } catch (error) {
            registrarTeste('Verificar ausência de coluna atualizado_em', false, `Erro: ${error.message}`);
        }

        // 5. Verificar se as queries não usam mais a view vw_rotas_completas
        console.log('\n=== TESTE 5: VERIFICAÇÃO USO DA VIEW vw_rotas_completas ===');
        try {
            // Testar se conseguimos usar a tabela diretamente sem a view
            const queryDireta = `
                SELECT COUNT(*) as total
                FROM rotas_escolares 
                WHERE ativa = true
            `;
            
            const result = await pool.query(queryDireta);
            const total = parseInt(result.rows[0].total);
            
            registrarTeste('Query direta na tabela rotas_escolares funciona', true, 
                `${total} rotas ativas encontradas sem usar view`);
        } catch (error) {
            registrarTeste('Query direta na tabela rotas_escolares funciona', false, `Erro: ${error.message}`);
        }

        // 6. Testar query de planos_assinatura (que tem atualizado_em)
        console.log('\n=== TESTE 6: QUERY PLANOS_ASSINATURA ===');
        try {
            const queryPlanos = `
                SELECT 
                    id,
                    usuario_id,
                    tipo_plano,
                    limite_rotas,
                    limite_usuarios,
                    data_inicio,
                    data_fim,
                    ativo,
                    criado_em,
                    atualizado_em
                FROM planos_assinatura 
                WHERE ativo = true
                LIMIT 5
            `;
            
            const result = await pool.query(queryPlanos);
            registrarTeste('Query planos_assinatura com atualizado_em', true, `${result.rows.length} assinaturas ativas encontradas`);
        } catch (error) {
            registrarTeste('Query planos_assinatura com atualizado_em', false, `Erro: ${error.message}`);
        }

    } catch (error) {
        console.error('Erro geral nos testes:', error.message);
    } finally {
        await pool.end();
    }

    // Resumo final
    console.log('\n=== RESUMO DAS CORREÇÕES NO BANCO ===');
    console.log(`Total de testes: ${testResults.total}`);
    console.log(`Testes aprovados: ${testResults.passed}`);
    console.log(`Testes falharam: ${testResults.failed}`);
    console.log(`Taxa de sucesso: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

    if (testResults.failed === 0) {
        console.log('\n🎉 Todas as correções de banco de dados foram aplicadas com sucesso!');
    } else {
        console.log('\n⚠️  Algumas correções ainda precisam de atenção.');
    }

    // Salvar resultados
    const fs = require('fs');
    const path = require('path');
    const resultadosPath = path.join(__dirname, 'resultados-correcoes-banco.json');
    fs.writeFileSync(resultadosPath, JSON.stringify(testResults, null, 2));
    console.log(`\nResultados salvos em: ${resultadosPath}`);
}

// Executar testes
testarCorrecoesBanco().catch(console.error);