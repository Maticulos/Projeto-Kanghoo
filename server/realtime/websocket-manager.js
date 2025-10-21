/**
 * GERENCIADOR DE WEBSOCKET
 * 
 * Este arquivo é o coração do sistema de notificações em tempo real.
 * Gerencia todas as conexões WebSocket, autenticação e distribuição de mensagens.
 * 
 * Funcionalidades:
 * - Gerenciamento de conexões ativas
 * - Autenticação de usuários via JWT
 * - Distribuição de notificações direcionadas
 * - Heartbeat para manter conexões vivas
 * - Logs detalhados para debug
 * 
 * @author Sistema Kanghoo
 * @version 1.0.0
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const jwt = require('jsonwebtoken');
const ConnectionStore = require('./connection-store');
const WebSocketAuth = require('./websocket-auth');
const SecurityManager = require('./security-manager');

class WebSocketManager extends EventEmitter {
    constructor(server) {
        super();
        
        // Configurações
        this.server = server;
        this.wss = null;
        this.connectionStore = new ConnectionStore();
        
        // Configurar autenticação
        this.auth = new WebSocketAuth({
            jwtSecret: process.env.JWT_SECRET,
            enableRateLimit: true,
            rateLimitWindow: 60000,
            maxAttemptsPerWindow: 10
        });

        // Configurar gerenciador de segurança
        this.security = new SecurityManager({
            maxConnectionsPerIP: 10,
            maxMessagesPerMinute: 60,
            allowedOrigins: ['http://localhost:3000'],
            enableAuditLogs: true
        });
        
        // Configurações de heartbeat
        this.heartbeatInterval = 30000; // 30 segundos
        this.heartbeatTimer = null;
        
        console.log('[WEBSOCKET] Gerenciador inicializado');
    }

    /**
     * Inicializa o servidor WebSocket
     */
    initialize() {
        try {
            // Criar servidor WebSocket
            this.wss = new WebSocket.Server({
                server: this.server,
                path: '/ws',
                verifyClient: this.verifyClient.bind(this)
            });

            // Configurar eventos
            this.wss.on('connection', this.handleConnection.bind(this));
            this.wss.on('error', this.handleError.bind(this));

            // Iniciar heartbeat
            this.startHeartbeat();

            console.log('[WEBSOCKET] Servidor WebSocket iniciado na rota /ws');
            return true;

        } catch (error) {
            console.error('[WEBSOCKET] Erro ao inicializar:', error);
            return false;
        }
    }

    /**
     * Verifica se a conexão é válida (autenticação inicial)
     */
    verifyClient(info) {
        try {
            const url = new URL(info.req.url, 'http://localhost');
            const token = url.searchParams.get('token');

            if (!token) {
                console.log('[WEBSOCKET] Conexão rejeitada: token ausente');
                return false;
            }

            // Verificar JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Adicionar dados do usuário à requisição
            info.req.user = decoded;
            
            console.log(`[WEBSOCKET] Conexão autorizada para usuário: ${decoded.id} (${decoded.tipo_cadastro})`);
            return true;

        } catch (error) {
            console.log('[WEBSOCKET] Conexão rejeitada: token inválido -', error.message);
            return false;
        }
    }

    /**
     * Trata nova conexão WebSocket
     */
    handleConnection(ws, req) {
        const connectionId = this.generateConnectionId();
        
        // Validar conexão com o gerenciador de segurança
        const securityCheck = this.security.validateConnection(req, ws);
        
        if (!securityCheck.allowed) {
            console.warn(`[WEBSOCKET-MANAGER] Conexão rejeitada: ${securityCheck.reason}`);
            ws.close(securityCheck.code || 1008, securityCheck.reason);
            return;
        }

        const clientIP = securityCheck.ip;
        
        console.log(`[WEBSOCKET-MANAGER] Nova conexão: ${connectionId} de ${clientIP}`);

        // Configurar propriedades da conexão
        ws.connectionId = connectionId;
        ws.clientIP = clientIP;
        ws.isAlive = true;
        ws.connectedAt = new Date();
        ws.lastActivity = new Date();

        // Armazenar conexão
        this.connectionStore.addConnection(user.id, connectionId, ws);

        // Configurar eventos da conexão
        ws.on('message', (data) => this.handleMessage(ws, data));
        ws.on('close', () => this.handleDisconnection(ws));
        ws.on('error', (error) => this.handleConnectionError(ws, error));
        ws.on('pong', () => this.handlePong(ws));

        // Enviar mensagem de boas-vindas
        this.sendToConnection(ws, {
            type: 'connection_established',
            data: {
                connectionId,
                timestamp: new Date(),
                message: 'Conectado ao sistema de notificações em tempo real'
            }
        });

        // Emitir evento de nova conexão
        this.emit('user_connected', { user, connectionId });
    }

    /**
     * Manipula mensagens recebidas
     */
    handleMessage(ws, data) {
        try {
            const message = JSON.parse(data);
            const messageSize = Buffer.byteLength(data, 'utf8');
            ws.lastActivity = new Date();

            // Validar mensagem com o gerenciador de segurança
            const securityCheck = this.security.validateMessage(
                ws.clientIP, 
                ws.user?.id, 
                message, 
                messageSize
            );
            
            if (!securityCheck.allowed) {
                console.warn(`[WEBSOCKET-MANAGER] Mensagem rejeitada de ${ws.connectionId}: ${securityCheck.reason}`);
                this.sendToConnection(ws, {
                    type: 'error',
                    data: { message: securityCheck.reason }
                });
                
                // Fechar conexão em caso de violações graves
                if (securityCheck.reason.includes('blacklisted') || securityCheck.reason.includes('spam')) {
                    ws.close(1008, securityCheck.reason);
                }
                return;
            }

            console.log(`[WEBSOCKET] Mensagem recebida de ${ws.user.id}:`, message.type);

            // Processar diferentes tipos de mensagem
            switch (message.type) {
                case 'ping':
                    this.sendToConnection(ws, { type: 'pong', timestamp: new Date() });
                    break;

                case 'subscribe_notifications':
                    this.handleSubscribeNotifications(ws, message.data);
                    break;

                case 'unsubscribe_notifications':
                    this.handleUnsubscribeNotifications(ws, message.data);
                    break;

                default:
                    console.log(`[WEBSOCKET] Tipo de mensagem desconhecido: ${message.type}`);
            }

        } catch (error) {
            console.error(`[WEBSOCKET] Erro ao processar mensagem de ${ws.user.id}:`, error);
            this.sendToConnection(ws, {
                type: 'error',
                data: { message: 'Formato de mensagem inválido' }
            });
        }
    }

    /**
     * Manipula desconexão
     */
    handleDisconnection(ws) {
        console.log(`[WEBSOCKET] Desconexão: ${ws.connectionId} - Usuário: ${ws.user.id}`);
        
        // Remover da store
        this.connectionStore.removeConnection(ws.user.id, ws.connectionId);
        
        // Emitir evento de desconexão
        this.emit('user_disconnected', { 
            user: ws.user, 
            connectionId: ws.connectionId 
        });
    }

    /**
     * Manipula erros de conexão
     */
    handleConnectionError(ws, error) {
        console.error(`[WEBSOCKET] Erro na conexão ${ws.connectionId}:`, error);
    }

    /**
     * Manipula resposta de pong (heartbeat)
     */
    handlePong(ws) {
        ws.isAlive = true;
        ws.lastActivity = new Date();
    }

    /**
     * Envia mensagem para uma conexão específica
     */
    sendToConnection(ws, message) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
                return true;
            }
            return false;
        } catch (error) {
            console.error('[WEBSOCKET] Erro ao enviar mensagem:', error);
            return false;
        }
    }

    /**
     * Envia notificação para um usuário específico
     */
    sendToUser(userId, message) {
        const connections = this.connectionStore.getUserConnections(userId);
        let sent = 0;

        connections.forEach(ws => {
            if (this.sendToConnection(ws, message)) {
                sent++;
            }
        });

        console.log(`[WEBSOCKET] Notificação enviada para usuário ${userId}: ${sent} conexões`);
        return sent > 0;
    }

    /**
     * Envia notificação para múltiplos usuários
     */
    sendToUsers(userIds, message) {
        let totalSent = 0;

        userIds.forEach(userId => {
            if (this.sendToUser(userId, message)) {
                totalSent++;
            }
        });

        return totalSent;
    }

    /**
     * Broadcast para todos os usuários conectados
     */
    broadcast(message) {
        let sent = 0;
        
        this.wss.clients.forEach(ws => {
            if (this.sendToConnection(ws, message)) {
                sent++;
            }
        });

        console.log(`[WEBSOCKET] Broadcast enviado para ${sent} conexões`);
        return sent;
    }

    /**
     * Inicia sistema de heartbeat
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            this.wss.clients.forEach(ws => {
                if (!ws.isAlive) {
                    console.log(`[WEBSOCKET] Conexão inativa detectada: ${ws.connectionId}`);
                    return ws.terminate();
                }

                ws.isAlive = false;
                ws.ping();
            });
        }, this.heartbeatInterval);

        console.log('[WEBSOCKET] Sistema de heartbeat iniciado');
    }

    /**
     * Para sistema de heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
            console.log('[WEBSOCKET] Sistema de heartbeat parado');
        }
    }

    /**
     * Gera ID único para conexão
     */
    generateConnectionId() {
        return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtém estatísticas das conexões
     */
    getStats() {
        return {
            total_connections: this.wss ? this.wss.clients.size : 0,
            active_users: this.connectionStore.getActiveUsersCount(),
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
        };
    }

    /**
     * Fecha todas as conexões e para o servidor
     */
    shutdown() {
        console.log('[WEBSOCKET] Iniciando shutdown...');
        
        this.stopHeartbeat();
        
        if (this.wss) {
            this.wss.clients.forEach(ws => {
                ws.close(1000, 'Servidor sendo desligado');
            });
            
            this.wss.close(() => {
                console.log('[WEBSOCKET] Servidor WebSocket fechado');
            });
        }
    }

    /**
     * Manipula inscrição em notificações
     */
    handleSubscribeNotifications(ws, data) {
        // Implementar lógica de inscrição específica
        console.log(`[WEBSOCKET] Usuário ${ws.user.id} se inscreveu em notificações:`, data);
        
        this.sendToConnection(ws, {
            type: 'subscription_confirmed',
            data: { subscriptions: data }
        });
    }

    /**
     * Manipula cancelamento de inscrição
     */
    handleUnsubscribeNotifications(ws, data) {
        // Implementar lógica de cancelamento específica
        console.log(`[WEBSOCKET] Usuário ${ws.user.id} cancelou inscrição:`, data);
        
        this.sendToConnection(ws, {
            type: 'unsubscription_confirmed',
            data: { unsubscribed: data }
        });
    }
}

module.exports = WebSocketManager;