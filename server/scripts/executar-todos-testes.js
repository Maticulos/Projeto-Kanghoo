/**
 * Script Principal de Execução de Todos os Testes
 * 
 * Este script coordena a execução de todos os testes automatizados:
 * - Criação de dados de teste
 * - Testes de APIs
 * - Testes de Frontend
 * - Geração de relatório consolidado
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Cores para output no console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Configurações
const SCRIPTS_DIR = __dirname;
const REPORTS_DIR = path.join(SCRIPTS_DIR, 'relatorios');
const CONSOLIDATED_REPORT = path.join(REPORTS_DIR, 'relatorio-consolidado.json');

// Garantir que o diretório de relatórios existe
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Função para executar um script Node.js
 */
function runScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`${colors.blue}📋 Executando: ${path.basename(scriptPath)}${colors.reset}`);
        
        const child = spawn('node', [scriptPath, ...args], {
            stdio: 'inherit',
            cwd: SCRIPTS_DIR
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`${colors.green}✅ ${path.basename(scriptPath)} concluído com sucesso${colors.reset}\n`);
                resolve(code);
            } else {
                console.log(`${colors.red}❌ ${path.basename(scriptPath)} falhou com código ${code}${colors.reset}\n`);
                reject(new Error(`Script failed with code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            console.error(`${colors.red}Erro ao executar ${path.basename(scriptPath)}: ${error.message}${colors.reset}`);
            reject(error);
        });
    });
}

/**
 * Função para aguardar um tempo específico
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verificar se o servidor está rodando
 */
async function checkServerStatus() {
    try {
        const axios = require('axios');
        const response = await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

/**
 * Gerar relatório consolidado
 */
function generateConsolidatedReport() {
    console.log(`${colors.cyan}📊 Gerando relatório consolidado...${colors.reset}`);
    
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            successRate: 0
        },
        testSuites: {},
        recommendations: [],
        nextSteps: []
    };
    
    // Carregar resultados dos testes de API
    const apiResultsFile = path.join(SCRIPTS_DIR, 'resultados-teste-apis.json');
    if (fs.existsSync(apiResultsFile)) {
        try {
            const apiResults = JSON.parse(fs.readFileSync(apiResultsFile, 'utf8'));
            report.testSuites.apis = apiResults;
            report.summary.totalTests += apiResults.totalTests;
            report.summary.passedTests += apiResults.passedTests;
            report.summary.failedTests += apiResults.failedTests;
        } catch (error) {
            console.log(`${colors.yellow}⚠️  Erro ao carregar resultados de API: ${error.message}${colors.reset}`);
        }
    }
    
    // Carregar resultados dos testes de frontend
    const frontendResultsFile = path.join(SCRIPTS_DIR, 'resultados-teste-frontend.json');
    if (fs.existsSync(frontendResultsFile)) {
        try {
            const frontendResults = JSON.parse(fs.readFileSync(frontendResultsFile, 'utf8'));
            report.testSuites.frontend = frontendResults;
            report.summary.totalTests += frontendResults.totalTests;
            report.summary.passedTests += frontendResults.passedTests;
            report.summary.failedTests += frontendResults.failedTests;
        } catch (error) {
            console.log(`${colors.yellow}⚠️  Erro ao carregar resultados de frontend: ${error.message}${colors.reset}`);
        }
    }
    
    // Calcular taxa de sucesso
    if (report.summary.totalTests > 0) {
        report.summary.successRate = (report.summary.passedTests / report.summary.totalTests) * 100;
    }
    
    // Gerar recomendações baseadas nos resultados
    if (report.summary.failedTests > 0) {
        report.recommendations.push('Investigar e corrigir testes que falharam');
        report.recommendations.push('Verificar logs do servidor para erros específicos');
    }
    
    if (report.summary.successRate < 90) {
        report.recommendations.push('Taxa de sucesso abaixo de 90% - revisar configurações');
    }
    
    if (report.testSuites.frontend?.performance?.averageResponseTime > 2000) {
        report.recommendations.push('Performance do frontend pode ser melhorada');
    }
    
    // Próximos passos
    report.nextSteps = [
        'Executar testes em ambiente de produção',
        'Configurar monitoramento contínuo',
        'Implementar testes de carga',
        'Configurar alertas para falhas'
    ];
    
    // Salvar relatório consolidado
    fs.writeFileSync(CONSOLIDATED_REPORT, JSON.stringify(report, null, 2));
    
    return report;
}

/**
 * Exibir resumo final
 */
function displayFinalSummary(report) {
    console.log(`\n${colors.bold}${colors.magenta}🎯 RELATÓRIO CONSOLIDADO DE TESTES${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════${colors.reset}\n`);
    
    console.log(`${colors.bold}📈 RESUMO GERAL:${colors.reset}`);
    console.log(`   Total de testes: ${report.summary.totalTests}`);
    console.log(`   ${colors.green}✅ Aprovados: ${report.summary.passedTests}${colors.reset}`);
    console.log(`   ${colors.red}❌ Falharam: ${report.summary.failedTests}${colors.reset}`);
    console.log(`   📊 Taxa de sucesso: ${report.summary.successRate.toFixed(2)}%\n`);
    
    if (report.testSuites.apis) {
        console.log(`${colors.bold}🔌 APIS:${colors.reset}`);
        console.log(`   Testes: ${report.testSuites.apis.totalTests}`);
        console.log(`   Sucesso: ${report.testSuites.apis.passedTests}/${report.testSuites.apis.totalTests}\n`);
    }
    
    if (report.testSuites.frontend) {
        console.log(`${colors.bold}🌐 FRONTEND:${colors.reset}`);
        console.log(`   Testes: ${report.testSuites.frontend.totalTests}`);
        console.log(`   Sucesso: ${report.testSuites.frontend.passedTests}/${report.testSuites.frontend.totalTests}`);
        if (report.testSuites.frontend.performance?.averageResponseTime) {
            console.log(`   Performance média: ${report.testSuites.frontend.performance.averageResponseTime.toFixed(2)}ms\n`);
        }
    }
    
    if (report.recommendations.length > 0) {
        console.log(`${colors.bold}💡 RECOMENDAÇÕES:${colors.reset}`);
        report.recommendations.forEach(rec => {
            console.log(`   • ${rec}`);
        });
        console.log('');
    }
    
    if (report.summary.failedTests === 0) {
        console.log(`${colors.green}${colors.bold}🎉 TODOS OS TESTES PASSARAM! SISTEMA PRONTO PARA PRODUÇÃO!${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠️  ALGUNS TESTES FALHARAM - REVISAR ANTES DA PRODUÇÃO${colors.reset}`);
    }
    
    console.log(`\n📄 Relatório completo salvo em: ${CONSOLIDATED_REPORT}`);
}

/**
 * Função principal
 */
async function runAllTests() {
    console.log(`${colors.bold}${colors.cyan}🚀 INICIANDO SUITE COMPLETA DE TESTES DE PRODUÇÃO${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════════════${colors.reset}\n`);
    
    try {
        // 1. Verificar se o servidor está rodando
        console.log(`${colors.yellow}🔍 Verificando status do servidor...${colors.reset}`);
        const serverRunning = await checkServerStatus();
        
        if (!serverRunning) {
            console.log(`${colors.red}❌ Servidor não está rodando em http://localhost:3001${colors.reset}`);
            console.log(`${colors.yellow}💡 Inicie o servidor com: npm start${colors.reset}`);
            process.exit(1);
        }
        
        console.log(`${colors.green}✅ Servidor está rodando${colors.reset}\n`);
        
        // 2. Criar dados de teste
        console.log(`${colors.bold}${colors.blue}ETAPA 1: CRIAÇÃO DE DADOS DE TESTE${colors.reset}`);
        await runScript(path.join(SCRIPTS_DIR, 'criar-dados-teste-producao.js'));
        
        // Aguardar um pouco para os dados serem processados
        await sleep(2000);
        
        // 3. Executar testes de API
        console.log(`${colors.bold}${colors.blue}ETAPA 2: TESTES DE APIS${colors.reset}`);
        await runScript(path.join(SCRIPTS_DIR, 'teste-automatizado-apis.js'));
        
        // 4. Executar testes de frontend
        console.log(`${colors.bold}${colors.blue}ETAPA 3: TESTES DE FRONTEND${colors.reset}`);
        await runScript(path.join(SCRIPTS_DIR, 'teste-automatizado-frontend.js'));
        
        // 5. Gerar relatório consolidado
        console.log(`${colors.bold}${colors.blue}ETAPA 4: GERAÇÃO DE RELATÓRIO${colors.reset}`);
        const report = generateConsolidatedReport();
        
        // 6. Exibir resumo final
        displayFinalSummary(report);
        
    } catch (error) {
        console.error(`${colors.red}❌ Erro durante a execução dos testes: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

/**
 * Função para executar apenas testes específicos
 */
async function runSpecificTestSuite(suite) {
    console.log(`${colors.bold}${colors.cyan}🎯 EXECUTANDO SUITE ESPECÍFICA: ${suite.toUpperCase()}${colors.reset}\n`);
    
    try {
        const serverRunning = await checkServerStatus();
        if (!serverRunning) {
            console.log(`${colors.red}❌ Servidor não está rodando${colors.reset}`);
            process.exit(1);
        }
        
        switch (suite) {
            case 'dados':
                await runScript(path.join(SCRIPTS_DIR, 'criar-dados-teste-producao.js'));
                break;
            case 'apis':
                await runScript(path.join(SCRIPTS_DIR, 'teste-automatizado-apis.js'));
                break;
            case 'frontend':
                await runScript(path.join(SCRIPTS_DIR, 'teste-automatizado-frontend.js'));
                break;
            default:
                console.log(`${colors.red}Suite '${suite}' não reconhecida${colors.reset}`);
                console.log(`${colors.yellow}Suites disponíveis: dados, apis, frontend${colors.reset}`);
                process.exit(1);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Erro: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.length > 0) {
    const command = args[0];
    
    if (command === 'help' || command === '--help' || command === '-h') {
        console.log(`${colors.bold}🔧 SCRIPT DE TESTES AUTOMATIZADOS${colors.reset}\n`);
        console.log(`${colors.yellow}Uso:${colors.reset}`);
        console.log(`  node executar-todos-testes.js          # Executar todos os testes`);
        console.log(`  node executar-todos-testes.js dados    # Apenas criar dados de teste`);
        console.log(`  node executar-todos-testes.js apis     # Apenas testes de APIs`);
        console.log(`  node executar-todos-testes.js frontend # Apenas testes de frontend`);
        console.log(`  node executar-todos-testes.js help     # Mostrar esta ajuda\n`);
        process.exit(0);
    } else {
        runSpecificTestSuite(command);
    }
} else {
    runAllTests();
}

module.exports = {
    runAllTests,
    runSpecificTestSuite,
    generateConsolidatedReport
};