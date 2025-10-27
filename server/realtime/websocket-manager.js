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
    constructor(serverOrOptions, options) {
        super();
        
        // Suporte para dois formatos:
        // 1. new WebSocketManager(options) - options contém server
        // 2. new WebSocketManager(server, options) - server e options separados
        if (typeof serverOrOptions === 'object' && serverOrOptions.listen) {
            // Formato: new WebSocketManager(server, options)
            this.server = serverOrOptions;
            options = options || {};
        } else {
            // Formato: new WebSocketManager(options)
            options = serverOrOptions || {};
            this.server = options.server;
        }
        this.wss = null;
        this.connectionStore = new ConnectionStore();
        this.notificationHub = options.notificationHub;
        
        // Configurar autenticação
        this.enableAuth = options.enableAuth !== undefined ? options.enableAuth : true; // Por padrão, autenticação está habilitada
        this.auth = new WebSocketAuth({
            jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
            enableRateLimit: true,
            rateLimitWindow: 60000,
            maxAttemptsPerWindow: 10
        });

        // Configurar gerenciador de segurança
        this.security = options.securityManager || new SecurityManager({
            maxConnectionsPerIP: 10,
            maxMessagesPerMinute: 60,
            allowedOrigins: ['http://localhost:3000'],
            enableAuditLogs: true
        });
        
        // Configurar NotificationHub se fornecido
        if (this.notificationHub && this.notificationHub.setWebSocketManager) {
            this.notificationHub.setWebSocketManager(this);
        }
        
        // Configurações de heartbeat
        this.heartbeatInterval = 30000; // 30 segundos
        this.heartbeatTimer = null;
        
        // Tempo de início para estatísticas
        this.startTime = Date.now();
        
        console.log('[WEBSOCKET] Gerenciador inicializado');
    }

    /**
     * SISTEMA DE GRUPOS - GERENCIAMENTO DE CONEXÕES
     * 
     * O sistema de grupos permite organizar conexões WebSocket em categorias específicas,
     * facilitando o envio de mensagens direcionadas para grupos de usuários.
     * 
     * Exemplos de uso:
     * - Grupo "motoristas": Recebe atualizações de rotas e passageiros
     * - Grupo "responsaveis": Recebe notificações sobre filhos
     * - Grupo "admin": Recebe alertas do sistema
     * 
     * Estrutura interna:
     * groupConnections = {
     *   "motoristas": [ws1, ws2, ws3],
     *   "responsaveis": [ws4, ws5],
     *   "admin": [ws6]
     * }
     */

    /**
     * Getter para acessar groupConnections do ConnectionStore
     * @returns {Map} Mapa de grupos e suas conexões
     */
    get groupConnections() {
        return this.connectionStore.groupConnections;
    }

    /**
     * Getter para acessar connections do ConnectionStore
     */
    get connections() {
        const connections = new Map();
        this.connectionStore.users.forEach(userData => {
            userData.connections.forEach((connection, connectionId) => {
                connections.set(connectionId, connection);
            });
        });
        return connections;
    }

    /**
     * Getter para acessar users do ConnectionStore (userConnections)
     */
    get userConnections() {
        const userConnections = new Map();
        this.connectionStore.users.forEach((userData, userId) => {
            const connectionIds = Array.from(userData.connections.keys());
            userConnections.set(userId, connectionIds);
        });
        return userConnections;
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
                verifyClient: (info, callback) => this.verifyClient(info, callback)
            });

            // Configurar eventos
            this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
            this.wss.on('error', (error) => {
                console.error('[WEBSOCKET] Erro no servidor WebSocket:', error);
            });

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
    async verifyClient(info, callback) {
        try {
            // Se autenticação estiver desabilitada, permitir conexão
            if (!this.enableAuth) {
                console.log('[WEBSOCKET] Conexão permitida (autenticação desabilitada)');
                // Criar usuário fictício para testes
                info.req.user = { id: 'test-user', userId: 'test-user' };
                return callback(true);
            }

            const url = new URL(info.req.url, 'http://localhost');
            const token = url.searchParams.get('token');

            if (!token) {
                console.log('[WEBSOCKET] Conexão rejeitada: token ausente');
                return callback(false);
            }

            // Verificar JWT
            const jwtSecret = this.auth.jwtSecret || process.env.JWT_SECRET;
            const decoded = jwt.verify(token, jwtSecret);
            
            // Adicionar dados do usuário à requisição
            info.req.user = decoded;
            
            // Verificar com o SecurityManager
            const securityCheck = this.security.validateConnection(info.req);
            
            if (!securityCheck.allowed) {
                console.log('[WEBSOCKET] Conexão rejeitada pelo SecurityManager:', securityCheck.reason);
                return callback(false);
            }
            
            console.log(`[WEBSOCKET] Conexão autorizada para usuário: ${decoded.userId || decoded.id}`);
            return callback(true);

        } catch (error) {
            console.log('[WEBSOCKET] Conexão rejeitada: token inválido -', error.message);
            return callback(false);
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
        const user = req.user || { id: 'anonymous', userId: 'anonymous' };
        
        console.log(`[WEBSOCKET-MANAGER] Nova conexão: ${connectionId} de ${clientIP} para usuário ${user.id}`);

        // Configurar propriedades da conexão
        ws.connectionId = connectionId;
        ws.clientIP = clientIP;
        ws.userId = user.id;
        ws.user = user; // Adicionar referência ao usuário
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

                case 'join_group':
                    // SISTEMA DE GRUPOS: Adiciona conexão a um grupo específico
                    // Permite que usuários se inscrevam em categorias de notificações
                    if (message.data && message.data.groupId) {
                        this.addToGroup(ws.id, message.data.groupId);
                        this.sendToConnection(ws, {
                            type: 'group_joined',
                            data: { groupId: message.data.groupId }
                        });
                    }
                    break;

                case 'leave_group':
                    // SISTEMA DE GRUPOS: Remove conexão de um grupo específico
                    // Permite que usuários cancelem inscrições em categorias
                    if (message.data && message.data.groupId) {
                        this.removeFromGroup(ws.id, message.data.groupId);
                        this.sendToConnection(ws, {
                            type: 'group_left',
                            data: { groupId: message.data.groupId }
                        });
                    }
                    break;

                case 'send_notification':
                    // ENVIO DE NOTIFICAÇÃO: Permite que usuários enviem notificações para outros usuários
                    this.handleSendNotification(ws, message.data);
                    break;

                default:
                    console.log(`[WEBSOCKET] Tipo de mensagem desconhecido: ${message.type}`);
            }

        } catch (error) {
            const userId = ws.user ? ws.user.id : 'usuário desconhecido';
            console.error(`[WEBSOCKET] Erro ao processar mensagem de ${userId}:`, error);
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
        const userId = ws.user ? ws.user.id : 'unknown';
        console.log(`[WEBSOCKET] Desconexão: ${ws.connectionId} - Usuário: ${userId}`);
        
        // Remover da store se usuário existir
        if (ws.user && ws.user.id) {
            this.connectionStore.removeConnection(ws.user.id, ws.connectionId);
            
            // Emitir evento de desconexão
            this.emit('user_disconnected', { 
                user: ws.user, 
                connectionId: ws.connectionId 
            });
        }
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
     * Manipula envio de notificação
     */
    handleSendNotification(ws, data) {
        try {
            const userId = ws.user ? ws.user.id : 'usuário anônimo';
            console.log(`[WEBSOCKET] Processando notificação de ${userId}:`, data.type);
            
            // Validar dados da notificação
            if (!data.type || !data.title || !data.message) {
                this.sendToConnection(ws, {
                    type: 'error',
                    data: { message: 'Dados de notificação inválidos' }
                });
                return;
            }

            // Usar o NotificationHub para enviar a notificação
            if (this.notificationHub) {
                this.notificationHub.sendNotification(data);
                
                // Confirmar envio para o remetente
                this.sendToConnection(ws, {
                    type: 'notification_sent',
                    data: { 
                        message: 'Notificação enviada com sucesso',
                        notificationId: data.id || Date.now()
                    }
                });
            } else {
                console.error('[WEBSOCKET] NotificationHub não disponível');
                this.sendToConnection(ws, {
                    type: 'error',
                    data: { message: 'Sistema de notificações indisponível' }
                });
            }
        } catch (error) {
            console.error('[WEBSOCKET] Erro ao processar notificação:', error);
            this.sendToConnection(ws, {
                type: 'error',
                data: { message: 'Erro interno ao processar notificação' }
            });
        }
    }

    /**
     * MÉTODOS DE BROADCAST - SISTEMA DE DISTRIBUIÇÃO DE MENSAGENS
     * 
     * Os métodos abaixo implementam diferentes estratégias para envio de mensagens:
     * 
     * 1. sendToConnection() - Envia para uma conexão específica
     * 2. sendToUser() - Envia para todas as conexões de um usuário
     * 3. sendToUsers() - Envia para múltiplos usuários
     * 4. broadcast() - Envia para todos os usuários conectados
     * 5. sendToGroup() - Envia para um grupo específico
     * 
     * Cada método retorna informações sobre o sucesso do envio para monitoramento.
     */

    /**
     * Envia mensagem para uma conexão específica
     * 
     * Este é o método base usado por todos os outros métodos de envio.
     * Verifica se a conexão está ativa antes de enviar.
     * 
     * @param {WebSocket} ws - Conexão WebSocket de destino
     * @param {Object} message - Mensagem a ser enviada (será serializada em JSON)
     * @returns {boolean} true se enviado com sucesso, false caso contrário
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
     * 
     * Localiza todas as conexões ativas do usuário e envia a mensagem para cada uma.
     * Útil quando um usuário tem múltiplas abas/dispositivos conectados.
     * 
     * Casos de uso:
     * - Notificações pessoais
     * - Atualizações de perfil
     * - Mensagens diretas
     * 
     * @param {string} userId - ID do usuário de destino
     * @param {Object} message - Mensagem a ser enviada
     * @returns {boolean} true se pelo menos uma conexão recebeu a mensagem
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
     * 
     * Método otimizado para envio em lote. Itera sobre uma lista de usuários
     * e envia a mesma mensagem para todos.
     * 
     * Casos de uso:
     * - Notificações de sistema
     * - Alertas para grupos específicos
     * - Atualizações de status
     * 
     * @param {Array<string>} userIds - Array de IDs dos usuários
     * @param {Object} message - Mensagem a ser enviada
     * @returns {number} Número de usuários que receberam a mensagem
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
     * 
     * Envia mensagem para TODAS as conexões ativas no sistema.
     * Use com cuidado para evitar spam.
     * 
     * Casos de uso:
     * - Manutenção programada
     * - Alertas críticos do sistema
     * - Atualizações globais
     * 
     * Implementação híbrida:
     * - Em produção: usa this.wss.clients
     * - Em testes: usa ConnectionStore.getAllConnections()
     * 
     * @param {Object} message - Mensagem a ser enviada
     * @returns {number} Número de conexões que receberam a mensagem
     */
    broadcast(message) {
        let sent = 0;
        
        if (!this.wss || !this.wss.clients) {
            // Em modo de teste, usar as conexões do ConnectionStore
            const allConnections = this.connectionStore.getAllConnections();
            allConnections.forEach(ws => {
                if (this.sendToConnection(ws, message)) {
                    sent++;
                }
            });
            return sent;
        }
        
        this.wss.clients.forEach(ws => {
            if (this.sendToConnection(ws, message)) {
                sent++;
            }
        });

        console.log(`[WEBSOCKET] Broadcast enviado para ${sent} conexões`);
        return sent;
    }

    /**
     * Envia mensagem para um grupo específico
     * 
     * Utiliza o sistema de grupos para envio direcionado.
     * Mais eficiente que broadcast quando se quer atingir apenas um subconjunto.
     * 
     * Casos de uso:
     * - Notificações para motoristas: sendToGroup('motoristas', message)
     * - Alertas para responsáveis: sendToGroup('responsaveis', message)
     * - Mensagens administrativas: sendToGroup('admin', message)
     * 
     * @param {string} groupId - ID do grupo de destino
     * @param {Object} message - Mensagem a ser enviada
     * @returns {boolean} true se pelo menos uma conexão recebeu a mensagem
     */
    sendToGroup(groupId, message) {
        const connections = this.connectionStore.getGroupConnections(groupId);
        let sent = 0;

        connections.forEach(ws => {
            if (this.sendToConnection(ws, message)) {
                sent++;
            }
        });

        console.log(`[WEBSOCKET] Mensagem enviada para grupo ${groupId}: ${sent} conexões`);
        return sent > 0;
    }

    /**
     * Adiciona uma conexão WebSocket (wrapper para testes)
     */
    addConnection(ws) {
        if (!ws.userId) {
            console.warn('[WEBSOCKET] Tentativa de adicionar conexão sem userId');
            return false;
        }
        
        const connectionId = ws.id || this.generateConnectionId();
        ws.connectionId = connectionId;
        
        return this.connectionStore.addConnection(ws.userId, connectionId, ws);
    }

    /**
     * Remove uma conexão WebSocket (wrapper para testes)
     */
    removeConnection(connectionId) {
        // Encontrar a conexão pelo ID
        const connection = this.connectionStore.getConnectionById(connectionId);
        if (connection) {
            return this.connectionStore.removeConnection(connection.userId, connectionId);
        }
        return false;
    }

    /**
     * Adiciona conexão a um grupo
     */
    addToGroup(connectionId, groupId) {
        return this.connectionStore.addToGroup(connectionId, groupId);
    }

    /**
     * Remove conexão de um grupo
     */
    removeFromGroup(connectionId, groupId) {
        return this.connectionStore.removeFromGroup(connectionId, groupId);
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
     * Fecha todas as conexões ativas
     */
    closeAllConnections() {
        // Fechar conexões do connectionStore
        this.connectionStore.getAllConnections().forEach(ws => {
            if (ws && typeof ws.close === 'function') {
                ws.close(1000, 'Servidor sendo desligado');
            }
        });
        
        // Também fechar conexões do WebSocket Server se existir
        if (this.wss) {
            this.wss.clients.forEach(ws => {
                ws.close(1000, 'Servidor sendo desligado');
            });
        }
    }

    /**
     * Fecha todas as conexões e para o servidor
     */
    async shutdown() {
        console.log('[WEBSOCKET] Iniciando shutdown...');
        
        this.stopHeartbeat();
        this.closeAllConnections();
        
        if (this.wss) {
            return new Promise((resolve) => {
                this.wss.close(() => {
                    console.log('[WEBSOCKET] Servidor WebSocket fechado');
                    resolve();
                });
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

    /**
     * Retorna estatísticas das conexões
     */
    getConnectionStats() {
        const stats = this.connectionStore.getDebugInfo();
        return {
            total: stats.totalConnections || 0,
            byUser: stats.connectionsByUser || {}
        };
    }

    /**
     * Retorna lista de usuários conectados
     */
    getConnectedUsers() {
        return this.connectionStore.getConnectedUsers();
    }
}

module.exports = WebSocketManager;