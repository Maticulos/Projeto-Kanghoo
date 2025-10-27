/**
 * Script de Teste Automatizado para APIs - Ambiente de Produção
 * 
 * Este script testa todas as APIs do sistema para garantir que estão funcionando
 * corretamente no ambiente de produção/teste.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurações
const BASE_URL = 'http://localhost:3001';
const TEST_RESULTS_FILE = path.join(__dirname, 'resultados-teste-apis.json');

// Cores para output no console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Dados de teste
const testData = {
    // Usuários de teste
    usuarios: {
        motoristaBasic: {
            email: 'joao.silva@teste.com',
            senha: 'senha123456',
            nome: 'João Silva',
            telefone: '(11) 99999-9999',
            plano: 'basic'
        },
        motoristaPremium: {
            email: 'motorista.premium@teste.com',
            senha: 'TestePremium123!',
            nome: 'Maria Santos',
            telefone: '11888776655',
            plano: 'premium'
        },
        responsavel: {
            email: 'responsavel@teste.com',
            senha: 'TesteResp123!',
            nome: 'Ana Costa',
            telefone: '11777665544'
        }
    },
    // Dados para testes
    crianca: {
        nome: 'Pedro Teste',
        idade: 8,
        escola: 'Escola Municipal Teste',
        endereco: 'Rua Teste, 123',
        telefone_emergencia: '11666554433'
    },
    rota: {
        nome: 'Rota Teste Automatizado',
        origem: 'Escola Municipal Teste',
        destino: 'Bairro Residencial',
        horario_inicio: '07:00',
        horario_fim: '08:00',
        pontos: [
            { lat: -23.5505, lng: -46.6333, nome: 'Ponto 1' },
            { lat: -23.5515, lng: -46.6343, nome: 'Ponto 2' }
        ]
    },
    veiculo: {
        placa: 'TST1234',
        modelo: 'Van Teste',
        capacidade: 15
    }
};

// Resultados dos testes
let testResults = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    tests: []
};

// Tokens de autenticação
let authTokens = {};

/**
 * Função para fazer requisições HTTP
 */
async function makeRequest(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return {
            success: true,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 0,
            error: error.response?.data || error.message
        };
    }
}

/**
 * Função para registrar resultado do teste
 */
function logTestResult(testName, success, details = {}) {
    testResults.totalTests++;
    if (success) {
        testResults.passedTests++;
        console.log(`${colors.green}✓${colors.reset} ${testName}`);
    } else {
        testResults.failedTests++;
        console.log(`${colors.red}✗${colors.reset} ${testName}`);
        if (details.error) {
            console.log(`  ${colors.red}Erro: ${details.error}${colors.reset}`);
        }
    }

    testResults.tests.push({
        name: testName,
        success,
        timestamp: new Date().toISOString(),
        details
    });
}

/**
 * Testes de Autenticação
 */
async function testAuthentication() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE AUTENTICAÇÃO ===${colors.reset}`);

    // Teste de registro de usuário
    const registerData = {
        nomeCompleto: testData.usuarios.motoristaBasic.nome,
        email: testData.usuarios.motoristaBasic.email,
        senha: testData.usuarios.motoristaBasic.senha,
        celular: testData.usuarios.motoristaBasic.telefone,
        tipoCadastro: 'motorista_escolar'
    };
    const registerResult = await makeRequest('POST', '/cadastrar', registerData);
    if (!registerResult.success) {
        console.log(`  ${colors.red}Erro no registro: Status ${registerResult.status}, ${JSON.stringify(registerResult.error)}${colors.reset}`);
    }
    logTestResult('Registro de usuário', registerResult.success);

    // Teste de login
    const loginResult = await makeRequest('POST', '/login', {
        email: testData.usuarios.motoristaBasic.email,
        senha: testData.usuarios.motoristaBasic.senha
    });
    if (!loginResult.success) {
        console.log(`  ${colors.red}Erro no login: Status ${loginResult.status}, ${JSON.stringify(loginResult.error)}${colors.reset}`);
    }
    logTestResult('Login de usuário', loginResult.success);

    if (loginResult.success && loginResult.data && loginResult.data.token) {
        authTokens.motoristaBasic = loginResult.data.token;
    }

    // Teste de verificação de token
    if (authTokens.motoristaBasic) {
        const verifyResult = await makeRequest('POST', '/api/validate-token', null, authTokens.motoristaBasic);
        logTestResult('Verificação de token', verifyResult.success);
    }
}

/**
 * Testes de Planos e Assinaturas
 */
async function testPlansAndSubscriptions() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE PLANOS E ASSINATURAS ===${colors.reset}`);

    // Listar planos disponíveis
    const plansResult = await makeRequest('GET', '/api/planos-assinatura/tipos');
    if (!plansResult.success) {
        console.log(`  ${colors.red}Erro ao listar planos: Status ${plansResult.status}, ${JSON.stringify(plansResult.error)}${colors.reset}`);
    }
    logTestResult('Listar planos disponíveis', plansResult.success);

    // Ativar plano (requer autenticação)
    if (authTokens.motoristaBasic) {
        const activateResult = await makeRequest('POST', '/api/planos-assinatura/ativar', {
            tipo_plano: 'basico'
        }, authTokens.motoristaBasic);
        if (!activateResult.success) {
            console.log(`  ${colors.red}Erro ao ativar plano: Status ${activateResult.status}, ${JSON.stringify(activateResult.error)}${colors.reset}`);
        }
        logTestResult('Ativar plano Basic', activateResult.success);
    }

    // Verificar status da assinatura
    if (authTokens.motoristaBasic) {
        const statusResult = await makeRequest('GET', '/api/planos-assinatura/meu-plano', null, authTokens.motoristaBasic);
        if (!statusResult.success) {
            console.log(`  ${colors.red}Erro ao verificar status: Status ${statusResult.status}, ${JSON.stringify(statusResult.error)}${colors.reset}`);
        }
        logTestResult('Verificar status da assinatura', statusResult.success);
    }
}

/**
 * Testes de Rotas Escolares
 */
async function testSchoolRoutes() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE ROTAS ESCOLARES ===${colors.reset}`);

    if (!authTokens.motoristaBasic) return;

    // Criar rota escolar
    const createRouteResult = await makeRequest('POST', '/api/rotas-escolares', testData.rota, authTokens.motoristaBasic);
    logTestResult('Criar rota escolar', createRouteResult.success);

    let routeId = null;
    if (createRouteResult.success && createRouteResult.data.id) {
        routeId = createRouteResult.data.id;
    }

    // Listar rotas
    const listRoutesResult = await makeRequest('GET', '/api/rotas-escolares', null, authTokens.motoristaBasic);
    logTestResult('Listar rotas escolares', listRoutesResult.success);

    // Buscar rota específica
    if (routeId) {
        const getRouteResult = await makeRequest('GET', `/api/rotas-escolares/${routeId}`, null, authTokens.motoristaBasic);
        logTestResult('Buscar rota específica', getRouteResult.success);

        // Atualizar rota
        const updateRouteResult = await makeRequest('PUT', `/api/rotas-escolares/${routeId}`, {
            ...testData.rota,
            nome: 'Rota Teste Atualizada'
        }, authTokens.motoristaBasic);
        logTestResult('Atualizar rota escolar', updateRouteResult.success);
    }
}

/**
 * Testes de Rastreamento GPS
 */
async function testGPSTracking() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE RASTREAMENTO GPS ===${colors.reset}`);

    // Verificar status do serviço GPS
    const statusResult = await makeRequest('GET', '/api/gps/status');
    logTestResult('Verificar status do GPS', statusResult.success);

    // Simular posição GPS
    const simulateResult = await makeRequest('POST', '/api/gps/simulate-position', {
        vehicleId: 'TESTE-001',
        route: [
            { lat: -23.5505, lng: -46.6333 },
            { lat: -23.5515, lng: -46.6343 }
        ],
        speed: 30
    });
    logTestResult('Simular posição GPS', simulateResult.success);

    // Buscar posições de veículo
    const positionsResult = await makeRequest('GET', '/api/gps/vehicle/TESTE-001/positions');
    logTestResult('Buscar posições do veículo', positionsResult.success);
}

/**
 * Testes de Google Maps
 */
async function testGoogleMaps() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE GOOGLE MAPS ===${colors.reset}`);

    // Configuração do Google Maps
    const configResult = await makeRequest('GET', '/api/maps/config');
    logTestResult('Configuração do Google Maps', configResult.success);

    // Geocodificação
    const geocodeResult = await makeRequest('GET', '/api/maps/geocode?address=São Paulo, SP');
    logTestResult('Geocodificação de endereço', geocodeResult.success);

    // Cálculo de rota
    const routeResult = await makeRequest('POST', '/api/maps/route', {
        origin: 'São Paulo, SP',
        destination: 'Campinas, SP',
        waypoints: []
    });
    logTestResult('Cálculo de rota', routeResult.success);
}

/**
 * Testes de Cadastro de Crianças
 */
async function testChildrenRegistration() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE CADASTRO DE CRIANÇAS ===${colors.reset}`);

    if (!authTokens.motoristaBasic) return;

    // Cadastrar criança
    const registerChildResult = await makeRequest('POST', '/api/cadastro-criancas', testData.crianca, authTokens.motoristaBasic);
    logTestResult('Cadastrar criança', registerChildResult.success);

    let childId = null;
    if (registerChildResult.success && registerChildResult.data.id) {
        childId = registerChildResult.data.id;
    }

    // Listar crianças
    const listChildrenResult = await makeRequest('GET', '/api/cadastro-criancas', null, authTokens.motoristaBasic);
    logTestResult('Listar crianças cadastradas', listChildrenResult.success);

    // Buscar criança específica
    if (childId) {
        const getChildResult = await makeRequest('GET', `/api/cadastro-criancas/${childId}`, null, authTokens.motoristaBasic);
        logTestResult('Buscar criança específica', getChildResult.success);
    }
}

/**
 * Testes de Conferência de Crianças
 */
async function testChildrenConference() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE CONFERÊNCIA DE CRIANÇAS ===${colors.reset}`);

    if (!authTokens.motoristaBasic) return;

    // Iniciar conferência
    const startConferenceResult = await makeRequest('POST', '/api/conferencia/iniciar', {
        rota_id: 1,
        veiculo_id: 1
    }, authTokens.motoristaBasic);
    logTestResult('Iniciar conferência', startConferenceResult.success);

    // Listar conferências ativas
    const activeConferencesResult = await makeRequest('GET', '/api/conferencia/ativas', null, authTokens.motoristaBasic);
    logTestResult('Listar conferências ativas', activeConferencesResult.success);
}

/**
 * Testes de Notificações
 */
async function testNotifications() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE NOTIFICAÇÕES ===${colors.reset}`);

    if (!authTokens.motoristaBasic) return;

    // Buscar preferências de notificação
    const preferencesResult = await makeRequest('GET', '/api/notification-preferences', null, authTokens.motoristaBasic);
    logTestResult('Buscar preferências de notificação', preferencesResult.success);

    // Atualizar preferências
    const updatePreferencesResult = await makeRequest('PUT', '/api/notification-preferences', {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true
    }, authTokens.motoristaBasic);
    logTestResult('Atualizar preferências de notificação', updatePreferencesResult.success);
}

/**
 * Testes de WebSocket
 */
async function testWebSocket() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE WEBSOCKET ===${colors.reset}`);

    // Verificar se o servidor WebSocket está rodando
    try {
        const WebSocket = require('ws');
        const ws = new WebSocket('ws://localhost:3001');
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout na conexão WebSocket'));
            }, 5000);

            ws.on('open', () => {
                clearTimeout(timeout);
                logTestResult('Conexão WebSocket', true);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                logTestResult('Conexão WebSocket', false, { error: error.message });
                reject(error);
            });
        });
    } catch (error) {
        logTestResult('Conexão WebSocket', false, { error: error.message });
    }
}

/**
 * Função principal para executar todos os testes
 */
async function runAllTests() {
    console.log(`${colors.bold}${colors.yellow}🚀 INICIANDO TESTES AUTOMATIZADOS DAS APIS${colors.reset}`);
    console.log(`${colors.yellow}Servidor: ${BASE_URL}${colors.reset}\n`);

    try {
        await testAuthentication();
        await testPlansAndSubscriptions();
        await testSchoolRoutes();
        await testGPSTracking();
        await testGoogleMaps();
        await testChildrenRegistration();
        await testChildrenConference();
        await testNotifications();
        await testWebSocket();

        // Salvar resultados
        fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));

        // Resumo final
        console.log(`\n${colors.bold}${colors.yellow}=== RESUMO DOS TESTES ===${colors.reset}`);
        console.log(`Total de testes: ${testResults.totalTests}`);
        console.log(`${colors.green}Testes aprovados: ${testResults.passedTests}${colors.reset}`);
        console.log(`${colors.red}Testes falharam: ${testResults.failedTests}${colors.reset}`);
        
        const successRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(2);
        console.log(`Taxa de sucesso: ${successRate}%`);

        if (testResults.failedTests === 0) {
            console.log(`\n${colors.green}${colors.bold}🎉 TODOS OS TESTES PASSARAM!${colors.reset}`);
        } else {
            console.log(`\n${colors.yellow}⚠️  Alguns testes falharam. Verifique os detalhes acima.${colors.reset}`);
        }

        console.log(`\nResultados salvos em: ${TEST_RESULTS_FILE}`);

    } catch (error) {
        console.error(`${colors.red}Erro durante a execução dos testes: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

/**
 * Função para executar testes específicos
 */
async function runSpecificTests(testNames) {
    const availableTests = {
        'auth': testAuthentication,
        'plans': testPlansAndSubscriptions,
        'routes': testSchoolRoutes,
        'gps': testGPSTracking,
        'maps': testGoogleMaps,
        'children': testChildrenRegistration,
        'conference': testChildrenConference,
        'notifications': testNotifications,
        'websocket': testWebSocket
    };

    console.log(`${colors.bold}${colors.yellow}🚀 EXECUTANDO TESTES ESPECÍFICOS${colors.reset}\n`);

    for (const testName of testNames) {
        if (availableTests[testName]) {
            await availableTests[testName]();
        } else {
            console.log(`${colors.red}Teste '${testName}' não encontrado${colors.reset}`);
        }
    }

    // Salvar resultados
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    console.log(`\nResultados salvos em: ${TEST_RESULTS_FILE}`);
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);
if (args.length > 0) {
    runSpecificTests(args);
} else {
    runAllTests();
}

module.exports = {
    runAllTests,
    runSpecificTests,
    testResults
};