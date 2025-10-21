const { expect } = require('chai');
const sinon = require('sinon');
const EventEmitter = require('eventemitter3');

const NotificationHub = require('../realtime/notification-hub');

describe('NotificationHub - Testes Unitários', function() {
    let notificationHub;
    let mockWebSocketManager;

    beforeEach(() => {
        // Mock do WebSocketManager
        mockWebSocketManager = {
            broadcast: sinon.stub(),
            sendToUser: sinon.stub(),
            getConnectedUsers: sinon.stub().returns([]),
            isUserConnected: sinon.stub().returns(true)
        };

        // Inicializar NotificationHub
        notificationHub = new NotificationHub(mockWebSocketManager);
    });

    afterEach(() => {
        sinon.restore();
        if (notificationHub) {
            notificationHub.removeAllListeners();
        }
    });

    describe('Inicialização', () => {
        it('deve inicializar corretamente', () => {
            expect(notificationHub).to.be.instanceOf(EventEmitter);
            expect(notificationHub.wsManager).to.equal(mockWebSocketManager);
        });

        it('deve ter métodos essenciais', () => {
            expect(notificationHub.sendNotification).to.be.a('function');
            expect(notificationHub.initialize).to.be.a('function');
            expect(notificationHub.shutdown).to.be.a('function');
        });
    });

    describe('Envio de Notificações', () => {
        it('deve enviar notificação via broadcast', async () => {
            const notification = {
                tipo: 'teste',
                dados: { mensagem: 'Teste de notificação' },
                prioridade: 'medium'
            };

            await notificationHub.sendNotification(notification);

            expect(mockWebSocketManager.broadcast.called).to.be.true;
            const chamada = mockWebSocketManager.broadcast.getCall(0);
            expect(chamada.args[0]).to.deep.include({
                tipo: 'teste'
            });
        });

        it('deve enviar notificação para usuário específico', async () => {
            const notification = {
                tipo: 'teste_usuario',
                dados: { mensagem: 'Teste para usuário específico' },
                prioridade: 'high',
                destinatarios: ['user123']
            };

            await notificationHub.sendNotification(notification);

            expect(mockWebSocketManager.sendToUser.called).to.be.true;
            const chamada = mockWebSocketManager.sendToUser.getCall(0);
            expect(chamada.args[0]).to.equal('user123');
        });

        it('deve adicionar timestamp à notificação', async () => {
            const notification = {
                tipo: 'teste_timestamp',
                dados: { mensagem: 'Teste de timestamp' }
            };

            await notificationHub.sendNotification(notification);

            expect(mockWebSocketManager.broadcast.called).to.be.true;
            const chamada = mockWebSocketManager.broadcast.getCall(0);
            expect(chamada.args[0]).to.have.property('timestamp');
        });
    });

    describe('Processamento de Eventos', () => {
        beforeEach(async () => {
            // Inicializar o hub para registrar os listeners
            await notificationHub.initialize();
        });

        it('deve processar evento de criança embarcou', async () => {
            const sendToResponsaveisSpy = sinon.spy(notificationHub, 'sendToResponsaveis');

            const dadosEmbarque = {
                crianca: { id: 1, nome: 'João', responsavel_id: 'resp123' },
                motorista: { id: 1, nome: 'Carlos' },
                localizacao: { latitude: -23.5505, longitude: -46.6333 },
                timestamp: new Date()
            };

            notificationHub.emit('crianca_embarcou', dadosEmbarque);

            // Aguardar processamento assíncrono
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(sendToResponsaveisSpy.called).to.be.true;
        });

        it('deve processar evento de emergência', async () => {
            const sendToResponsaveisSpy = sinon.spy(notificationHub, 'sendToResponsaveis');

            const dadosEmergencia = {
                tipo: 'acidente',
                motorista: { nome: 'Carlos', telefone: '11999999999' },
                localizacao: { latitude: -23.5505, longitude: -46.6333 },
                criancas_embarcadas: [
                    { responsavel_id: 'resp123' },
                    { responsavel_id: 'resp456' }
                ],
                descricao: 'Acidente leve na via'
            };

            notificationHub.emit('emergencia', dadosEmergencia);

            // Aguardar processamento assíncrono
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(sendToResponsaveisSpy.called).to.be.true;
        });

        it('deve processar evento de atraso detectado', async () => {
            const sendToResponsaveisSpy = sinon.spy(notificationHub, 'sendToResponsaveis');

            const dadosAtraso = {
                motorista: { nome: 'Carlos', telefone: '11999999999' },
                atraso_minutos: 15,
                motivo: 'trânsito intenso',
                criancas_afetadas: [
                    { responsavel_id: 'resp123' },
                    { responsavel_id: 'resp456' }
                ]
            };

            notificationHub.emit('atraso_detectado', dadosAtraso);

            // Aguardar processamento assíncrono
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(sendToResponsaveisSpy.called).to.be.true;
        });
    });

    describe('Validação de Dados', () => {
        it('deve validar estrutura de notificação', async () => {
            const notificationInvalida = {
                // Faltando tipo
                dados: { mensagem: 'Teste' }
            };

            try {
                await notificationHub.sendNotification(notificationInvalida);
                expect.fail('Deveria ter lançado erro para notificação inválida');
            } catch (error) {
                expect(error.message).to.include('tipo');
            }
        });

        it('deve aceitar notificação válida', async () => {
            const notificationValida = {
                tipo: 'teste_valido',
                dados: { mensagem: 'Teste válido' },
                prioridade: 'low'
            };

            // Não deve lançar erro
            await notificationHub.sendNotification(notificationValida);
            expect(mockWebSocketManager.broadcast.called).to.be.true;
        });
    });

    describe('Gerenciamento de Estado', () => {
        it('deve inicializar corretamente', async () => {
            await notificationHub.initialize();
            // Verificar se inicialização foi bem-sucedida
            expect(notificationHub.wsManager).to.exist;
        });

        it('deve fazer shutdown corretamente', () => {
            notificationHub.shutdown();
            // Verificar se listeners foram removidos
            expect(notificationHub.listenerCount()).to.equal(0);
        });
    });

    describe('Integração com WebSocketManager', () => {
        it('deve usar broadcast quando não há destinatários específicos', async () => {
            const notification = {
                tipo: 'broadcast_test',
                dados: { mensagem: 'Teste de broadcast' }
            };

            await notificationHub.sendNotification(notification);

            expect(mockWebSocketManager.broadcast.called).to.be.true;
            expect(mockWebSocketManager.sendToUser.called).to.be.false;
        });

        it('deve usar sendToUser quando há destinatários específicos', async () => {
            const notification = {
                tipo: 'user_test',
                dados: { mensagem: 'Teste para usuário' },
                destinatarios: ['user456']
            };

            await notificationHub.sendNotification(notification);

            expect(mockWebSocketManager.sendToUser.called).to.be.true;
            expect(mockWebSocketManager.broadcast.called).to.be.false;
        });
    });
});