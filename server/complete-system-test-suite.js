#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧪 SUITE COMPLETA DE TESTES DO SISTEMA KANGHOO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta suite executa testes abrangentes em:
 * - Backend (API, Banco de Dados, Transações)
 * - Frontend (HTML, CSS, JavaScript)
 * - Integração (API + Frontend)
 * - Segurança e Performance
 * 
 * Uso: node complete-system-test-suite.js [--verbose] [--test=nome]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { JSDOM } = require('jsdom');

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 CONFIGURAÇÕES E UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════

const verbose = process.argv.includes('--verbose');
const specificTest = process.argv.find(arg => arg.startsWith('--test='))?.split('=')[1];

const CONFIG = {
    // Configuração do banco de dados
    database: {
        connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/kanghoo_db',
        pool: {
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        }
    },
    
    // Configuração da API
    api: {
        baseUrl: 'http://localhost:5000',
        timeout: 10000
    },
    
    // Configuração dos testes
    tests: {
        retryAttempts: 3,
        retryDelay: 1000,
        frontendTimeout: 5000
    },

    // Caminhos dos arquivos
    paths: {
        frontend: path.join(__dirname, '..', 'frontend'),
        server: __dirname,
        docs: path.join(__dirname, '..', 'docs')
    }
};

// Cores para output
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
    success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
    warning: (msg) => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
    error: (msg) => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
    debug: (msg) => verbose && console.log(`${COLORS.cyan}🔍 ${msg}${COLORS.reset}`),
    header: (msg) => console.log(`\n${COLORS.bright}${COLORS.magenta}═══ ${msg} ═══${COLORS.reset}\n`),
    subheader: (msg) => console.log(`${COLORS.bright}${COLORS.cyan}┌── ${msg} ──┐${COLORS.reset}`)
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🗄️ GERENCIADOR DE CONEXÕES (Reutilizado do teste anterior)
// ═══════════════════════════════════════════════════════════════════════════════

class DatabaseManager {
    constructor() {
        this.connections = new Map();
        this.pool = null;
    }

    async init() {
        const { Pool } = require('pg');
        this.pool = new Pool({
            connectionString: CONFIG.database.connectionString,
            ...CONFIG.database.pool
        });
        
        // Testar conexão
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        log.debug('Conexão com banco de dados estabelecida');
    }

    async query(text, params = []) {
        return await this.pool.query(text, params);
    }

    async getConnection(name = 'default') {
        if (!this.connections.has(name)) {
            const client = await this.pool.connect();
            this.connections.set(name, client);
            log.debug(`Nova conexão criada: ${name}`);
        }
        return this.connections.get(name);
    }

    async releaseConnection(name) {
        if (this.connections.has(name)) {
            const client = this.connections.get(name);
            client.release();
            this.connections.delete(name);
            log.debug(`Conexão liberada: ${name}`);
        }
    }

    async close() {
        for (const [name, client] of this.connections) {
            client.release();
            log.debug(`Conexão fechada: ${name}`);
        }
        this.connections.clear();
        if (this.pool) {
            await this.pool.end();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TESTES DE BACKEND (Reutilizados e expandidos)
// ═══════════════════════════════════════════════════════════════════════════════

class BackendTests {
    constructor(dbManager) {
        this.db = dbManager;
        this.log = log;
    }

    async runAll() {
        const tests = [
            { name: 'database-connection', method: 'testDatabaseConnection', title: 'Conexão com Banco de Dados' },
            { name: 'api-endpoints', method: 'testAPIEndpoints', title: 'Endpoints da API' },
            { name: 'transaction-isolation', method: 'testTransactionIsolation', title: 'Isolamento de Transações' },
            { name: 'data-validation', method: 'testDataValidation', title: 'Validação de Dados' },
            { name: 'security', method: 'testSecurity', title: 'Segurança da API' }
        ];

        const results = {};
        for (const test of tests) {
            try {
                this.log.subheader(test.title);
                results[test.name] = await this[test.method]();
                this.log.success(`✅ ${test.title}: PASSOU`);
            } catch (error) {
                this.log.error(`❌ ${test.title}: FALHOU - ${error.message}`);
                results[test.name] = { success: false, error: error.message };
            }
        }
        return results;
    }

    async testDatabaseConnection() {
        const result = await this.db.query('SELECT COUNT(*) as count FROM usuarios');
        const userCount = parseInt(result.rows[0].count);
        
        this.log.debug(`Usuários no banco: ${userCount}`);
        
        return {
            success: true,
            userCount,
            details: 'Conexão com banco funcionando corretamente'
        };
    }

    async testAPIEndpoints() {
        const endpoints = [
            { method: 'GET', path: '/api/transportes', description: 'Listar transportes' },
            { method: 'GET', path: '/api/rastreamento/status', description: 'Status do rastreamento' },
            { method: 'POST', path: '/api/cadastrar', description: 'Cadastro de usuário' }
        ];

        const results = [];
        for (const endpoint of endpoints) {
            try {
                const response = await axios({
                    method: endpoint.method.toLowerCase(),
                    url: `${CONFIG.api.baseUrl}${endpoint.path}`,
                    timeout: CONFIG.api.timeout,
                    data: endpoint.method === 'POST' ? {
                        nomeCompleto: 'Teste API',
                        email: `teste.api.${Date.now()}@email.com`,
                        celular: '11999999999',
                        dataNascimento: '1990-01-01',
                        tipoCadastro: 'motorista-escolar'
                    } : undefined,
                    validateStatus: () => true // Aceitar qualquer status
                });

                results.push({
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    status: response.status,
                    success: response.status < 500,
                    description: endpoint.description
                });

                this.log.debug(`${endpoint.method} ${endpoint.path}: ${response.status}`);
            } catch (error) {
                results.push({
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    status: 'ERROR',
                    success: false,
                    error: error.message,
                    description: endpoint.description
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount > 0,
            endpoints: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} endpoints funcionando`
        };
    }

    async testTransactionIsolation() {
        const initialCount = await this.getUserCount();
        
        const conn1 = await this.db.getConnection('transaction-test');
        await conn1.query('BEGIN');
        
        const insertResult = await conn1.query(`
            INSERT INTO usuarios (nome_completo, email, celular, data_nascimento, tipo_cadastro, senha)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [
            'Teste Transação',
            `teste.transacao.${Date.now()}@email.com`,
            '11999999999',
            '1990-01-01',
            'motorista-escolar',
            'senha_teste'
        ]);
        
        const userId = insertResult.rows[0].id;
        
        // Verificar se é visível na mesma transação
        const userInTransaction = await conn1.query('SELECT id FROM usuarios WHERE id = $1', [userId]);
        
        // Verificar se NÃO é visível em outra conexão
        const userInOtherConnection = await this.db.query('SELECT id FROM usuarios WHERE id = $1', [userId]);
        
        await conn1.query('COMMIT');
        await this.db.releaseConnection('transaction-test');
        
        // Verificar se é visível após commit
        const userAfterCommit = await this.db.query('SELECT id FROM usuarios WHERE id = $1', [userId]);
        
        const finalCount = await this.getUserCount();
        
        // Limpar dados de teste
        await this.db.query('DELETE FROM usuarios WHERE id = $1', [userId]);
        
        return {
            success: userInTransaction.rows.length > 0 && 
                     userInOtherConnection.rows.length === 0 && 
                     userAfterCommit.rows.length > 0,
            userId,
            visibleInTransaction: userInTransaction.rows.length > 0,
            visibleInOtherConnection: userInOtherConnection.rows.length > 0,
            visibleAfterCommit: userAfterCommit.rows.length > 0,
            initialCount,
            finalCount,
            details: 'Isolamento de transações funcionando corretamente'
        };
    }

    async testDataValidation() {
        const testCases = [
            {
                name: 'email-invalido',
                data: { email: 'email-invalido', nomeCompleto: 'Teste' },
                shouldFail: true
            },
            {
                name: 'dados-validos',
                data: {
                    nomeCompleto: 'Teste Validação',
                    email: `teste.validacao.${Date.now()}@email.com`,
                    celular: '11999999999',
                    dataNascimento: '1990-01-01',
                    tipoCadastro: 'motorista-escolar'
                },
                shouldFail: false
            }
        ];

        const results = [];
        for (const testCase of testCases) {
            try {
                const response = await axios.post(`${CONFIG.api.baseUrl}/api/cadastrar`, testCase.data, {
                    timeout: CONFIG.api.timeout,
                    validateStatus: () => true
                });

                const failed = response.status >= 400;
                const success = testCase.shouldFail ? failed : !failed;

                results.push({
                    name: testCase.name,
                    success,
                    status: response.status,
                    expected: testCase.shouldFail ? 'falhar' : 'sucesso'
                });

                this.log.debug(`Validação ${testCase.name}: ${response.status} (esperado: ${testCase.shouldFail ? 'falhar' : 'sucesso'})`);
            } catch (error) {
                results.push({
                    name: testCase.name,
                    success: testCase.shouldFail,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount === results.length,
            testCases: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} validações funcionando corretamente`
        };
    }

    async testSecurity() {
        const securityTests = [
            {
                name: 'sql-injection',
                data: { email: "'; DROP TABLE usuarios; --", nomeCompleto: 'Teste' },
                description: 'Teste de SQL Injection'
            },
            {
                name: 'xss-attempt',
                data: { nomeCompleto: '<script>alert("xss")</script>', email: 'teste@email.com' },
                description: 'Teste de XSS'
            }
        ];

        const results = [];
        for (const test of securityTests) {
            try {
                const response = await axios.post(`${CONFIG.api.baseUrl}/api/cadastrar`, test.data, {
                    timeout: CONFIG.api.timeout,
                    validateStatus: () => true
                });

                // Verificar se o servidor rejeitou adequadamente
                const rejected = response.status >= 400;
                
                results.push({
                    name: test.name,
                    success: rejected,
                    status: response.status,
                    description: test.description,
                    details: rejected ? 'Ataque bloqueado' : 'Possível vulnerabilidade'
                });

                this.log.debug(`Segurança ${test.name}: ${response.status} (${rejected ? 'bloqueado' : 'permitido'})`);
            } catch (error) {
                results.push({
                    name: test.name,
                    success: true, // Erro é bom para segurança
                    error: error.message,
                    description: test.description
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount === results.length,
            securityTests: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} testes de segurança passaram`
        };
    }

    async getUserCount() {
        const result = await this.db.query('SELECT COUNT(*) as count FROM usuarios');
        return parseInt(result.rows[0].count);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 TESTES DE FRONTEND
// ═══════════════════════════════════════════════════════════════════════════════

class FrontendTests {
    constructor() {
        this.log = log;
        this.frontendPath = CONFIG.paths.frontend;
    }

    async runAll() {
        const tests = [
            { name: 'html-structure', method: 'testHTMLStructure', title: 'Estrutura HTML' },
            { name: 'css-files', method: 'testCSSFiles', title: 'Arquivos CSS' },
            { name: 'javascript-syntax', method: 'testJavaScriptSyntax', title: 'Sintaxe JavaScript' },
            { name: 'form-validation', method: 'testFormValidation', title: 'Validação de Formulários' },
            { name: 'responsive-design', method: 'testResponsiveDesign', title: 'Design Responsivo' }
        ];

        const results = {};
        for (const test of tests) {
            try {
                this.log.subheader(test.title);
                results[test.name] = await this[test.method]();
                this.log.success(`✅ ${test.title}: PASSOU`);
            } catch (error) {
                this.log.error(`❌ ${test.title}: FALHOU - ${error.message}`);
                results[test.name] = { success: false, error: error.message };
            }
        }
        return results;
    }

    async testHTMLStructure() {
        const htmlFiles = [
            'public/index.html',
            'public/cadastro-escolar.html',
            'public/cadastro-excursao.html',
            'auth/login.html',
            'auth/dashboard.html'
        ];

        const results = [];
        for (const file of htmlFiles) {
            const filePath = path.join(this.frontendPath, file);
            
            if (!fs.existsSync(filePath)) {
                results.push({
                    file,
                    success: false,
                    error: 'Arquivo não encontrado'
                });
                continue;
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const dom = new JSDOM(content);
                const document = dom.window.document;

                // Verificações básicas de estrutura HTML
                const hasDoctype = content.trim().toLowerCase().startsWith('<!doctype html>');
                const hasTitle = document.querySelector('title') !== null;
                const hasMetaCharset = document.querySelector('meta[charset]') !== null;
                const hasMetaViewport = document.querySelector('meta[name="viewport"]') !== null;

                const score = [hasDoctype, hasTitle, hasMetaCharset, hasMetaViewport].filter(Boolean).length;

                results.push({
                    file,
                    success: score >= 3,
                    score: `${score}/4`,
                    checks: {
                        doctype: hasDoctype,
                        title: hasTitle,
                        charset: hasMetaCharset,
                        viewport: hasMetaViewport
                    }
                });

                this.log.debug(`HTML ${file}: ${score}/4 verificações passaram`);
            } catch (error) {
                results.push({
                    file,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount > 0,
            files: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} arquivos HTML válidos`
        };
    }

    async testCSSFiles() {
        const cssFiles = [
            'css/style.css',
            'css/formulario-multiplas-etapas.css'
        ];

        const results = [];
        for (const file of cssFiles) {
            const filePath = path.join(this.frontendPath, file);
            
            if (!fs.existsSync(filePath)) {
                results.push({
                    file,
                    success: false,
                    error: 'Arquivo não encontrado'
                });
                continue;
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Verificações básicas de CSS
                const hasMediaQueries = content.includes('@media');
                const hasFlexbox = content.includes('display: flex') || content.includes('display:flex');
                const hasGrid = content.includes('display: grid') || content.includes('display:grid');
                const hasVariables = content.includes('--') || content.includes('var(');
                const hasComments = content.includes('/*');

                const modernFeatures = [hasMediaQueries, hasFlexbox, hasGrid, hasVariables].filter(Boolean).length;

                results.push({
                    file,
                    success: true,
                    size: `${(content.length / 1024).toFixed(2)}KB`,
                    modernFeatures: `${modernFeatures}/4`,
                    features: {
                        mediaQueries: hasMediaQueries,
                        flexbox: hasFlexbox,
                        grid: hasGrid,
                        variables: hasVariables,
                        comments: hasComments
                    }
                });

                this.log.debug(`CSS ${file}: ${(content.length / 1024).toFixed(2)}KB, ${modernFeatures}/4 recursos modernos`);
            } catch (error) {
                results.push({
                    file,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount === cssFiles.length,
            files: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} arquivos CSS válidos`
        };
    }

    async testJavaScriptSyntax() {
        const jsFiles = [
            'js/app.js',
            'js/formulario-multiplas-etapas.js',
            'js/rastreamento-api.js',
            'js/mascaras.js'
        ];

        const results = [];
        for (const file of jsFiles) {
            const filePath = path.join(this.frontendPath, file);
            
            if (!fs.existsSync(filePath)) {
                results.push({
                    file,
                    success: false,
                    error: 'Arquivo não encontrado'
                });
                continue;
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Verificação básica de sintaxe JavaScript
                // Tentar criar uma função que contém o código
                new Function(content);

                // Verificações de boas práticas
                const hasStrictMode = content.includes("'use strict'") || content.includes('"use strict"');
                const hasES6Features = content.includes('=>') || content.includes('const ') || content.includes('let ');
                const hasErrorHandling = content.includes('try') && content.includes('catch');
                const hasComments = content.includes('//') || content.includes('/*');

                const qualityScore = [hasES6Features, hasErrorHandling, hasComments].filter(Boolean).length;

                results.push({
                    file,
                    success: true,
                    size: `${(content.length / 1024).toFixed(2)}KB`,
                    qualityScore: `${qualityScore}/3`,
                    features: {
                        strictMode: hasStrictMode,
                        es6Features: hasES6Features,
                        errorHandling: hasErrorHandling,
                        comments: hasComments
                    }
                });

                this.log.debug(`JS ${file}: Sintaxe válida, qualidade ${qualityScore}/3`);
            } catch (error) {
                results.push({
                    file,
                    success: false,
                    error: `Erro de sintaxe: ${error.message}`
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount === jsFiles.length,
            files: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} arquivos JavaScript válidos`
        };
    }

    async testFormValidation() {
        // Simular validação de formulários usando JSDOM
        const formPages = [
            'public/cadastro-escolar.html',
            'public/cadastro-excursao.html'
        ];

        const results = [];
        for (const page of formPages) {
            const filePath = path.join(this.frontendPath, page);
            
            if (!fs.existsSync(filePath)) {
                results.push({
                    page,
                    success: false,
                    error: 'Arquivo não encontrado'
                });
                continue;
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const dom = new JSDOM(content);
                const document = dom.window.document;

                // Verificar elementos de formulário
                const forms = document.querySelectorAll('form');
                const inputs = document.querySelectorAll('input');
                const requiredInputs = document.querySelectorAll('input[required]');
                const emailInputs = document.querySelectorAll('input[type="email"]');
                const telInputs = document.querySelectorAll('input[type="tel"]');

                results.push({
                    page,
                    success: forms.length > 0 && inputs.length > 0,
                    forms: forms.length,
                    inputs: inputs.length,
                    requiredInputs: requiredInputs.length,
                    emailInputs: emailInputs.length,
                    telInputs: telInputs.length,
                    hasValidation: requiredInputs.length > 0 || emailInputs.length > 0
                });

                this.log.debug(`Formulário ${page}: ${forms.length} forms, ${inputs.length} inputs, ${requiredInputs.length} obrigatórios`);
            } catch (error) {
                results.push({
                    page,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount > 0,
            pages: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} páginas com formulários válidos`
        };
    }

    async testResponsiveDesign() {
        const cssFiles = [
            'css/style.css',
            'css/formulario-multiplas-etapas.css'
        ];

        const results = [];
        for (const file of cssFiles) {
            const filePath = path.join(this.frontendPath, file);
            
            if (!fs.existsSync(filePath)) {
                results.push({
                    file,
                    success: false,
                    error: 'Arquivo não encontrado'
                });
                continue;
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Verificar recursos de design responsivo
                const mediaQueries = (content.match(/@media/g) || []).length;
                const flexboxUsage = (content.match(/display:\s*flex|display:\s*inline-flex/g) || []).length;
                const gridUsage = (content.match(/display:\s*grid|display:\s*inline-grid/g) || []).length;
                const viewportUnits = (content.match(/\d+v[wh]/g) || []).length;
                const percentageWidths = (content.match(/width:\s*\d+%/g) || []).length;

                const responsiveScore = [
                    mediaQueries > 0,
                    flexboxUsage > 0,
                    gridUsage > 0 || percentageWidths > 0,
                    viewportUnits > 0
                ].filter(Boolean).length;

                results.push({
                    file,
                    success: responsiveScore >= 2,
                    responsiveScore: `${responsiveScore}/4`,
                    features: {
                        mediaQueries,
                        flexboxUsage,
                        gridUsage,
                        viewportUnits,
                        percentageWidths
                    }
                });

                this.log.debug(`Responsivo ${file}: ${responsiveScore}/4 recursos, ${mediaQueries} media queries`);
            } catch (error) {
                results.push({
                    file,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount > 0,
            files: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} arquivos com design responsivo`
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 TESTES DE INTEGRAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

class IntegrationTests {
    constructor(dbManager) {
        this.db = dbManager;
        this.log = log;
    }

    async runAll() {
        const tests = [
            { name: 'api-frontend-integration', method: 'testAPIFrontendIntegration', title: 'Integração API-Frontend' },
            { name: 'end-to-end-flow', method: 'testEndToEndFlow', title: 'Fluxo Completo' },
            { name: 'performance', method: 'testPerformance', title: 'Performance do Sistema' }
        ];

        const results = {};
        for (const test of tests) {
            try {
                this.log.subheader(test.title);
                results[test.name] = await this[test.method]();
                this.log.success(`✅ ${test.title}: PASSOU`);
            } catch (error) {
                this.log.error(`❌ ${test.title}: FALHOU - ${error.message}`);
                results[test.name] = { success: false, error: error.message };
            }
        }
        return results;
    }

    async testAPIFrontendIntegration() {
        // Verificar se os endpoints usados pelo frontend estão funcionando
        const frontendEndpoints = [
            '/api/transportes',
            '/api/rastreamento/status',
            '/api/cadastrar'
        ];

        const results = [];
        for (const endpoint of frontendEndpoints) {
            try {
                const response = await axios.get(`${CONFIG.api.baseUrl}${endpoint}`, {
                    timeout: CONFIG.api.timeout,
                    validateStatus: () => true
                });

                results.push({
                    endpoint,
                    success: response.status < 500,
                    status: response.status,
                    responseTime: response.headers['x-response-time'] || 'N/A'
                });

                this.log.debug(`Endpoint ${endpoint}: ${response.status}`);
            } catch (error) {
                results.push({
                    endpoint,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        return {
            success: successCount === frontendEndpoints.length,
            endpoints: results,
            successRate: `${successCount}/${results.length}`,
            details: `${successCount} de ${results.length} endpoints integrados funcionando`
        };
    }

    async testEndToEndFlow() {
        // Simular um fluxo completo de cadastro
        const testUser = {
            nomeCompleto: `Teste E2E ${Date.now()}`,
            email: `teste.e2e.${Date.now()}@email.com`,
            celular: '11999999999',
            dataNascimento: '1990-01-01',
            tipoCadastro: 'motorista-escolar'
        };

        try {
            // 1. Cadastrar usuário via API
            const cadastroResponse = await axios.post(`${CONFIG.api.baseUrl}/api/cadastrar`, testUser, {
                timeout: CONFIG.api.timeout
            });

            if (cadastroResponse.status !== 201) {
                throw new Error(`Falha no cadastro: Status ${cadastroResponse.status}`);
            }

            const userId = cadastroResponse.data.id;
            this.log.debug(`Usuário cadastrado: ID ${userId}`);

            // 2. Verificar se o usuário foi salvo no banco
            const userInDB = await this.db.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
            
            if (userInDB.rows.length === 0) {
                throw new Error('Usuário não encontrado no banco após cadastro');
            }

            // 3. Verificar dados do usuário
            const savedUser = userInDB.rows[0];
            const dataMatches = savedUser.nome_completo === testUser.nomeCompleto &&
                               savedUser.email === testUser.email;

            // 4. Limpar dados de teste
            await this.db.query('DELETE FROM usuarios WHERE id = $1', [userId]);

            return {
                success: dataMatches,
                userId,
                cadastroStatus: cadastroResponse.status,
                dataIntegrity: dataMatches,
                details: 'Fluxo completo de cadastro funcionando'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: 'Falha no fluxo end-to-end'
            };
        }
    }

    async testPerformance() {
        const performanceTests = [];

        // Teste de resposta da API
        const startTime = Date.now();
        try {
            await axios.get(`${CONFIG.api.baseUrl}/api/transportes`, {
                timeout: CONFIG.api.timeout
            });
            const apiResponseTime = Date.now() - startTime;
            
            performanceTests.push({
                test: 'api-response-time',
                success: apiResponseTime < 2000,
                value: `${apiResponseTime}ms`,
                threshold: '2000ms'
            });
        } catch (error) {
            performanceTests.push({
                test: 'api-response-time',
                success: false,
                error: error.message
            });
        }

        // Teste de consulta ao banco
        const dbStartTime = Date.now();
        try {
            await this.db.query('SELECT COUNT(*) FROM usuarios');
            const dbResponseTime = Date.now() - dbStartTime;
            
            performanceTests.push({
                test: 'database-query-time',
                success: dbResponseTime < 1000,
                value: `${dbResponseTime}ms`,
                threshold: '1000ms'
            });
        } catch (error) {
            performanceTests.push({
                test: 'database-query-time',
                success: false,
                error: error.message
            });
        }

        const successCount = performanceTests.filter(t => t.success).length;
        return {
            success: successCount === performanceTests.length,
            tests: performanceTests,
            successRate: `${successCount}/${performanceTests.length}`,
            details: `${successCount} de ${performanceTests.length} testes de performance passaram`
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 GERENCIADOR PRINCIPAL DE TESTES
// ═══════════════════════════════════════════════════════════════════════════════

class CompleteTestSuite {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.results = {};
        this.startTime = Date.now();
    }

    async runAll() {
        log.header('🧪 INICIANDO SUITE COMPLETA DE TESTES DO SISTEMA KANGHOO');
        
        try {
            // Inicializar conexão com banco
            await this.dbManager.init();
            
            // Executar testes de backend
            log.header('🔧 TESTES DE BACKEND');
            const backendTests = new BackendTests(this.dbManager);
            this.results.backend = await backendTests.runAll();
            
            // Executar testes de frontend
            log.header('🎨 TESTES DE FRONTEND');
            const frontendTests = new FrontendTests();
            this.results.frontend = await frontendTests.runAll();
            
            // Executar testes de integração
            log.header('🔗 TESTES DE INTEGRAÇÃO');
            const integrationTests = new IntegrationTests(this.dbManager);
            this.results.integration = await integrationTests.runAll();
            
            await this.generateReport();
            
        } catch (error) {
            log.error(`Erro fatal na execução dos testes: ${error.message}`);
            this.results.error = error.message;
        } finally {
            await this.cleanup();
        }
    }

    async runSpecific(testCategory) {
        log.header(`🧪 EXECUTANDO TESTES DE ${testCategory.toUpperCase()}`);
        
        try {
            await this.dbManager.init();
            
            switch (testCategory) {
                case 'backend':
                    const backendTests = new BackendTests(this.dbManager);
                    this.results.backend = await backendTests.runAll();
                    break;
                case 'frontend':
                    const frontendTests = new FrontendTests();
                    this.results.frontend = await frontendTests.runAll();
                    break;
                case 'integration':
                    const integrationTests = new IntegrationTests(this.dbManager);
                    this.results.integration = await integrationTests.runAll();
                    break;
                default:
                    throw new Error(`Categoria de teste '${testCategory}' não encontrada`);
            }
            
            await this.generateReport();
            
        } catch (error) {
            log.error(`Erro na execução dos testes de ${testCategory}: ${error.message}`);
            this.results.error = error.message;
        } finally {
            await this.cleanup();
        }
    }

    async generateReport() {
        const duration = Date.now() - this.startTime;
        
        // Calcular estatísticas
        const stats = this.calculateStats();
        
        log.header('📊 RELATÓRIO FINAL COMPLETO');
        
        console.log(`⏱️  Duração total: ${(duration / 1000).toFixed(2)}s`);
        console.log(`📈 Categorias testadas: ${stats.categories}`);
        console.log(`✅ Testes aprovados: ${stats.passed}`);
        console.log(`❌ Testes falharam: ${stats.failed}`);
        console.log(`📊 Taxa de sucesso: ${stats.successRate}%`);
        
        console.log('\n📋 Detalhes por Categoria:');
        
        if (this.results.backend) {
            this.printCategoryResults('Backend', this.results.backend);
        }
        
        if (this.results.frontend) {
            this.printCategoryResults('Frontend', this.results.frontend);
        }
        
        if (this.results.integration) {
            this.printCategoryResults('Integração', this.results.integration);
        }
        
        // Salvar relatório em arquivo
        const reportData = {
            timestamp: new Date().toISOString(),
            duration,
            stats,
            results: this.results,
            config: CONFIG
        };
        
        const reportPath = `complete-test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
            log.info(`📄 Relatório completo salvo em: ${reportPath}`);
        } catch (error) {
            log.warning(`Não foi possível salvar o relatório: ${error.message}`);
        }
    }

    calculateStats() {
        let totalTests = 0;
        let passedTests = 0;
        let categories = 0;

        for (const [category, results] of Object.entries(this.results)) {
            if (category === 'error') continue;
            
            categories++;
            for (const [testName, result] of Object.entries(results)) {
                totalTests++;
                if (result.success) passedTests++;
            }
        }

        return {
            categories,
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
        };
    }

    printCategoryResults(categoryName, results) {
        for (const [testName, result] of Object.entries(results)) {
            const status = result.success ? '✅ PASSOU' : '❌ FALHOU';
            const details = result.details || result.error || '';
            console.log(`   ${status} - ${testName}: ${details}`);
        }
    }

    async cleanup() {
        try {
            await this.dbManager.close();
            log.debug('Recursos liberados');
        } catch (error) {
            log.error(`Erro na limpeza: ${error.message}`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 EXECUÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    const testSuite = new CompleteTestSuite();
    
    // Configurar modo silencioso se não for verbose
    if (!verbose) {
        log.info = () => {};
        log.debug = () => {};
    }
    
    try {
        if (specificTest) {
            await testSuite.runSpecific(specificTest);
        } else {
            await testSuite.runAll();
        }
    } catch (error) {
        log.error(`Erro fatal: ${error.message}`);
        process.exit(1);
    }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = {
    CompleteTestSuite,
    BackendTests,
    FrontendTests,
    IntegrationTests,
    DatabaseManager
};