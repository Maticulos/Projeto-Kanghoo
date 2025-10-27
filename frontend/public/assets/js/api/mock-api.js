/**
 * Sistema de Mock para APIs - Ambiente de Teste
 * Simula respostas das APIs para melhorar performance e experiência de desenvolvimento
 */

class MockAPI {
    constructor() {
        this.cache = new Map();
        this.isTestEnvironment = this.detectTestEnvironment();
        this.setupInterceptors();
        this.initializeTestData();
    }

    detectTestEnvironment() {
        // Detecta se estamos em ambiente de teste
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.port === '5000';
    }

    initializeTestData() {
        // Dados de teste realistas
        this.testData = {
            viagemAtiva: {
                id: 'viagem_001',
                status: 'em_andamento',
                motorista: {
                    id: 'mot_001',
                    nome: 'João Silva',
                    telefone: '(11) 99999-9999'
                },
                veiculo: {
                    placa: 'ABC-1234',
                    modelo: 'Mercedes Sprinter',
                    capacidade: 20
                },
                rota: {
                    origem: 'Terminal Rodoviário',
                    destino: 'Parque Ibirapuera',
                    distanciaTotal: 25.5,
                    tempoEstimado: 45
                },
                passageiros: [
                    { id: 1, nome: 'Ana Costa', status: 'embarcado', telefone: '(11) 88888-8888' },
                    { id: 2, nome: 'Carlos Silva', status: 'embarcado', telefone: '(11) 77777-7777' },
                    { id: 3, nome: 'Maria Santos', status: 'aguardando', telefone: '(11) 66666-6666' }
                ],
                localizacao: {
                    lat: -23.5505,
                    lng: -46.6333,
                    timestamp: Date.now(),
                    velocidade: 35,
                    direcao: 'Norte'
                },
                estatisticas: {
                    kmPercorridos: 12.3,
                    tempoViagem: 25,
                    proximaParada: 'Av. Paulista, 1000'
                }
            },
            historico: [
                {
                    id: 'hist_001',
                    data: '2024-01-20',
                    destino: 'Rock in Rio',
                    passageiros: 18,
                    avaliacao: 4.8,
                    receita: 1800.00
                },
                {
                    id: 'hist_002',
                    data: '2024-01-18',
                    destino: 'CCXP',
                    passageiros: 20,
                    avaliacao: 4.9,
                    receita: 2000.00
                }
            ],
            estatisticasGerais: {
                totalViagens: 156,
                totalPassageiros: 2847,
                kmTotais: 15420,
                avaliacaoMedia: 4.7,
                receitaTotal: 89500.00
            }
        };
    }

    setupInterceptors() {
        if (!this.isTestEnvironment) return;

        // Intercepta fetch para APIs específicas
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            const urlStr = url.toString();
            
            // Mock para validate-token
            if (urlStr.includes('/api/validate-token')) {
                return this.mockValidateToken(options);
            }
            
            // Mock para viagem-ativa
            if (urlStr.includes('/api/rastreamento/viagem-ativa')) {
                return new Promise(resolve => {
                    setTimeout(() => {
                        const viagemAtiva = window.testDataGenerator?.getViagemAtiva() || this.getDefaultViagemAtiva();
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({
                                success: true,
                                data: viagemAtiva
                            })
                        });
                    }, this.getRandomDelay());
                });
            }
            
            // Mock para /api/rastreamento/historico
            if (urlStr.includes('/api/rastreamento/historico')) {
                return new Promise(resolve => {
                    setTimeout(() => {
                        const historico = window.testDataGenerator?.getHistorico(20) || this.getDefaultHistorico();
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({
                                success: true,
                                data: historico
                            })
                        });
                    }, this.getRandomDelay());
                });
            }
            
            // Mock para outras APIs de rastreamento
            if (urlStr.includes('/api/rastreamento/')) {
                return this.mockRastreamentoAPI(urlStr);
            }
            
            // Mock para login - DESABILITADO para usar servidor real
            // if (urlStr.includes('/login') && options.method === 'POST') {
            //     return this.mockLogin(options);
            // }
            
            // Para outras requisições, usa fetch normal
            return originalFetch(url, options);
        };
    }

    async mockValidateToken(options) {
        await this.simulateNetworkDelay(100);
        
        const authHeader = options.headers?.Authorization || options.headers?.authorization;
        const token = authHeader?.replace('Bearer ', '') || localStorage.getItem('authToken');
        
        if (!token) {
            return new Response(JSON.stringify({ valid: false, error: 'Token não fornecido' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Valida tokens de teste
        if (token.startsWith('test_token_')) {
            try {
                const decoded = JSON.parse(atob(token.replace('test_token_', '')));
                const isExpired = decoded.exp && decoded.exp < Date.now();
                
                if (isExpired) {
                    return new Response(JSON.stringify({ valid: false, error: 'Token expirado' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                return new Response(JSON.stringify({ 
                    valid: true, 
                    user: decoded,
                    permissions: this.getUserPermissions(decoded.tipo)
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                return new Response(JSON.stringify({ valid: false, error: 'Token inválido' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Para tokens reais, simula validação
        return new Response(JSON.stringify({ valid: false, error: 'Token inválido' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async mockViagemAtiva() {
        await this.simulateNetworkDelay(200);
        
        // Simula dados dinâmicos
        const viagemAtual = { ...this.testData.viagemAtiva };
        viagemAtual.localizacao.timestamp = Date.now();
        viagemAtual.localizacao.lat += (Math.random() - 0.5) * 0.001; // Simula movimento
        viagemAtual.localizacao.lng += (Math.random() - 0.5) * 0.001;
        
        return new Response(JSON.stringify(viagemAtual), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async mockRastreamentoAPI(url) {
        await this.simulateNetworkDelay(150);
        
        if (url.includes('/historico')) {
            return new Response(JSON.stringify(this.testData.historico), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (url.includes('/estatisticas')) {
            return new Response(JSON.stringify(this.testData.estatisticasGerais), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async mockLogin(options) {
        await this.simulateNetworkDelay(300);
        
        try {
            const body = JSON.parse(options.body);
            const { email, senha } = body;
            
            // Credenciais de teste
            const testUsers = {
                'motorista@teste.com': { tipo: 'motorista_excursao', nome: 'João Silva' },
                'escolar@teste.com': { tipo: 'motorista_escolar', nome: 'Maria Santos' },
                'responsavel@teste.com': { tipo: 'responsavel', nome: 'Ana Costa' },
                'admin@teste.com': { tipo: 'admin', nome: 'Admin Teste' }
            };
            
            const user = testUsers[email];
            const validPassword = (email === 'admin@teste.com' && senha === 'admin123') || 
                                 (email !== 'admin@teste.com' && senha === '123456');
            
            if (user && validPassword) {
                const token = this.generateTestToken(email, user.tipo, user.nome);
                return new Response(JSON.stringify({ 
                    token, 
                    user: { email, tipo: user.tipo, nome: user.nome },
                    message: 'Login realizado com sucesso'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    generateTestToken(email, tipo, nome) {
        const payload = {
            email,
            tipo,
            nome,
            iat: Date.now(),
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
        };
        return 'test_token_' + btoa(JSON.stringify(payload));
    }

    getUserPermissions(tipo) {
        const permissions = {
            'motorista_excursao': ['view_excursoes', 'manage_passageiros', 'view_rotas'],
            'motorista_escolar': ['view_escolar', 'manage_criancas', 'view_rotas'],
            'responsavel': ['view_criancas', 'track_transport'],
            'admin': ['all']
        };
        return permissions[tipo] || [];
    }

    async simulateNetworkDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getRandomDelay() {
        return Math.random() * 500 + 200; // 200-700ms
    }

    // Métodos de fallback para dados padrão
    getDefaultViagemAtiva() {
        return {
            id: 'viagem_123',
            status: 'em_andamento',
            motorista: {
                id: 'mot_001',
                nome: 'João Silva',
                telefone: '(11) 99999-9999'
            },
            veiculo: {
                id: 'vei_001',
                placa: 'ABC-1234',
                modelo: 'Mercedes Sprinter'
            },
            rota: {
                origem: 'Terminal Tietê',
                destino: 'Rock in Rio - Cidade do Rock',
                distanciaTotal: 45,
                tempoEstimado: 90
            },
            passageiros: Array.from({length: 18}, (_, i) => ({
                id: `pass_${i + 1}`,
                nome: `Passageiro ${i + 1}`,
                status: 'embarcado'
            })),
            localizacao: {
                lat: -23.5505,
                lng: -46.6333,
                timestamp: Date.now(),
                velocidade: 35
            },
            estatisticas: {
                kmPercorridos: 25,
                tempoViagem: 45,
                velocidadeMedia: 35,
                proximaParada: 'Av. Paulista, 1000'
            },
            inicioViagem: Date.now() - (45 * 60 * 1000),
            previsaoChegada: Date.now() + (30 * 60 * 1000)
        };
    }

    getDefaultHistorico() {
        return Array.from({length: 10}, (_, i) => ({
            id: `hist_${i + 1}`,
            data: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            destino: `Evento ${i + 1}`,
            origem: 'Terminal Tietê',
            passageiros: Math.floor(Math.random() * 10) + 10,
            distancia: Math.floor(Math.random() * 100) + 50,
            duracao: Math.floor(Math.random() * 120) + 60,
            avaliacao: (Math.random() * 2 + 3).toFixed(1),
            receita: Math.floor(Math.random() * 2000) + 1000,
            status: 'concluida'
        }));
    }

    getDefaultEstatisticas() {
        return {
            totalViagens: 156,
            totalPassageiros: 2340,
            kmTotais: 12500,
            avaliacaoMedia: 4.8,
            receitaTotal: 125000,
            receitaMensal: 15000,
            viagensMes: 25,
            mediaPassageirosPorViagem: 15,
            eficienciaCombustivel: 9.5,
            tempoMedioViagem: 120,
            pontualidade: 92,
            satisfacaoCliente: 94
        };
    }

    // Métodos públicos para uso direto
    getTestData(type) {
        return this.testData[type] || null;
    }

    updateTestData(type, data) {
        this.testData[type] = { ...this.testData[type], ...data };
    }

    clearCache() {
        this.cache.clear();
    }
}

// Inicializa o sistema de mock automaticamente
window.mockAPI = new MockAPI();

// Exporta para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockAPI;
}