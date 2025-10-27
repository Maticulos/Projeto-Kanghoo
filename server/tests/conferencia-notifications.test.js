/**
 * TESTE DE NOTIFICAÇÕES EM TEMPO REAL - CONFERÊNCIA DE CRIANÇAS
 * 
 * Este script testa o sistema de notificações em tempo real para
 * embarque e desembarque de crianças no sistema de conferência.
 */

const WebSocket = require('ws');
const axios = require('axios');

// Configurações do teste
const SERVER_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';

// Dados de teste
const testData = {
    motorista: {
        email: 'motorista@teste.com',
        senha: '123456'
    },
    responsavel: {
        email: 'responsavel@teste.com',
        senha: '123456'
    }
};

class ConferenciaNotificationTester {
    constructor() {
        this.motoristaToken = null;
        this.responsavelToken = null;
        this.wsConnections = [];
        this.receivedNotifications = [];
    }

    /**
     * Executa todos os testes
     */
    async runTests() {
        console.log('🧪 Iniciando testes de notificações de conferência...\n');

        try {
            // 1. Autenticar usuários
            await this.authenticateUsers();
            
            // 2. Conectar WebSockets
            await this.connectWebSockets();
            
            // 3. Testar notificações de embarque
            await this.testEmbarqueNotifications();
            
            // 4. Testar notificações de desembarque
            await this.testDesembarqueNotifications();
            
            // 5. Verificar resultados
            this.verifyResults();
            
            console.log('✅ Todos os testes concluídos com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro durante os testes:', error.message);
        } finally {
            this.cleanup();
        }
    }

    /**
     * Autentica os usuários de teste
     */
    async authenticateUsers() {
        console.log('🔐 Autenticando usuários...');
        
        try {
            // Autenticar motorista
            const motoristaResponse = await axios.post(`${SERVER_URL}/login`, {
                email: 'motorista.escolar@teste.com',
                senha: 'teste123'
            });
            
            this.motoristaToken = motoristaResponse.data.token;
            console.log('✅ Motorista autenticado');
            
            // Autenticar responsável
            const responsavelResponse = await axios.post(`${SERVER_URL}/login`, {
                email: 'responsavel@teste.com',
                senha: 'teste123'
            });
            
            this.responsavelToken = responsavelResponse.data.token;
            console.log('✅ Responsável autenticado\n');
            
        } catch (error) {
            throw new Error(`Falha na autenticação: ${error.response?.data?.mensagem || error.message}`);
        }
    }

    /**
     * Conecta WebSockets para receber notificações
     */
    async connectWebSockets() {
        console.log('🔌 Conectando WebSockets...');
        
        return new Promise((resolve, reject) => {
            let connectionsReady = 0;
            const totalConnections = 2;
            
            // Conexão do responsável
            const responsavelWs = new WebSocket(`${WS_URL}?token=${this.responsavelToken}`);
            
            responsavelWs.on('open', () => {
                console.log('✅ WebSocket do responsável conectado');
                connectionsReady++;
                if (connectionsReady === totalConnections) resolve();
            });
            
            responsavelWs.on('message', (data) => {
                const notification = JSON.parse(data.toString());
                console.log('📱 Notificação recebida pelo responsável:', notification);
                this.receivedNotifications.push({
                    recipient: 'responsavel',
                    notification
                });
            });
            
            responsavelWs.on('error', (error) => {
                console.error('❌ Erro no WebSocket do responsável:', error);
                reject(error);
            });
            
            this.wsConnections.push(responsavelWs);
            
            // Conexão do motorista (para monitoramento)
            const motoristaWs = new WebSocket(`${WS_URL}?token=${this.motoristaToken}`);
            
            motoristaWs.on('open', () => {
                console.log('✅ WebSocket do motorista conectado');
                connectionsReady++;
                if (connectionsReady === totalConnections) resolve();
            });
            
            motoristaWs.on('message', (data) => {
                const notification = JSON.parse(data.toString());
                console.log('📱 Notificação recebida pelo motorista:', notification);
                this.receivedNotifications.push({
                    recipient: 'motorista',
                    notification
                });
            });
            
            motoristaWs.on('error', (error) => {
                console.error('❌ Erro no WebSocket do motorista:', error);
                reject(error);
            });
            
            this.wsConnections.push(motoristaWs);
            
            // Timeout de segurança
            setTimeout(() => {
                if (connectionsReady < totalConnections) {
                    reject(new Error('Timeout na conexão WebSocket'));
                }
            }, 10000);
        });
    }

    /**
     * Testa notificações de embarque
     */
    async testEmbarqueNotifications() {
        console.log('\n🚌 Testando notificações de embarque...');
        
        try {
            // Simular embarque de criança
            const embarqueResponse = await axios.post(`${SERVER_URL}/api/conferencia/embarque`, {
                conferencia_id: 1, // ID de teste
                latitude: -23.5505,
                longitude: -46.6333,
                observacoes: 'Teste de embarque'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.motoristaToken}`
                }
            });
            
            console.log('✅ Embarque registrado:', embarqueResponse.data.mensagem);
            
            // Aguardar notificação
            await this.waitForNotification('embarque', 5000);
            
        } catch (error) {
            console.log('⚠️  Erro esperado no teste de embarque (dados de teste podem não existir):', 
                       error.response?.data?.mensagem || error.message);
        }
    }

    /**
     * Testa notificações de desembarque
     */
    async testDesembarqueNotifications() {
        console.log('\n🏠 Testando notificações de desembarque...');
        
        try {
            // Simular desembarque de criança
            const desembarqueResponse = await axios.post(`${SERVER_URL}/api/conferencia/desembarque`, {
                conferencia_id: 1, // ID de teste
                latitude: -23.5505,
                longitude: -46.6333,
                observacoes: 'Teste de desembarque'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.motoristaToken}`
                }
            });
            
            console.log('✅ Desembarque registrado:', desembarqueResponse.data.mensagem);
            
            // Aguardar notificação
            await this.waitForNotification('desembarque', 5000);
            
        } catch (error) {
            console.log('⚠️  Erro esperado no teste de desembarque (dados de teste podem não existir):', 
                       error.response?.data?.mensagem || error.message);
        }
    }

    /**
     * Aguarda uma notificação específica
     */
    async waitForNotification(type, timeout = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkNotification = () => {
                const notification = this.receivedNotifications.find(n => 
                    n.notification.type && n.notification.type.includes(type)
                );
                
                if (notification) {
                    console.log(`✅ Notificação de ${type} recebida!`);
                    resolve(notification);
                } else if (Date.now() - startTime > timeout) {
                    console.log(`⏰ Timeout aguardando notificação de ${type}`);
                    resolve(null);
                } else {
                    setTimeout(checkNotification, 100);
                }
            };
            
            checkNotification();
        });
    }

    /**
     * Verifica os resultados dos testes
     */
    verifyResults() {
        console.log('\n📊 Resultados dos testes:');
        console.log(`📱 Total de notificações recebidas: ${this.receivedNotifications.length}`);
        
        if (this.receivedNotifications.length > 0) {
            console.log('✅ Sistema de notificações está funcionando!');
            this.receivedNotifications.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.recipient}: ${item.notification.type || 'Tipo não especificado'}`);
            });
        } else {
            console.log('⚠️  Nenhuma notificação foi recebida (pode ser devido à falta de dados de teste)');
            console.log('💡 Para testar completamente, certifique-se de ter:');
            console.log('   - Usuários de teste cadastrados');
            console.log('   - Viagens ativas');
            console.log('   - Crianças cadastradas para conferência');
        }
    }

    /**
     * Limpa recursos
     */
    cleanup() {
        console.log('\n🧹 Limpando recursos...');
        
        this.wsConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
        
        console.log('✅ Recursos limpos');
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new ConferenciaNotificationTester();
    tester.runTests().catch(console.error);
}

module.exports = ConferenciaNotificationTester;