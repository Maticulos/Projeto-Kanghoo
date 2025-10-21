/**
 * ARMAZENAMENTO DE CONEXÕES ATIVAS
 * 
 * Gerencia o mapeamento entre usuários e suas conexões WebSocket ativas.
 * Permite envio direcionado de notificações e controle de sessões.
 * 
 * Estrutura de dados:
 * {
 *   "user_123": {
 *     connections: [ws1, ws2],
 *     lastActivity: Date,
 *     metadata: { tipo_cadastro: "responsavel", criancas: [1,2,3] }
 *   }
 * }
 * 
 * @author Sistema Kanghoo
 * @version 1.0.0
 */

class ConnectionStore {
    constructor() {
        // Mapa principal: userId -> dados do usuário
        this.users = new Map();
        
        // Mapa reverso: connectionId -> userId (para lookup rápido)
        this.connectionToUser = new Map();
        
        // Estatísticas
        this.stats = {
            totalConnections: 0,
            peakConnections: 0,
            connectionsToday: 0,
            lastReset: new Date()
        };

        console.log('[CONNECTION-STORE] Armazenamento de conexões inicializado');
    }

    /**
     * Adiciona uma nova conexão para um usuário
     */
    addConnection(userId, connectionId, websocket) {
        try {
            // Verificar se usuário já existe
            if (!this.users.has(userId)) {
                this.users.set(userId, {
                    connections: new Map(),
                    lastActivity: new Date(),
                    metadata: {
                        tipo_cadastro: websocket.user.tipo_cadastro,
                        nome: websocket.user.nome || 'Usuário',
                        email: websocket.user.email
                    },
                    firstConnection: new Date()
                });
            }

            const userData = this.users.get(userId);
            
            // Adicionar conexão
            userData.connections.set(connectionId, {
                websocket,
                connectedAt: new Date(),
                lastActivity: new Date()
            });
            
            // Atualizar atividade
            userData.lastActivity = new Date();
            
            // Mapa reverso
            this.connectionToUser.set(connectionId, userId);
            
            // Atualizar estatísticas
            this.updateStats();
            
            console.log(`[CONNECTION-STORE] Conexão adicionada: User ${userId}, Connection ${connectionId}`);
            console.log(`[CONNECTION-STORE] Total de conexões do usuário: ${userData.connections.size}`);
            
            return true;

        } catch (error) {
            console.error('[CONNECTION-STORE] Erro ao adicionar conexão:', error);
            return false;
        }
    }

    /**
     * Remove uma conexão específica
     */
    removeConnection(userId, connectionId) {
        try {
            if (!this.users.has(userId)) {
                console.log(`[CONNECTION-STORE] Usuário ${userId} não encontrado para remoção`);
                return false;
            }

            const userData = this.users.get(userId);
            
            // Remover conexão
            if (userData.connections.has(connectionId)) {
                userData.connections.delete(connectionId);
                this.connectionToUser.delete(connectionId);
                
                console.log(`[CONNECTION-STORE] Conexão removida: User ${userId}, Connection ${connectionId}`);
                
                // Se não há mais conexões, remover usuário
                if (userData.connections.size === 0) {
                    this.users.delete(userId);
                    console.log(`[CONNECTION-STORE] Usuário ${userId} desconectado completamente`);
                }
                
                // Atualizar estatísticas
                this.updateStats();
                
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('[CONNECTION-STORE] Erro ao remover conexão:', error);
            return false;
        }
    }

    /**
     * Obtém todas as conexões WebSocket de um usuário
     */
    getUserConnections(userId) {
        if (!this.users.has(userId)) {
            return [];
        }

        const userData = this.users.get(userId);
        const connections = [];

        userData.connections.forEach((connectionData) => {
            connections.push(connectionData.websocket);
        });

        return connections;
    }

    /**
     * Verifica se um usuário está conectado
     */
    isUserConnected(userId) {
        return this.users.has(userId) && this.users.get(userId).connections.size > 0;
    }

    /**
     * Obtém informações de um usuário conectado
     */
    getUserInfo(userId) {
        if (!this.users.has(userId)) {
            return null;
        }

        const userData = this.users.get(userId);
        
        return {
            userId,
            metadata: userData.metadata,
            connectionsCount: userData.connections.size,
            lastActivity: userData.lastActivity,
            firstConnection: userData.firstConnection,
            isActive: this.isUserActive(userId)
        };
    }

    /**
     * Verifica se um usuário está ativo (atividade recente)
     */
    isUserActive(userId, timeoutMinutes = 5) {
        if (!this.users.has(userId)) {
            return false;
        }

        const userData = this.users.get(userId);
        const now = new Date();
        const timeout = timeoutMinutes * 60 * 1000; // converter para ms
        
        return (now - userData.lastActivity) < timeout;
    }

    /**
     * Atualiza a última atividade de um usuário
     */
    updateUserActivity(userId) {
        if (this.users.has(userId)) {
            this.users.get(userId).lastActivity = new Date();
        }
    }

    /**
     * Obtém lista de todos os usuários conectados
     */
    getConnectedUsers() {
        const users = [];
        
        this.users.forEach((userData, userId) => {
            users.push({
                userId,
                metadata: userData.metadata,
                connectionsCount: userData.connections.size,
                lastActivity: userData.lastActivity,
                isActive: this.isUserActive(userId)
            });
        });

        return users;
    }

    /**
     * Obtém usuários por tipo de cadastro
     */
    getUsersByType(tipoCadastro) {
        const users = [];
        
        this.users.forEach((userData, userId) => {
            if (userData.metadata.tipo_cadastro === tipoCadastro) {
                users.push({
                    userId,
                    metadata: userData.metadata,
                    connectionsCount: userData.connections.size,
                    lastActivity: userData.lastActivity
                });
            }
        });

        return users;
    }

    /**
     * Obtém responsáveis conectados (para notificações)
     */
    getConnectedResponsaveis() {
        return this.getUsersByType('responsavel');
    }

    /**
     * Obtém motoristas conectados
     */
    getConnectedMotoristas() {
        return this.getUsersByType('motorista_escolar').concat(
            this.getUsersByType('motorista_excursao')
        );
    }

    /**
     * Remove conexões inativas
     */
    cleanupInactiveConnections(timeoutMinutes = 30) {
        const now = new Date();
        const timeout = timeoutMinutes * 60 * 1000;
        let cleaned = 0;

        this.users.forEach((userData, userId) => {
            const connectionsToRemove = [];

            userData.connections.forEach((connectionData, connectionId) => {
                if ((now - connectionData.lastActivity) > timeout) {
                    connectionsToRemove.push(connectionId);
                }
            });

            // Remover conexões inativas
            connectionsToRemove.forEach(connectionId => {
                userData.connections.delete(connectionId);
                this.connectionToUser.delete(connectionId);
                cleaned++;
            });

            // Remover usuário se não há mais conexões
            if (userData.connections.size === 0) {
                this.users.delete(userId);
            }
        });

        if (cleaned > 0) {
            console.log(`[CONNECTION-STORE] Limpeza concluída: ${cleaned} conexões inativas removidas`);
            this.updateStats();
        }

        return cleaned;
    }

    /**
     * Obtém estatísticas do armazenamento
     */
    getStats() {
        const now = new Date();
        
        // Resetar estatísticas diárias se necessário
        if (now.toDateString() !== this.stats.lastReset.toDateString()) {
            this.stats.connectionsToday = 0;
            this.stats.lastReset = now;
        }

        let totalConnections = 0;
        let activeUsers = 0;

        this.users.forEach((userData) => {
            totalConnections += userData.connections.size;
            if (this.isUserActive(userData.userId)) {
                activeUsers++;
            }
        });

        return {
            totalUsers: this.users.size,
            totalConnections,
            activeUsers,
            peakConnections: this.stats.peakConnections,
            connectionsToday: this.stats.connectionsToday,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Atualiza estatísticas internas
     */
    updateStats() {
        let totalConnections = 0;
        
        this.users.forEach((userData) => {
            totalConnections += userData.connections.size;
        });

        this.stats.totalConnections = totalConnections;
        
        if (totalConnections > this.stats.peakConnections) {
            this.stats.peakConnections = totalConnections;
        }
        
        this.stats.connectionsToday++;
    }

    /**
     * Obtém uso de memória aproximado
     */
    getMemoryUsage() {
        let size = 0;
        
        // Calcular tamanho aproximado dos dados armazenados
        this.users.forEach((userData) => {
            size += JSON.stringify(userData.metadata).length;
            size += userData.connections.size * 100; // estimativa por conexão
        });

        return {
            estimatedBytes: size,
            estimatedKB: Math.round(size / 1024),
            estimatedMB: Math.round(size / (1024 * 1024))
        };
    }

    /**
     * Obtém contagem de usuários ativos
     */
    getActiveUsersCount() {
        let count = 0;
        
        this.users.forEach((userData, userId) => {
            if (this.isUserActive(userId)) {
                count++;
            }
        });

        return count;
    }

    /**
     * Limpa todos os dados (usar com cuidado)
     */
    clear() {
        this.users.clear();
        this.connectionToUser.clear();
        this.stats = {
            totalConnections: 0,
            peakConnections: 0,
            connectionsToday: 0,
            lastReset: new Date()
        };
        
        console.log('[CONNECTION-STORE] Todos os dados foram limpos');
    }

    /**
     * Obtém informações de debug
     */
    getDebugInfo() {
        const info = {
            users: {},
            connections: {},
            stats: this.getStats()
        };

        this.users.forEach((userData, userId) => {
            info.users[userId] = {
                metadata: userData.metadata,
                connectionsCount: userData.connections.size,
                lastActivity: userData.lastActivity,
                connections: []
            };

            userData.connections.forEach((connectionData, connectionId) => {
                info.users[userId].connections.push({
                    connectionId,
                    connectedAt: connectionData.connectedAt,
                    lastActivity: connectionData.lastActivity
                });
            });
        });

        return info;
    }
}

module.exports = ConnectionStore;