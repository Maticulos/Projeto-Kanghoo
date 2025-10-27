/**
 * CLIENTE WEBSOCKET PARA NOTIFICAÇÕES EM TEMPO REAL
 * 
 * Este cliente gerencia a conexão WebSocket com o servidor,
 * processa notificações em tempo real e mantém sincronização
 * com a interface do usuário.
 * 
 * Funcionalidades:
 * - Conexão automática com reconexão
 * - Autenticação via JWT
 * - Processamento de notificações
 * - Interface com UI
 * - Fallback para polling
 * 
 * @author Sistema Kanghoo
 * @version 1.0.0
 */

class RealtimeClient {
    constructor(options = {}) {
        this.options = {
            serverUrl: options.serverUrl || 'ws://localhost:8080/ws',
            reconnectInterval: options.reconnectInterval || 5000,
            maxReconnectAttempts: options.maxReconnectAttempts || 10,
            heartbeatInterval: options.heartbeatInterval || 30000,
            enableFallback: options.enableFallback !== false,
            fallbackInterval: options.fallbackInterval || 30000,
            debug: options.debug || false,
            ...options
        };

        // Estado da conexão
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastHeartbeat = null;

        // Autenticação
        this.authToken = null;
        this.userData = null;

        // Event listeners
        this.eventListeners = new Map();
        
        // Timers
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.fallbackTimer = null;

        // Estatísticas
        this.stats = {
            connectionsAttempted: 0,
            connectionsSuccessful: 0,
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            errors: 0
        };

        // Fallback para polling
        this.fallbackActive = false;
        this.lastPollingUpdate = null;

        console.log('[REALTIME-CLIENT] Cliente de notificações inicializado');
    }

    /**
     * Inicializa o cliente
     */
    async initialize(authToken) {
        try {
            this.authToken = authToken;
            
            // Verificar suporte a WebSocket
            if (!this.isWebSocketSupported()) {
                console.warn('[REALTIME-CLIENT] WebSocket não suportado, usando fallback');
                if (this.options.enableFallback) {
                    this.startFallbackPolling();
                }
                return false;
            }

            // Conectar ao servidor
            await this.connect();
            
            // Configurar heartbeat
            this.startHeartbeat();

            return true;

        } catch (error) {
            console.error('[REALTIME-CLIENT] Erro na inicialização:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Conecta ao servidor WebSocket
     */
    async connect() {
        if (this.isConnecting || this.isConnected) {
            return;
        }

        try {
            this.isConnecting = true;
            this.stats.connectionsAttempted++;

            console.log('[REALTIME-CLIENT] Conectando ao servidor...');

            // Construir URL com token
            const wsUrl = `${this.options.serverUrl}?token=${encodeURIComponent(this.authToken)}`;
            
            // Criar conexão WebSocket
            this.ws = new WebSocket(wsUrl);

            // Configurar event listeners
            this.setupWebSocketListeners();

            // Aguardar conexão ou timeout
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout na conexão'));
                }, 10000);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    resolve();
                };

                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(error);
                };
            });

        } catch (error) {
            this.isConnecting = false;
            throw error;
        }
    }

    /**
     * Configura listeners do WebSocket
     */
    setupWebSocketListeners() {
        this.ws.onopen = () => {
            console.log('[REALTIME-CLIENT] Conectado ao servidor');
            
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.stats.connectionsSuccessful++;

            // Parar fallback se estiver ativo
            this.stopFallbackPolling();

            // Emitir evento de conexão
            this.emit('connected');

            // Enviar mensagem de identificação
            this.sendIdentification();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
                this.stats.messagesReceived++;
            } catch (error) {
                console.error('[REALTIME-CLIENT] Erro ao processar mensagem:', error);
                this.stats.errors++;
            }
        };

        this.ws.onclose = (event) => {
            console.log(`[REALTIME-CLIENT] Conexão fechada: ${event.code} - ${event.reason}`);
            
            this.isConnected = false;
            this.isConnecting = false;

            // Emitir evento de desconexão
            this.emit('disconnected', { code: event.code, reason: event.reason });

            // Tentar reconectar se não foi fechamento intencional
            if (event.code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts) {
                this.scheduleReconnect();
            } else if (this.options.enableFallback) {
                this.startFallbackPolling();
            }
        };

        this.ws.onerror = (error) => {
            console.error('[REALTIME-CLIENT] Erro na conexão WebSocket:', error);
            this.stats.errors++;
            this.emit('error', error);
        };

        this.ws.onpong = () => {
            this.lastHeartbeat = new Date();
            if (this.options.debug) {
                console.log('[REALTIME-CLIENT] Pong recebido');
            }
        };
    }

    /**
     * Processa mensagens recebidas
     */
    handleMessage(message) {
        if (this.options.debug) {
            console.log('[REALTIME-CLIENT] Mensagem recebida:', message);
        }

        switch (message.type) {
            case 'notification':
                this.handleNotification(message.data);
                break;

            case 'system':
                this.handleSystemMessage(message.data);
                break;

            case 'auth_success':
                this.handleAuthSuccess(message.data);
                break;

            case 'auth_failed':
                this.handleAuthFailed(message.data);
                break;

            case 'ping':
                this.sendPong();
                break;

            default:
                console.warn('[REALTIME-CLIENT] Tipo de mensagem desconhecido:', message.type);
        }

        // Emitir evento genérico
        this.emit('message', message);
    }

    /**
     * Processa notificações
     */
    handleNotification(notification) {
        console.log('[REALTIME-CLIENT] Nova notificação:', notification);

        // Emitir evento específico do tipo de notificação
        this.emit(`notification:${notification.type}`, notification);
        
        // Emitir evento genérico de notificação
        this.emit('notification', notification);

        // Mostrar notificação na UI
        this.showNotificationInUI(notification);

        // Reproduzir som se configurado
        this.playNotificationSound(notification);

        // Salvar no histórico local
        this.saveNotificationToHistory(notification);
    }

    /**
     * Processa mensagens do sistema
     */
    handleSystemMessage(data) {
        console.log('[REALTIME-CLIENT] Mensagem do sistema:', data);

        switch (data.action) {
            case 'maintenance':
                this.emit('maintenance', data);
                break;

            case 'force_disconnect':
                this.disconnect();
                break;

            case 'update_available':
                this.emit('update_available', data);
                break;
        }
    }

    /**
     * Processa sucesso na autenticação
     */
    handleAuthSuccess(data) {
        console.log('[REALTIME-CLIENT] Autenticação bem-sucedida');
        this.userData = data.user;
        this.emit('auth_success', data);
    }

    /**
     * Processa falha na autenticação
     */
    handleAuthFailed(data) {
        console.error('[REALTIME-CLIENT] Falha na autenticação:', data.error);
        this.emit('auth_failed', data);
        this.disconnect();
    }

    /**
     * Envia identificação inicial
     */
    sendIdentification() {
        const identification = {
            type: 'identify',
            data: {
                userAgent: navigator.userAgent,
                timestamp: new Date(),
                capabilities: {
                    notifications: 'Notification' in window,
                    audio: 'Audio' in window,
                    vibration: 'vibrate' in navigator
                }
            }
        };

        this.send(identification);
    }

    /**
     * Envia mensagem via WebSocket
     */
    send(message) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[REALTIME-CLIENT] Tentativa de enviar mensagem sem conexão ativa');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            this.stats.messagesSent++;
            return true;
        } catch (error) {
            console.error('[REALTIME-CLIENT] Erro ao enviar mensagem:', error);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Envia pong em resposta ao ping
     */
    sendPong() {
        this.send({ type: 'pong', timestamp: new Date() });
    }

    /**
     * Agenda reconexão
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
            30000 // Máximo 30 segundos
        );

        console.log(`[REALTIME-CLIENT] Tentativa de reconexão ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} em ${delay}ms`);

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
                this.stats.reconnections++;
            } catch (error) {
                console.error('[REALTIME-CLIENT] Falha na reconexão:', error);
            }
        }, delay);
    }

    /**
     * Inicia heartbeat
     */
    startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
                
                // Verificar se o último heartbeat foi há muito tempo
                if (this.lastHeartbeat) {
                    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
                    if (timeSinceLastHeartbeat > this.options.heartbeatInterval * 2) {
                        console.warn('[REALTIME-CLIENT] Heartbeat perdido, reconectando...');
                        this.disconnect();
                        this.scheduleReconnect();
                    }
                }
            }
        }, this.options.heartbeatInterval);
    }

    /**
     * Inicia polling de fallback
     */
    startFallbackPolling() {
        if (!this.options.enableFallback || this.fallbackActive) {
            return;
        }

        console.log('[REALTIME-CLIENT] Iniciando polling de fallback');
        this.fallbackActive = true;

        this.fallbackTimer = setInterval(async () => {
            try {
                await this.pollForUpdates();
            } catch (error) {
                console.error('[REALTIME-CLIENT] Erro no polling de fallback:', error);
            }
        }, this.options.fallbackInterval);

        this.emit('fallback_started');
    }

    /**
     * Para polling de fallback
     */
    stopFallbackPolling() {
        if (this.fallbackTimer) {
            clearInterval(this.fallbackTimer);
            this.fallbackTimer = null;
        }

        if (this.fallbackActive) {
            this.fallbackActive = false;
            console.log('[REALTIME-CLIENT] Polling de fallback parado');
            this.emit('fallback_stopped');
        }
    }

    /**
     * Faz polling para atualizações (fallback)
     */
    async pollForUpdates() {
        try {
            const response = await fetch('/api/notifications/poll', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.notifications && data.notifications.length > 0) {
                    data.notifications.forEach(notification => {
                        this.handleNotification(notification);
                    });
                }

                this.lastPollingUpdate = new Date();
            }

        } catch (error) {
            console.error('[REALTIME-CLIENT] Erro no polling:', error);
        }
    }

    /**
     * Mostra notificação na UI
     */
    showNotificationInUI(notification) {
        // Criar elemento de notificação
        const notificationElement = this.createNotificationElement(notification);
        
        // Adicionar à área de notificações
        const notificationsContainer = document.getElementById('notifications-container');
        if (notificationsContainer) {
            notificationsContainer.appendChild(notificationElement);
            
            // Auto-remover após alguns segundos
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.remove();
                }
            }, 5000);
        }

        // Mostrar notificação do browser se permitido
        this.showBrowserNotification(notification);

        // Atualizar badge/contador
        this.updateNotificationBadge();
    }

    /**
     * Cria elemento HTML da notificação
     */
    createNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = `notification notification-${notification.priority}`;
        div.innerHTML = `
            <div class="notification-header">
                <span class="notification-type">${this.getNotificationTypeLabel(notification.type)}</span>
                <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="notification-content">
                <p>${notification.data.message}</p>
            </div>
        `;
        return div;
    }

    /**
     * Mostra notificação do browser
     */
    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification(
                this.getNotificationTypeLabel(notification.type),
                {
                    body: notification.data.message,
                    icon: '/images/kanghoo-icon.png',
                    tag: notification.type,
                    requireInteraction: notification.priority === 'critical'
                }
            );

            // Auto-fechar após 5 segundos (exceto críticas)
            if (notification.priority !== 'critical') {
                setTimeout(() => browserNotification.close(), 5000);
            }
        }
    }

    /**
     * Reproduz som de notificação
     */
    playNotificationSound(notification) {
        if ('Audio' in window) {
            try {
                const audio = new Audio(`/sounds/notification-${notification.priority}.mp3`);
                audio.volume = 0.5;
                audio.play().catch(() => {
                    // Ignorar erro se não conseguir reproduzir
                });
            } catch (error) {
                // Ignorar erro de áudio
            }
        }

        // Vibração para dispositivos móveis
        if ('vibrate' in navigator && notification.priority === 'critical') {
            navigator.vibrate([200, 100, 200]);
        }
    }

    /**
     * Salva notificação no histórico local
     */
    saveNotificationToHistory(notification) {
        try {
            const history = JSON.parse(localStorage.getItem('notification_history') || '[]');
            history.unshift({
                ...notification,
                receivedAt: new Date()
            });

            // Manter apenas as últimas 100 notificações
            if (history.length > 100) {
                history.splice(100);
            }

            localStorage.setItem('notification_history', JSON.stringify(history));
        } catch (error) {
            console.error('[REALTIME-CLIENT] Erro ao salvar histórico:', error);
        }
    }

    /**
     * Atualiza badge de notificações
     */
    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            const unreadCount = this.getUnreadNotificationsCount();
            badge.textContent = unreadCount > 0 ? unreadCount : '';
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    /**
     * Obtém contagem de notificações não lidas
     */
    getUnreadNotificationsCount() {
        try {
            const history = JSON.parse(localStorage.getItem('notification_history') || '[]');
            return history.filter(n => !n.read).length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Adiciona listener de evento
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove listener de evento
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emite evento
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[REALTIME-CLIENT] Erro no listener de ${event}:`, error);
                }
            });
        }
    }

    /**
     * Desconecta do servidor
     */
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Desconexão intencional');
        }

        // Limpar timers
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        this.stopFallbackPolling();

        this.isConnected = false;
        this.isConnecting = false;
    }

    /**
     * Verifica suporte a WebSocket
     */
    isWebSocketSupported() {
        return 'WebSocket' in window;
    }

    /**
     * Obtém label do tipo de notificação
     */
    getNotificationTypeLabel(type) {
        const labels = {
            'crianca_embarcou': 'Embarque',
            'crianca_desembarcou': 'Desembarque',
            'veiculo_chegando': 'Chegada',
            'atraso_detectado': 'Atraso',
            'emergencia': 'Emergência',
            'nova_mensagem': 'Mensagem',
            'pagamento_aprovado': 'Pagamento'
        };
        return labels[type] || 'Notificação';
    }

    /**
     * Formata timestamp
     */
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Obtém estatísticas do cliente
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            fallbackActive: this.fallbackActive,
            lastHeartbeat: this.lastHeartbeat,
            lastPollingUpdate: this.lastPollingUpdate
        };
    }

    /**
     * Solicita permissão para notificações do browser
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }
}

// Exportar para uso global
window.RealtimeClient = RealtimeClient;