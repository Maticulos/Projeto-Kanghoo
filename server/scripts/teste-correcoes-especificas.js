const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Dados de teste
const testUser = {
    email: 'teste@exemplo.com',
    senha: '123456'
};

async function testarCorrecoes() {
    console.log('🔧 TESTANDO CORREÇÕES ESPECÍFICAS');
    console.log('Servidor:', BASE_URL);
    console.log('');

    let token = null;
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
            if (detalhes) console.log(`  ${detalhes}`);
        }
        testResults.tests.push({ nome, sucesso, detalhes });
    }

    try {
        // 1. Login para obter token
        console.log('=== AUTENTICAÇÃO ===');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, testUser);
            token = loginResponse.data.token;
            registrarTeste('Login de usuário', true);
        } catch (error) {
            registrarTeste('Login de usuário', false, `Status: ${error.response?.status}, ${error.message}`);
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Testar perfil do usuário (correção da coluna atualizado_em)
        console.log('\n=== TESTE PERFIL DO USUÁRIO (Correção coluna atualizado_em) ===');
        try {
            const perfilResponse = await axios.get(`${BASE_URL}/api/auth/perfil`, { headers });
            const perfil = perfilResponse.data;
            
            // Verificar se o perfil foi retornado corretamente
            if (perfil && perfil.id && perfil.nome_completo && perfil.email) {
                registrarTeste('Buscar perfil do usuário', true, `ID: ${perfil.id}, Nome: ${perfil.nome_completo}`);
            } else {
                registrarTeste('Buscar perfil do usuário', false, 'Dados do perfil incompletos');
            }
        } catch (error) {
            registrarTeste('Buscar perfil do usuário', false, `Status: ${error.response?.status}, ${error.message}`);
        }

        // 3. Testar listagem de rotas escolares (correção da view vw_rotas_completas)
        console.log('\n=== TESTE ROTAS ESCOLARES (Correção view vw_rotas_completas) ===');
        try {
            const rotasResponse = await axios.get(`${BASE_URL}/api/rotas-escolares`, { headers });
            const rotas = rotasResponse.data;
            
            if (rotas && Array.isArray(rotas.rotas)) {
                registrarTeste('Listar rotas escolares', true, `${rotas.rotas.length} rotas encontradas`);
            } else {
                registrarTeste('Listar rotas escolares', false, 'Formato de resposta inválido');
            }
        } catch (error) {
            registrarTeste('Listar rotas escolares', false, `Status: ${error.response?.status}, ${error.message}`);
        }

        // 4. Testar busca de rota específica
        console.log('\n=== TESTE BUSCA ROTA ESPECÍFICA ===');
        try {
            // Primeiro, vamos buscar uma rota existente
            const rotasResponse = await axios.get(`${BASE_URL}/api/rotas-escolares`, { headers });
            if (rotasResponse.data.rotas && rotasResponse.data.rotas.length > 0) {
                const primeiraRota = rotasResponse.data.rotas[0];
                const rotaResponse = await axios.get(`${BASE_URL}/api/rotas-escolares/${primeiraRota.id}`, { headers });
                
                if (rotaResponse.data && rotaResponse.data.id) {
                    registrarTeste('Buscar rota específica', true, `Rota ID: ${rotaResponse.data.id}`);
                } else {
                    registrarTeste('Buscar rota específica', false, 'Dados da rota incompletos');
                }
            } else {
                registrarTeste('Buscar rota específica', false, 'Nenhuma rota disponível para teste');
            }
        } catch (error) {
            registrarTeste('Buscar rota específica', false, `Status: ${error.response?.status}, ${error.message}`);
        }

        // 5. Testar dashboard (que usa perfil do usuário)
        console.log('\n=== TESTE DASHBOARD (Usa perfil do usuário) ===');
        try {
            const dashboardResponse = await axios.get(`${BASE_URL}/api/responsavel/dashboard`, { headers });
            const dashboard = dashboardResponse.data;
            
            if (dashboard && typeof dashboard === 'object') {
                registrarTeste('Dashboard responsável', true, 'Dashboard carregado com sucesso');
            } else {
                registrarTeste('Dashboard responsável', false, 'Dados do dashboard inválidos');
            }
        } catch (error) {
            registrarTeste('Dashboard responsável', false, `Status: ${error.response?.status}, ${error.message}`);
        }

    } catch (error) {
        console.error('Erro geral nos testes:', error.message);
    }

    // Resumo final
    console.log('\n=== RESUMO DAS CORREÇÕES ===');
    console.log(`Total de testes: ${testResults.total}`);
    console.log(`Testes aprovados: ${testResults.passed}`);
    console.log(`Testes falharam: ${testResults.failed}`);
    console.log(`Taxa de sucesso: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

    if (testResults.failed === 0) {
        console.log('\n🎉 Todas as correções foram aplicadas com sucesso!');
    } else {
        console.log('\n⚠️  Algumas correções ainda precisam de atenção.');
    }

    // Salvar resultados
    const fs = require('fs');
    const path = require('path');
    const resultadosPath = path.join(__dirname, 'resultados-correcoes.json');
    fs.writeFileSync(resultadosPath, JSON.stringify(testResults, null, 2));
    console.log(`\nResultados salvos em: ${resultadosPath}`);
}

// Executar testes
testarCorrecoes().catch(console.error);