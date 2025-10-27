const { expect } = require('chai');
const sinon = require('sinon');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const WebSocketManager = require('../realtime/websocket-manager');
const SecurityManager = require('../realtime/security-manager');

describe('WebSocketManager', () => {
    let wsManager;
    let mockServer;
    let mockNotificationHub;
    let mockSecurityManager;
    let mockWss;

    beforeEach(() => {
        // Mock do servidor HTTP
        mockServer = {
            on: sinon.stub()
        };

        // Mock do NotificationHub
        mockNotificationHub = {
            setWebSocketManager: sinon.stub(),
            processQueue: sinon.stub(),
            emit: sinon.stub()
        };

        // Mock do SecurityManager
        mockSecurityManager = {
            checkConnection: sinon.stub().resolves(true),
            checkMessage: sinon.stub().resolves(true),
            validateConnection: sinon.stub().returns({ allowed: true }),
            validateMessage: sinon.stub().returns({ allowed: true }),
            logActivity: sinon.stub()
        };

        // Mock do WebSocket Server
        mockWss = {
            on: sinon.stub(),
            clients: new Set(),
            close: sinon.stub().callsArg(0) // Simula o callback sendo chamado
        };

        // Stub do construtor WebSocket.Server
        sinon.stub(WebSocket, 'Server').returns(mockWss);

        wsManager = new WebSocketManager({
            server: mockServer,
            jwtSecret: 'test-secret',
            notificationHub: mockNotificationHub,
            securityManager: mockSecurityManager
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Inicialização', () => {
        it('deve inicializar corretamente', () => {
            expect(wsManager).to.be.instanceOf(WebSocketManager);
            expect(wsManager.connections).to.be.a('map');
            expect(wsManager.userConnections).to.be.a('map');
            expect(wsManager.groupConnections).to.be.a('map');
        });

        it('deve configurar WebSocket Server', () => {
            wsManager.initialize();
            expect(WebSocket.Server.calledOnce).to.be.true;
            expect(WebSocket.Server.calledWith({
                server: mockServer,
                path: '/ws',
                verifyClient: sinon.match.func
            })).to.be.true;
        });

        it('deve configurar NotificationHub', () => {
            // O NotificationHub é configurado no construtor, não no initialize
            expect(mockNotificationHub.setWebSocketManager.calledOnce).to.be.true;
            expect(mockNotificationHub.setWebSocketManager.calledWith(wsManager)).to.be.true;
        });
    });

    describe('Verificação de Cliente', () => {
        let verifyClient;

        beforeEach(() => {
            // Inicializar o WebSocketManager para criar o servidor
            wsManager.initialize();
            
            // Usar diretamente o método verifyClient do WebSocketManager
            verifyClient = (info, callback) => wsManager.verifyClient(info, callback);
        });

        it('deve aceitar conexão válida', (done) => {
            const token = jwt.sign({ userId: 'user123' }, 'test-secret');
            const info = {
                req: {
                    url: `/?token=${token}`,
                    connection: { remoteAddress: '127.0.0.1' }
                }
            };

            mockSecurityManager.validateConnection.returns({ allowed: true });

            verifyClient(info, (result) => {
                try {
                    expect(result).to.be.true;
                    expect(mockSecurityManager.validateConnection.calledOnce).to.be.true;
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('deve rejeitar conexão sem token', (done) => {
            const info = {
                req: {
                    url: '/',
                    connection: { remoteAddress: '127.0.0.1' }
                }
            };

            verifyClient(info, (result) => {
                try {
                    expect(result).to.be.false;
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('deve rejeitar token inválido', (done) => {
            const info = {
                req: {
                    url: '/?token=invalid-token',
                    connection: { remoteAddress: '127.0.0.1' }
                }
            };

            verifyClient(info, (result) => {
                try {
                    expect(result).to.be.false;
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        it('deve rejeitar conexão bloqueada pelo SecurityManager', (done) => {
            const token = jwt.sign({ userId: 'user123' }, 'test-secret');
            const info = {
                req: {
                    url: `/?token=${token}`,
                    connection: { remoteAddress: '127.0.0.1' }
                }
            };

            mockSecurityManager.validateConnection.returns({ allowed: false, reason: 'Blocked by security' });

            verifyClient(info, (result) => {
                try {
                    expect(result).to.be.false;
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });
    });

    describe('Gerenciamento de Conexões', () => {
        let mockWs;

        beforeEach(() => {
            mockWs = {
                id: 'ws-123',
                userId: 'user123',
                ip: '127.0.0.1',
                on: sinon.stub(),
                send: sinon.stub(),
                close: sinon.stub(),
                readyState: WebSocket.OPEN,
                isAlive: true
            };
        });

        it('deve adicionar conexão corretamente', () => {
            wsManager.addConnection(mockWs);

            expect(wsManager.connections.has('ws-123')).to.be.true;
            expect(wsManager.userConnections.has('user123')).to.be.true;
            expect(wsManager.userConnections.get('user123')).to.include('ws-123');
        });

        it('deve remover conexão corretamente', () => {
            wsManager.addConnection(mockWs);
            wsManager.removeConnection('ws-123');

            expect(wsManager.connections.has('ws-123')).to.be.false;
            const userConnections = wsManager.userConnections.get('user123');
            if (userConnections) {
                expect(userConnections).to.not.include('ws-123');
            } else {
                // Usuário foi removido quando não há mais conexões, o que é esperado
                expect(userConnections).to.be.undefined;
            }
        });

        it('deve adicionar conexão a grupo', () => {
            wsManager.addConnection(mockWs);
            wsManager.addToGroup('ws-123', 'trip123');

            expect(wsManager.groupConnections.has('trip123')).to.be.true;
            expect(wsManager.groupConnections.get('trip123')).to.include('ws-123');
        });

        it('deve remover conexão de grupo', () => {
            wsManager.addConnection(mockWs);
            wsManager.addToGroup('ws-123', 'trip123');
            wsManager.removeFromGroup('ws-123', 'trip123');

            const group = wsManager.groupConnections.get('trip123');
            if (group) {
                expect(group).to.not.include('ws-123');
            } else {
                // Grupo foi deletado quando ficou vazio, o que é esperado
                expect(group).to.be.undefined;
            }
        });
    });

    describe('Envio de Mensagens', () => {
        let mockWs1, mockWs2;

        beforeEach(() => {
            mockWs1 = {
                id: 'ws-1',
                userId: 'user1',
                ip: '127.0.0.1',
                send: sinon.stub(),
                readyState: WebSocket.OPEN,
                isAlive: true
            };

            mockWs2 = {
                id: 'ws-2',
                userId: 'user2',
                ip: '127.0.0.1',
                send: sinon.stub(),
                readyState: WebSocket.OPEN,
                isAlive: true
            };

            wsManager.addConnection(mockWs1);
            wsManager.addConnection(mockWs2);
        });

        it('deve enviar mensagem para usuário específico', () => {
            const message = { type: 'test', data: 'hello' };
            
            wsManager.sendToUser('user1', message);

            expect(mockWs1.send.calledOnce).to.be.true;
            expect(mockWs1.send.calledWith(JSON.stringify(message))).to.be.true;
            expect(mockWs2.send.called).to.be.false;
        });

        it('deve fazer broadcast para todas as conexões', () => {
            const message = { type: 'broadcast', data: 'hello all' };
            
            wsManager.broadcast(message);

            expect(mockWs1.send.calledOnce).to.be.true;
            expect(mockWs1.send.calledWith(JSON.stringify(message))).to.be.true;
            expect(mockWs2.send.calledOnce).to.be.true;
            expect(mockWs2.send.calledWith(JSON.stringify(message))).to.be.true;
        });

        it('deve enviar mensagem para grupo', () => {
            wsManager.addToGroup('ws-1', 'group1');
            const message = { type: 'group', data: 'hello group' };
            
            wsManager.sendToGroup('group1', message);

            expect(mockWs1.send.calledOnce).to.be.true;
            expect(mockWs1.send.calledWith(JSON.stringify(message))).to.be.true;
            expect(mockWs2.send.called).to.be.false;
        });

        it('deve lidar com erro de envio', () => {
            mockWs1.send.throws(new Error('Send error'));
            const message = { type: 'test', data: 'hello' };
            
            // Não deve lançar erro
            expect(() => {
                wsManager.sendToUser('user1', message);
            }).to.not.throw();
        });

        it('deve ignorar conexões fechadas', () => {
            mockWs1.readyState = WebSocket.CLOSED;
            const message = { type: 'test', data: 'hello' };
            
            wsManager.sendToUser('user1', message);

            expect(mockWs1.send.called).to.be.false;
        });
    });

    describe('Processamento de Mensagens', () => {
        let mockWs;

        beforeEach(() => {
            mockWs = {
                id: 'ws-123',
                userId: 'user123',
                clientIP: '127.0.0.1',
                user: { id: 'user123' },
                connectionId: 'ws-123',
                ip: '127.0.0.1',
                send: sinon.stub(),
                close: sinon.stub(),
                readyState: WebSocket.OPEN,
                isAlive: true
            };

            wsManager.addConnection(mockWs);
        });

        it('deve processar mensagem válida', async () => {
            const message = JSON.stringify({
                type: 'join_group',
                data: { groupId: 'trip123' }
            });

            mockSecurityManager.validateMessage.returns({ allowed: true });

            await wsManager.handleMessage(mockWs, message);

            expect(mockSecurityManager.validateMessage.calledOnce).to.be.true;
            expect(wsManager.groupConnections.get('trip123')).to.include('ws-123');
        });

        it('deve rejeitar mensagem inválida', async () => {
            const message = 'invalid json';

            await wsManager.handleMessage(mockWs, message);

            expect(mockWs.send.calledOnce).to.be.true;
            const sentMessage = JSON.parse(mockWs.send.getCall(0).args[0]);
            expect(sentMessage.type).to.equal('error');
        });

        it('deve fechar conexão bloqueada pelo SecurityManager', async () => {
            const message = JSON.stringify({ type: 'spam' });

            mockSecurityManager.validateMessage.returns({ allowed: false, reason: 'spam detected' });

            await wsManager.handleMessage(mockWs, message);

            expect(mockWs.close.calledOnce).to.be.true;
        });
    });

    describe('Estatísticas', () => {
        it('deve retornar estatísticas corretas', () => {
            const mockWs1 = {
                id: 'ws-1',
                userId: 'user1',
                ip: '127.0.0.1',
                readyState: WebSocket.OPEN,
                isAlive: true
            };

            const mockWs2 = {
                id: 'ws-2',
                userId: 'user1',
                ip: '127.0.0.1',
                readyState: WebSocket.OPEN,
                isAlive: true
            };

            wsManager.addConnection(mockWs1);
            wsManager.addConnection(mockWs2);

            const stats = wsManager.getConnectionStats();

            expect(stats).to.deep.equal({
                total: 2,
                byUser: { user1: 2 }
            });
        });
    });

    describe('Shutdown', () => {
        it('deve fechar todas as conexões', async () => {
            // Inicializar o WebSocketManager para criar o wss
            wsManager.initialize();

            const mockWs = {
                id: 'ws-123',
                userId: 'user123',
                close: sinon.stub(),
                readyState: WebSocket.OPEN
            };

            wsManager.addConnection(mockWs);

            await wsManager.shutdown();

            expect(mockWs.close.calledOnce).to.be.true;
            expect(mockWss.close.calledOnce).to.be.true;
        });
    });
});