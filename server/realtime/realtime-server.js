/**
 * SERVIDOR DE NOTIFICAÇÕES EM TEMPO REAL
 * 
 * Este é o arquivo principal que integra todos os componentes
 * do sistema de notificações em tempo real:
 * 
 * - WebSocket Manager
 * - Connection Store
 * - Notification Hub
 * - Authentication Middleware
 * - Event Types
 * 
 * Responsável por inicializar e coordenar todo o sistema.
 * 
 * @author Sistema Kanghoo
 * @version 1.0.0
 */

const WebSocket = require('ws');
const http = require('http');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const WebSocketManager = require('./websocket-manager');
const ConnectionStore = require('./connection-store');
const NotificationHub = require('./notification-hub');
const WebSocketAuth = require('./websocket-auth');
const SecurityManager = require('./security-manager');
const gpsTrackingService = require('../utils/gps-tracking-service');
const { EVENT_TYPES, PRIORITY_LEVELS } = require('./event-types');

class RealtimeServer {
    constructor(options = {}) {
        this.options = {
            port: options.port || 8080,
            host: options.host || 'localhost',
            heartbeatInterval: options.heartbeatInterval || 30000,
            maxConnections: options.maxConnections || 1000,
            ...options
        };

        // Componentes principais
        this.server = null;
        this.connectionStore = null;
        this.wsManager = null;
        this.notificationHub = null;
        this.auth = null;

        // Estado do servidor
        this.isRunning = false;
        this.startTime = null;
        
        // Estatísticas
        this.stats = {
            totalConnections: 0,
            totalMessages: 0,
            totalNotifications: 0,
            errors: 0
        };

        logger.info('[REALTIME-SERVER] Servidor de notificações inicializado');
    }

    /**
     * Inicializa o servidor de tempo real
     */
    async initialize() {
        try {
            console.log('[REALTIME-SERVER] Iniciando servidor de notificações em tempo real...');

            // 1. Criar componentes
            this.createComponents();

            // 2. Criar servidor HTTP
            this.createHttpServer();

            // 3. Inicializar componentes (WebSocketManager criará o WebSocket server)
            await this.initializeComponents();

            // 4. Configurar listeners do processo
            this.setupProcessListeners();

            // 5. Configurar cleanup automático
            this.setupCleanupTasks();

            console.log(`[REALTIME-SERVER] Servidor iniciado em ws://${this.options.host}:${this.options.port}`);
            
            this.isRunning = true;
            this.startTime = new Date();

            return true;

        } catch (error) {
            console.error('[REALTIME-SERVER] Erro ao inicializar servidor:', error);
            return false;
        }
    }

    /**
     * Cria os componentes principais
     */
    createComponents() {
        // Store de conexões
        this.connectionStore = new ConnectionStore();

        // Autenticação
        this.auth = new WebSocketAuth({
            jwtSecret: process.env.JWT_SECRET,
            maxConnectionsPerUser: 5,
            allowedOrigins: ['http://localhost:3000', 'https://kanghoo.com']
        });

        // Manager de WebSocket
        this.wsManager = new WebSocketManager(this.options.server, {
            jwtSecret: this.options.jwtSecret,
            securityManager: new SecurityManager({
                maxConnectionsPerIP: 10,
                maxMessagesPerMinute: 60,
                allowedOrigins: ['http://localhost:3000', 'http://localhost:3001', null], // null permite conexões diretas
                enableAuditLogs: true
            })
        });

        // Hub de notificações
        this.notificationHub = new NotificationHub(this.wsManager);
        
        // Conectar o NotificationHub ao WebSocketManager
        this.wsManager.notificationHub = this.notificationHub;

        console.log('[REALTIME-SERVER] Componentes criados');
    }

    /**
     * Cria servidor HTTP básico
     */
    createHttpServer() {
        // Se um servidor foi fornecido nas opções, usar ele
        if (this.options.server) {
            this.server = this.options.server;
            console.log('[REALTIME-SERVER] Usando servidor HTTP existente');
        } else {
            // Caso contrário, criar um novo servidor
            this.server = http.createServer((req, res) => {
                // Endpoint de health check
                if (req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'healthy',
                        uptime: this.getUptime(),
                        connections: this.connectionStore.getActiveConnectionsCount(),
                        stats: this.getStats()
                    }));
                    return;
                }

                // Endpoint de estatísticas
                if (req.url === '/stats') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.getDetailedStats()));
                    return;
                }

                // Resposta padrão
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Kanghoo Realtime Server - WebSocket endpoint available');
            });
            console.log('[REALTIME-SERVER] Servidor HTTP criado');
        }
    }

    /**
     * Configura listeners do processo
     */
    setupProcessListeners() {
        // Listeners do processo
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());

        console.log('[REALTIME-SERVER] Process listeners configurados');
    }

    /**
     * Inicializa componentes
     */
    async initializeComponents() {
        // Inicializar hub de notificações
        const hubInitialized = this.notificationHub.initialize();
        if (!hubInitialized) {
            throw new Error('Falha ao inicializar hub de notificações');
        }

        // Inicializar manager de WebSocket
        const managerInitialized = this.wsManager.initialize();
        if (!managerInitialized) {
            throw new Error('Falha ao inicializar WebSocket manager');
        }

        // Inicializar serviço de rastreamento GPS
        gpsTrackingService.initialize(this.notificationHub);

        console.log('[REALTIME-SERVER] Componentes inicializados');
    }



    /**
     * Configura tarefas de limpeza automática
     */
    setupCleanupTasks() {
        // Limpeza a cada 5 minutos
        setInterval(() => {
            this.performCleanup();
        }, 5 * 60 * 1000);

        // Heartbeat a cada 30 segundos
        setInterval(() => {
            this.performHeartbeat();
        }, this.options.heartbeatInterval);

        console.log('[REALTIME-SERVER] Tarefas de limpeza configuradas');
    }

    /**
     * Executa limpeza automática
     */
    performCleanup() {
        try {
            // Limpar conexões inativas
            this.connectionStore.cleanupInactiveConnections();
            
            // Limpar dados de autenticação
            this.auth.cleanup();
            
            // Limpar manager (método não implementado ainda)
            // this.wsManager.cleanup();

            console.log('[REALTIME-SERVER] Limpeza automática executada');
        } catch (error) {
            console.error('[REALTIME-SERVER] Erro na limpeza automática:', error);
        }
    }

    /**
     * Executa heartbeat
     */
    performHeartbeat() {
        try {
            const activeConnections = this.connectionStore.getActiveConnections();
            let pingSent = 0;

            activeConnections.forEach(connection => {
                if (connection.ws.readyState === WebSocket.OPEN) {
                    connection.ws.ping();
                    pingSent++;
                }
            });

            console.log(`[REALTIME-SERVER] Heartbeat enviado para ${pingSent} conexões`);
        } catch (error) {
            console.error('[REALTIME-SERVER] Erro no heartbeat:', error);
        }
    }

    /**
     * Inicia o servidor
     */
    async start() {
        try {
            // Inicializar componentes
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Falha na inicialização');
            }

            // Se estamos usando um servidor existente, não precisamos fazer listen
            if (this.options.server) {
                console.log(`[REALTIME-SERVER] WebSocket anexado ao servidor existente`);
                return true;
            }

            // Iniciar servidor HTTP (apenas se criamos um novo)
            return new Promise((resolve, reject) => {
                this.server.listen(this.options.port, this.options.host, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log(`[REALTIME-SERVER] Servidor rodando em ws://${this.options.host}:${this.options.port}`);
                        resolve(true);
                    }
                });
            });

        } catch (error) {
            console.error('[REALTIME-SERVER] Erro ao iniciar servidor:', error);
            return false;
        }
    }

    /**
     * Método público para shutdown
     */
    async shutdown() {
        return this.gracefulShutdown();
    }

    /**
     * Para o servidor graciosamente
     */
    async gracefulShutdown() {
        console.log('[REALTIME-SERVER] Iniciando shutdown gracioso...');

        try {
            // Parar de aceitar novas conexões
            this.server.close();

            // Notificar clientes sobre shutdown
            this.notificationHub.emit('sistema_indisponivel', {
                motivo: 'Manutenção programada',
                timestamp: new Date()
            });

            // Aguardar um pouco para mensagens serem enviadas
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Fechar todas as conexões WebSocket
            this.wsManager.closeAllConnections();

            // Parar hub de notificações
            this.notificationHub.shutdown();

            this.isRunning = false;
            console.log('[REALTIME-SERVER] Shutdown concluído');

        } catch (error) {
            console.error('[REALTIME-SERVER] Erro durante shutdown:', error);
        }

        process.exit(0);
    }

    /**
     * API pública para emitir eventos
     */
    emit(eventType, eventData) {
        if (!this.isRunning) {
            console.warn('[REALTIME-SERVER] Tentativa de emitir evento com servidor parado');
            return false;
        }

        try {
            this.notificationHub.emit(eventType, eventData);
            this.stats.totalNotifications++;
            return true;
        } catch (error) {
            console.error('[REALTIME-SERVER] Erro ao emitir evento:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * API pública para enviar notificação para usuário específico
     */
    sendToUser(userId, notification) {
        if (!this.isRunning) {
            return false;
        }

        try {
            const sent = this.wsManager.sendToUser(userId, notification);
            if (sent) {
                this.stats.totalMessages++;
            }
            return sent;
        } catch (error) {
            console.error('[REALTIME-SERVER] Erro ao enviar para usuário:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * API pública para broadcast
     */
    broadcast(notification) {
        if (!this.isRunning) {
            return false;
        }

        try {
            const sent = this.wsManager.broadcast(notification);
            this.stats.totalMessages += sent;
            return sent;
        } catch (error) {
            console.error('[REALTIME-SERVER] Erro no broadcast:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Obtém estatísticas básicas
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            uptime: this.getUptime(),
            activeConnections: this.connectionStore.getActiveConnectionsCount()
        };
    }

    /**
     * Obtém estatísticas detalhadas
     */
    getDetailedStats() {
        return {
            server: this.getStats(),
            connections: this.connectionStore.getStats(),
            websocket: this.wsManager.getStats(),
            notifications: this.notificationHub.getStats(),
            auth: this.auth.getStats()
        };
    }

    /**
     * Calcula uptime do servidor
     */
    getUptime() {
        if (!this.startTime) return 0;
        return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    }

    /**
     * Verifica se o servidor está saudável
     */
    isHealthy() {
        return this.isRunning && 
               this.server && 
               this.wss && 
               this.notificationHub.isActive;
    }
}

module.exports = RealtimeServer;