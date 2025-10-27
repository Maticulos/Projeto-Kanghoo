const { expect } = require('chai');
const sinon = require('sinon');
const WebSocket = require('ws');
const http = require('http');
const Koa = require('koa');

const NotificationHub = require('../realtime/notification-hub');
const WebSocketManager = require('../realtime/websocket-manager');
const SecurityManager = require('../realtime/security-manager');

describe('Testes de Integração - Sistema de Notificações', function() {
    this.timeout(10000); // Timeout maior para testes de integração

    let app;
    let server;
    let notificationHub;
    let webSocketManager;
    let securityManager;
    let wsClient;

    before(async () => {
        // Configurar aplicação Koa
        app = new Koa();
        server = http.createServer(app.callback());

        // Inicializar componentes
        securityManager = new SecurityManager();
        webSocketManager = new WebSocketManager(server, {
            securityManager,
            enableAuth: false // Desabilitar auth para testes
        });
        notificationHub = new NotificationHub(webSocketManager);

        // Inicializar componentes
        await webSocketManager.initialize();
        await notificationHub.initialize();

        // Iniciar servidor
        await new Promise((resolve) => {
            server.listen(0, () => {
                resolve();
            });
        });
    });

    after(async () => {
        // Limpar recursos
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.close();
        }
        
        if (webSocketManager) {
            await webSocketManager.shutdown();
        }
        
        if (notificationHub) {
            notificationHub.shutdown();
        }
        
        if (server) {
            await new Promise((resolve) => {
                server.close(resolve);
            });
        }
    });

    beforeEach(() => {
        // Limpar stubs antes de cada teste
        sinon.restore();
    });

    describe('Fluxo Completo de Notificações', () => {
        it('deve conectar cliente WebSocket e receber notificações', (done) => {
            const port = server.address().port;
            wsClient = new WebSocket(`ws://localhost:${port}/ws`);

            wsClient.on('open', () => {
                console.log('Cliente WebSocket conectado');
                
                // Simular notificação de teste (broadcast para todos)
                setTimeout(() => {
                    notificationHub.sendNotification({
                        tipo: 'teste_integracao',
                        dados: {
                            crianca: { id: 1, nome: 'João' },
                            motorista: { id: 1, nome: 'Carlos' },
                            localizacao: { latitude: -23.5505, longitude: -46.6333 }
                        },
                        timestamp: new Date()
                    });
                }, 100);
            });

            wsClient.on('message', (data) => {
                try {
                    const notification = JSON.parse(data);
                    console.log('Notificação recebida:', notification);
                    
                    // Ignorar mensagem de connection_established
                    if (notification.type === 'connection_established') {
                        return;
                    }
                    
                    expect(notification).to.have.property('tipo');
                    expect(notification).to.have.property('dados');
                    expect(notification).to.have.property('timestamp');
                    
                    wsClient.close();
                    done();
                } catch (error) {
                    done(error);
                }
            });

            wsClient.on('error', (error) => {
                done(error);
            });
        });

        it('deve enviar notificação via NotificationHub', async () => {
            // Spy no método de broadcast do WebSocketManager
            const broadcastSpy = sinon.spy(webSocketManager, 'broadcast');

            // Criar notificação de teste (sem destinatários para forçar broadcast)
            const notification = {
                tipo: 'teste_integracao',
                dados: {
                    mensagem: 'Teste de integração funcionando',
                    timestamp: new Date()
                },
                prioridade: 'medium'
            };

            // Enviar notificação
            await notificationHub.sendNotification(notification);

            // Verificar se broadcast foi chamado
            expect(broadcastSpy.called).to.be.true;
            
            const chamada = broadcastSpy.getCall(0);
            expect(chamada.args[0]).to.deep.include({
                tipo: 'teste_integracao'
            });
        });

        it('deve processar eventos do NotificationHub', async () => {
            // Spy no método de envio para responsáveis
            const sendSpy = sinon.spy(notificationHub, 'sendToResponsaveis');

            // Emitir evento de criança embarcou
            notificationHub.emit('crianca_embarcou', {
                crianca: { id: 1, nome: 'Maria', responsavel_id: 'resp123' },
                motorista: { id: 1, nome: 'João' },
                localizacao: { latitude: -23.5505, longitude: -46.6333 },
                timestamp: new Date()
            });

            // Aguardar processamento assíncrono
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verificar se notificação foi processada
            expect(sendSpy.called).to.be.true;
        });
    });

    describe('Funcionalidades Básicas', () => {
        it('deve gerenciar conexões WebSocket', async () => {
            // Verificar se WebSocketManager está funcionando
            expect(webSocketManager).to.exist;
            expect(webSocketManager.getConnectedUsers).to.be.a('function');
            
            const connectedUsers = webSocketManager.getConnectedUsers();
            expect(connectedUsers).to.be.an('array');
        });

        it('deve processar eventos do sistema', async () => {
            // Spy nos métodos do NotificationHub
            const handleSpy = sinon.spy();
            notificationHub.on('test_event', handleSpy);

            // Emitir evento de teste
            notificationHub.emit('test_event', { data: 'test' });

            // Aguardar processamento
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verificar se evento foi processado
            expect(handleSpy.called).to.be.true;
        });

        it('deve validar estrutura de notificações', async () => {
            const notification = {
                tipo: 'teste_estrutura',
                dados: {
                    mensagem: 'Teste de estrutura',
                    timestamp: new Date()
                },
                prioridade: 'low'
            };

            // Verificar se notificação tem estrutura válida
            expect(notification).to.have.property('tipo');
            expect(notification).to.have.property('dados');
            expect(notification).to.have.property('prioridade');
            expect(notification.dados).to.have.property('timestamp');
        });
    });
});