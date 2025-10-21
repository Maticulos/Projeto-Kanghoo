const { expect } = require('chai');
const sinon = require('sinon');
const SecurityManager = require('../realtime/security-manager');

describe('SecurityManager', () => {
    let securityManager;
    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        securityManager = new SecurityManager({
            maxConnectionsPerIP: 5,
            maxMessagesPerMinute: 10,
            allowedOrigins: ['http://localhost:3000', 'https://example.com'],
            enableAuditLogs: true
        });
    });

    afterEach(() => {
        clock.restore();
        sinon.restore();
    });

    describe('Inicialização', () => {
        it('deve inicializar com configurações padrão', () => {
            const defaultManager = new SecurityManager();
            
            expect(defaultManager.config.maxConnectionsPerIP).to.equal(10);
            expect(defaultManager.config.maxMessagesPerMinute).to.equal(60);
            expect(defaultManager.config.enableAuditLogs).to.be.false;
        });

        it('deve inicializar com configurações customizadas', () => {
            expect(securityManager.config.maxConnectionsPerIP).to.equal(5);
            expect(securityManager.config.maxMessagesPerMinute).to.equal(10);
            expect(securityManager.config.enableAuditLogs).to.be.true;
        });
    });

    describe('Rate Limiting por IP', () => {
        it('deve permitir conexões dentro do limite', async () => {
            const ip = '192.168.1.1';
            
            // Adicionar 4 conexões (dentro do limite de 5)
            for (let i = 0; i < 4; i++) {
                const result = await securityManager.checkConnection(ip, 'http://localhost:3000');
                expect(result).to.be.true;
                securityManager.addConnection(ip, `user${i}`);
            }
            
            expect(securityManager.connectionsByIP.get(ip)).to.equal(4);
        });

        it('deve bloquear conexões acima do limite', async () => {
            const ip = '192.168.1.1';
            
            // Adicionar 5 conexões (limite máximo)
            for (let i = 0; i < 5; i++) {
                securityManager.addConnection(ip, `user${i}`);
            }
            
            // Tentar adicionar a 6ª conexão
            const result = await securityManager.checkConnection(ip, 'http://localhost:3000');
            expect(result).to.be.false;
        });

        it('deve remover conexão corretamente', () => {
            const ip = '192.168.1.1';
            
            securityManager.addConnection(ip, 'user1');
            securityManager.addConnection(ip, 'user2');
            expect(securityManager.connectionsByIP.get(ip)).to.equal(2);
            
            securityManager.removeConnection(ip);
            expect(securityManager.connectionsByIP.get(ip)).to.equal(1);
            
            securityManager.removeConnection(ip);
            expect(securityManager.connectionsByIP.has(ip)).to.be.false;
        });
    });

    describe('Rate Limiting por Usuário', () => {
        it('deve permitir mensagens dentro do limite', async () => {
            const userId = 'user123';
            
            // Enviar 9 mensagens (dentro do limite de 10 por minuto)
            for (let i = 0; i < 9; i++) {
                const result = await securityManager.checkMessage(userId, 'test message', 100);
                expect(result).to.be.true;
            }
        });

        it('deve bloquear mensagens acima do limite', async () => {
            const userId = 'user123';
            
            // Enviar 10 mensagens (limite máximo)
            for (let i = 0; i < 10; i++) {
                await securityManager.checkMessage(userId, 'test message', 100);
            }
            
            // Tentar enviar a 11ª mensagem
            const result = await securityManager.checkMessage(userId, 'test message', 100);
            expect(result).to.be.false;
        });

        it('deve resetar contador após 1 minuto', async () => {
            const userId = 'user123';
            
            // Enviar 10 mensagens
            for (let i = 0; i < 10; i++) {
                await securityManager.checkMessage(userId, 'test message', 100);
            }
            
            // Avançar 1 minuto
            clock.tick(60000);
            
            // Deve permitir nova mensagem
            const result = await securityManager.checkMessage(userId, 'test message', 100);
            expect(result).to.be.true;
        });
    });

    describe('Validação de Origem', () => {
        it('deve permitir origens autorizadas', async () => {
            const result1 = await securityManager.checkConnection('127.0.0.1', 'http://localhost:3000');
            const result2 = await securityManager.checkConnection('127.0.0.1', 'https://example.com');
            
            expect(result1).to.be.true;
            expect(result2).to.be.true;
        });

        it('deve bloquear origens não autorizadas', async () => {
            const result = await securityManager.checkConnection('127.0.0.1', 'https://malicious.com');
            expect(result).to.be.false;
        });

        it('deve permitir qualquer origem quando lista vazia', async () => {
            const openManager = new SecurityManager({ allowedOrigins: [] });
            const result = await openManager.checkConnection('127.0.0.1', 'https://any-site.com');
            expect(result).to.be.true;
        });
    });

    describe('Detecção de Spam', () => {
        it('deve detectar mensagens muito grandes', async () => {
            const userId = 'user123';
            const largeMessage = 'x'.repeat(10001); // Acima do limite de 10KB
            
            const result = await securityManager.checkMessage(userId, largeMessage, largeMessage.length);
            expect(result).to.be.false;
        });

        it('deve detectar mensagens repetidas', async () => {
            const userId = 'user123';
            const message = 'spam message';
            
            // Enviar a mesma mensagem 3 vezes
            for (let i = 0; i < 3; i++) {
                await securityManager.checkMessage(userId, message, 100);
            }
            
            // 4ª mensagem idêntica deve ser bloqueada
            const result = await securityManager.checkMessage(userId, message, 100);
            expect(result).to.be.false;
        });

        it('deve permitir mensagens diferentes', async () => {
            const userId = 'user123';
            
            const result1 = await securityManager.checkMessage(userId, 'message 1', 100);
            const result2 = await securityManager.checkMessage(userId, 'message 2', 100);
            const result3 = await securityManager.checkMessage(userId, 'message 3', 100);
            
            expect(result1).to.be.true;
            expect(result2).to.be.true;
            expect(result3).to.be.true;
        });
    });

    describe('Blacklist de IPs', () => {
        it('deve bloquear IPs na blacklist', async () => {
            const maliciousIP = '192.168.1.100';
            
            securityManager.addToBlacklist(maliciousIP, 'Atividade suspeita');
            
            const result = await securityManager.checkConnection(maliciousIP, 'http://localhost:3000');
            expect(result).to.be.false;
        });

        it('deve remover IP da blacklist', async () => {
            const ip = '192.168.1.100';
            
            securityManager.addToBlacklist(ip, 'Teste');
            expect(securityManager.isBlacklisted(ip)).to.be.true;
            
            securityManager.removeFromBlacklist(ip);
            expect(securityManager.isBlacklisted(ip)).to.be.false;
        });

        it('deve limpar blacklist automaticamente após expiração', () => {
            const ip = '192.168.1.100';
            
            securityManager.addToBlacklist(ip, 'Teste', 1000); // 1 segundo
            expect(securityManager.isBlacklisted(ip)).to.be.true;
            
            // Avançar 2 segundos
            clock.tick(2000);
            securityManager.cleanupBlacklist();
            
            expect(securityManager.isBlacklisted(ip)).to.be.false;
        });
    });

    describe('Monitoramento de Atividades Suspeitas', () => {
        it('deve detectar múltiplas tentativas de conexão falhadas', async () => {
            const ip = '192.168.1.1';
            
            // Simular 5 tentativas falhadas
            for (let i = 0; i < 5; i++) {
                securityManager.logFailedAttempt(ip, 'Invalid token');
            }
            
            // IP deve ser automaticamente adicionado à blacklist
            expect(securityManager.isBlacklisted(ip)).to.be.true;
        });

        it('deve resetar contador de tentativas após sucesso', async () => {
            const ip = '192.168.1.1';
            
            // 3 tentativas falhadas
            for (let i = 0; i < 3; i++) {
                securityManager.logFailedAttempt(ip, 'Invalid token');
            }
            
            // Conexão bem-sucedida
            await securityManager.checkConnection(ip, 'http://localhost:3000');
            
            // Contador deve ser resetado
            expect(securityManager.failedAttempts.get(ip)).to.be.undefined;
        });
    });

    describe('Logs de Auditoria', () => {
        it('deve registrar atividades quando habilitado', () => {
            const consoleSpy = sinon.spy(console, 'log');
            
            securityManager.logActivity('user123', 'connection', { ip: '127.0.0.1' });
            
            expect(consoleSpy.calledOnce).to.be.true;
            const logMessage = consoleSpy.getCall(0).args[0];
            expect(logMessage).to.include('[SECURITY]');
            expect(logMessage).to.include('user123');
            expect(logMessage).to.include('connection');
        });

        it('não deve registrar quando desabilitado', () => {
            const noLogManager = new SecurityManager({ enableAuditLogs: false });
            const consoleSpy = sinon.spy(console, 'log');
            
            noLogManager.logActivity('user123', 'connection', { ip: '127.0.0.1' });
            
            expect(consoleSpy.called).to.be.false;
        });
    });

    describe('Estatísticas', () => {
        it('deve retornar estatísticas corretas', () => {
            const ip1 = '192.168.1.1';
            const ip2 = '192.168.1.2';
            
            securityManager.addConnection(ip1, 'user1');
            securityManager.addConnection(ip1, 'user2');
            securityManager.addConnection(ip2, 'user3');
            
            securityManager.addToBlacklist('192.168.1.100', 'Teste');
            
            const stats = securityManager.getStats();
            
            expect(stats).to.deep.equal({
                connections: {
                    total: 3,
                    byIP: {
                        '192.168.1.1': 2,
                        '192.168.1.2': 1
                    }
                },
                blacklist: {
                    total: 1,
                    ips: ['192.168.1.100']
                },
                rateLimiting: {
                    activeUsers: 0,
                    blockedAttempts: 0
                }
            });
        });
    });

    describe('Limpeza Automática', () => {
        it('deve limpar dados expirados', () => {
            const userId = 'user123';
            
            // Adicionar dados que vão expirar
            securityManager.messageHistory.set(userId, {
                count: 5,
                lastReset: Date.now() - 70000, // 70 segundos atrás
                messages: ['msg1', 'msg2']
            });
            
            // Avançar tempo e executar limpeza
            clock.tick(70000);
            securityManager.cleanup();
            
            // Dados devem ter sido removidos
            expect(securityManager.messageHistory.has(userId)).to.be.false;
        });
    });
});