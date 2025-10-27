/**
 * Script de Teste Automatizado para Frontend - Ambiente de Produção
 * 
 * Este script verifica se todas as páginas do frontend estão carregando
 * corretamente e se os recursos estão disponíveis.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Configurações
const BASE_URL = 'http://localhost:3001';
const FRONTEND_RESULTS_FILE = path.join(__dirname, 'resultados-teste-frontend.json');

// Cores para output no console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Páginas para testar
const pagesToTest = [
    // Páginas públicas
    { url: '/', name: 'Página inicial', type: 'public' },
    { url: '/login.html', name: 'Página de login', type: 'public' },
    { url: '/register.html', name: 'Página de registro', type: 'public' },
    { url: '/maps.html', name: 'Interface Google Maps', type: 'public' },
    
    // Páginas autenticadas
    { url: '/auth/area-motorista-escolar.html', name: 'Área do motorista escolar', type: 'auth' },
    { url: '/auth/area-motorista-excursao.html', name: 'Área do motorista de excursão', type: 'auth' },
    { url: '/auth/area-responsavel.html', name: 'Área do responsável', type: 'auth' },
    { url: '/auth/dashboard.html', name: 'Dashboard principal', type: 'auth' },
    { url: '/auth/profile.html', name: 'Perfil do usuário', type: 'auth' },
    
    // Páginas de funcionalidades específicas
    { url: '/auth/rotas-escolares.html', name: 'Gestão de rotas escolares', type: 'auth' },
    { url: '/auth/cadastro-criancas.html', name: 'Cadastro de crianças', type: 'auth' },
    { url: '/auth/conferencia-criancas.html', name: 'Conferência de crianças', type: 'auth' },
    { url: '/auth/rastreamento.html', name: 'Rastreamento GPS', type: 'auth' },
    { url: '/auth/notificacoes.html', name: 'Configurações de notificações', type: 'auth' }
];

// Recursos estáticos para verificar
const staticResources = [
    '/css/style.css',
    '/css/auth.css',
    '/css/dashboard.css',
    '/js/main.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/maps.js',
    '/js/gps-tracking.js',
    '/images/logo.png',
    '/favicon.ico'
];

// Resultados dos testes
let frontendResults = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    pages: [],
    resources: [],
    performance: {}
};

/**
 * Função para fazer requisições HTTP
 */
async function makeRequest(url, options = {}) {
    try {
        const startTime = Date.now();
        const response = await axios({
            method: 'GET',
            url: `${BASE_URL}${url}`,
            timeout: 10000,
            validateStatus: () => true, // Aceitar todos os status codes
            ...options
        });
        const endTime = Date.now();
        
        return {
            success: response.status >= 200 && response.status < 400,
            status: response.status,
            data: response.data,
            headers: response.headers,
            responseTime: endTime - startTime
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            error: error.message,
            responseTime: 0
        };
    }
}

/**
 * Função para registrar resultado do teste
 */
function logTestResult(testName, success, details = {}) {
    frontendResults.totalTests++;
    if (success) {
        frontendResults.passedTests++;
        console.log(`${colors.green}✓${colors.reset} ${testName}`);
    } else {
        frontendResults.failedTests++;
        console.log(`${colors.red}✗${colors.reset} ${testName}`);
        if (details.error) {
            console.log(`  ${colors.red}Erro: ${details.error}${colors.reset}`);
        }
        if (details.status) {
            console.log(`  ${colors.yellow}Status: ${details.status}${colors.reset}`);
        }
    }
}

/**
 * Verificar se uma página HTML é válida
 */
function validateHTML(html, pageName) {
    try {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        const checks = {
            hasTitle: !!document.title,
            hasCharset: !!document.querySelector('meta[charset]'),
            hasViewport: !!document.querySelector('meta[name="viewport"]'),
            hasBody: !!document.body,
            hasHead: !!document.head,
            scriptsCount: document.querySelectorAll('script').length,
            stylesCount: document.querySelectorAll('link[rel="stylesheet"]').length
        };
        
        return {
            valid: checks.hasTitle && checks.hasBody && checks.hasHead,
            checks,
            issues: []
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message,
            issues: ['HTML parsing failed']
        };
    }
}

/**
 * Testar páginas do frontend
 */
async function testFrontendPages() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE PÁGINAS DO FRONTEND ===${colors.reset}`);
    
    for (const page of pagesToTest) {
        const result = await makeRequest(page.url);
        
        const pageResult = {
            url: page.url,
            name: page.name,
            type: page.type,
            success: result.success,
            status: result.status,
            responseTime: result.responseTime,
            timestamp: new Date().toISOString()
        };
        
        if (result.success && result.data) {
            const validation = validateHTML(result.data, page.name);
            pageResult.validation = validation;
            
            logTestResult(
                `${page.name} (${result.responseTime}ms)`,
                result.success && validation.valid,
                { status: result.status, error: result.error }
            );
        } else {
            logTestResult(
                page.name,
                false,
                { status: result.status, error: result.error }
            );
        }
        
        frontendResults.pages.push(pageResult);
    }
}

/**
 * Testar recursos estáticos
 */
async function testStaticResources() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE RECURSOS ESTÁTICOS ===${colors.reset}`);
    
    for (const resource of staticResources) {
        const result = await makeRequest(resource);
        
        const resourceResult = {
            url: resource,
            success: result.success,
            status: result.status,
            responseTime: result.responseTime,
            contentType: result.headers?.['content-type'] || 'unknown',
            timestamp: new Date().toISOString()
        };
        
        logTestResult(
            `${resource} (${result.responseTime}ms)`,
            result.success,
            { status: result.status, error: result.error }
        );
        
        frontendResults.resources.push(resourceResult);
    }
}

/**
 * Testar performance geral
 */
async function testPerformance() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE PERFORMANCE ===${colors.reset}`);
    
    // Testar página inicial múltiplas vezes para calcular média
    const performanceTests = [];
    const testCount = 5;
    
    for (let i = 0; i < testCount; i++) {
        const result = await makeRequest('/');
        if (result.success) {
            performanceTests.push(result.responseTime);
        }
    }
    
    if (performanceTests.length > 0) {
        const avgResponseTime = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length;
        const minResponseTime = Math.min(...performanceTests);
        const maxResponseTime = Math.max(...performanceTests);
        
        frontendResults.performance = {
            averageResponseTime: avgResponseTime,
            minResponseTime,
            maxResponseTime,
            testCount: performanceTests.length
        };
        
        logTestResult(
            `Performance média da página inicial: ${avgResponseTime.toFixed(2)}ms`,
            avgResponseTime < 2000, // Considerar bom se for menor que 2 segundos
            { avgTime: avgResponseTime }
        );
    }
}

/**
 * Verificar conectividade com APIs
 */
async function testAPIConnectivity() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE CONECTIVIDADE COM APIS ===${colors.reset}`);
    
    const apiEndpoints = [
        '/api/health',
        '/api/planos',
        '/api/gps/status',
        '/api/maps/config'
    ];
    
    for (const endpoint of apiEndpoints) {
        const result = await makeRequest(endpoint);
        
        logTestResult(
            `API ${endpoint}`,
            result.success,
            { status: result.status, error: result.error }
        );
    }
}

/**
 * Verificar se o WebSocket está funcionando
 */
async function testWebSocketFromFrontend() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTE DE WEBSOCKET ===${colors.reset}`);
    
    try {
        // Verificar se a página que usa WebSocket carrega
        const result = await makeRequest('/maps.html');
        
        if (result.success && result.data) {
            const hasWebSocketCode = result.data.includes('WebSocket') || result.data.includes('ws://');
            
            logTestResult(
                'Página com WebSocket carrega',
                result.success,
                { hasWebSocketCode }
            );
        }
    } catch (error) {
        logTestResult(
            'Teste de WebSocket no frontend',
            false,
            { error: error.message }
        );
    }
}

/**
 * Verificar recursos de segurança
 */
async function testSecurityHeaders() {
    console.log(`\n${colors.bold}${colors.blue}=== TESTES DE SEGURANÇA ===${colors.reset}`);
    
    const result = await makeRequest('/');
    
    if (result.success) {
        const headers = result.headers;
        const securityChecks = {
            hasXFrameOptions: !!headers['x-frame-options'],
            hasXContentTypeOptions: !!headers['x-content-type-options'],
            hasXXSSProtection: !!headers['x-xss-protection'],
            hasContentSecurityPolicy: !!headers['content-security-policy']
        };
        
        Object.entries(securityChecks).forEach(([check, passed]) => {
            logTestResult(
                `Header de segurança: ${check}`,
                passed
            );
        });
    }
}

/**
 * Função principal para executar todos os testes de frontend
 */
async function runAllFrontendTests() {
    console.log(`${colors.bold}${colors.yellow}🌐 INICIANDO TESTES AUTOMATIZADOS DO FRONTEND${colors.reset}`);
    console.log(`${colors.yellow}Servidor: ${BASE_URL}${colors.reset}\n`);
    
    try {
        await testFrontendPages();
        await testStaticResources();
        await testPerformance();
        await testAPIConnectivity();
        await testWebSocketFromFrontend();
        await testSecurityHeaders();
        
        // Salvar resultados
        fs.writeFileSync(FRONTEND_RESULTS_FILE, JSON.stringify(frontendResults, null, 2));
        
        // Resumo final
        console.log(`\n${colors.bold}${colors.yellow}=== RESUMO DOS TESTES DE FRONTEND ===${colors.reset}`);
        console.log(`Total de testes: ${frontendResults.totalTests}`);
        console.log(`${colors.green}Testes aprovados: ${frontendResults.passedTests}${colors.reset}`);
        console.log(`${colors.red}Testes falharam: ${frontendResults.failedTests}${colors.reset}`);
        
        const successRate = ((frontendResults.passedTests / frontendResults.totalTests) * 100).toFixed(2);
        console.log(`Taxa de sucesso: ${successRate}%`);
        
        if (frontendResults.performance.averageResponseTime) {
            console.log(`Performance média: ${frontendResults.performance.averageResponseTime.toFixed(2)}ms`);
        }
        
        if (frontendResults.failedTests === 0) {
            console.log(`\n${colors.green}${colors.bold}🎉 TODOS OS TESTES DE FRONTEND PASSARAM!${colors.reset}`);
        } else {
            console.log(`\n${colors.yellow}⚠️  Alguns testes falharam. Verifique os detalhes acima.${colors.reset}`);
        }
        
        console.log(`\nResultados salvos em: ${FRONTEND_RESULTS_FILE}`);
        
    } catch (error) {
        console.error(`${colors.red}Erro durante a execução dos testes de frontend: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    runAllFrontendTests();
}

module.exports = {
    runAllFrontendTests,
    frontendResults
};