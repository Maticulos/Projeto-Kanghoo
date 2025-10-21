/**
 * HUB CENTRAL DE NOTIFICAÇÕES
 * 
 * Este é o centro de comando para todas as notificações em tempo real.
 * Coordena eventos, filtra destinatários e envia notificações via WebSocket.
 * 
 * Tipos de notificações suportadas:
 * - Embarque/Desembarque de crianças
 * - Localização em tempo real
 * - Alertas de atraso
 * - Emergências
 * - Chegada/Saída de destinos
 * 
 * @author Sistema Kanghoo
 * @version 1.0.0
 */

const EventEmitter = require('eventemitter3');
const notificationService = require('../utils/notification-service');

class NotificationHub extends EventEmitter {
    constructor(webSocketManager) {
        super();
        
        this.wsManager = webSocketManager;
        this.isActive = false;
        
        // Configurações
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            batchSize: 50,
            rateLimitPerMinute: 60
        };
        
        // Estatísticas
        this.stats = {
            notificationsSent: 0,
            notificationsFailed: 0,
            lastReset: new Date()
        };

        console.log('[NOTIFICATION-HUB] Hub de notificações inicializado');
    }

    /**
     * Inicializa o hub e registra listeners de eventos
     */
    initialize() {
        try {
            // Registrar listeners para diferentes tipos de eventos
            this.registerEventListeners();
            
            this.isActive = true;
            console.log('[NOTIFICATION-HUB] Hub ativado e pronto para enviar notificações');
            
            return true;
        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao inicializar:', error);
            return false;
        }
    }

    /**
     * Registra todos os listeners de eventos
     */
    registerEventListeners() {
        // Eventos de embarque/desembarque
        this.on('crianca_embarcou', this.handleCriancaEmbarcou.bind(this));
        this.on('crianca_desembarcou', this.handleCriancaDesembarcou.bind(this));
        
        // Eventos de localização
        this.on('localizacao_atualizada', this.handleLocalizacaoAtualizada.bind(this));
        this.on('veiculo_chegando', this.handleVeiculoChegando.bind(this));
        
        // Eventos de viagem
        this.on('viagem_iniciada', this.handleViagemIniciada.bind(this));
        this.on('viagem_finalizada', this.handleViagemFinalizada.bind(this));
        
        // Eventos de alerta
        this.on('atraso_detectado', this.handleAtrasoDetectado.bind(this));
        this.on('emergencia', this.handleEmergencia.bind(this));
        
        // Eventos de sistema
        this.on('manutencao_programada', this.handleManutencaoProgramada.bind(this));

        console.log('[NOTIFICATION-HUB] Event listeners registrados');
    }

    /**
     * Manipula evento de criança embarcando
     */
    async handleCriancaEmbarcou(dados) {
        try {
            const { crianca, motorista, localizacao, timestamp } = dados;
            
            console.log(`[NOTIFICATION-HUB] Processando embarque: ${crianca.nome}`);

            // Preparar notificação
            const notification = {
                type: 'crianca_embarcou',
                priority: 'high',
                data: {
                    crianca: {
                        id: crianca.id,
                        nome: crianca.nome
                    },
                    motorista: {
                        nome: motorista.nome,
                        telefone: motorista.telefone
                    },
                    localizacao,
                    timestamp: timestamp || new Date(),
                    message: `${crianca.nome} embarcou no veículo`
                }
            };

            // Enviar para responsáveis da criança
            await this.sendToResponsaveis([crianca.responsavel_id], notification);
            
            // Enviar notificação por email/SMS se configurado
            await this.sendExternalNotification(crianca, 'embarque', notification.data);
            
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar embarque:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula evento de criança desembarcando
     */
    async handleCriancaDesembarcou(dados) {
        try {
            const { crianca, motorista, localizacao, timestamp } = dados;
            
            console.log(`[NOTIFICATION-HUB] Processando desembarque: ${crianca.nome}`);

            const notification = {
                type: 'crianca_desembarcou',
                priority: 'high',
                data: {
                    crianca: {
                        id: crianca.id,
                        nome: crianca.nome
                    },
                    motorista: {
                        nome: motorista.nome,
                        telefone: motorista.telefone
                    },
                    localizacao,
                    timestamp: timestamp || new Date(),
                    message: `${crianca.nome} desembarcou do veículo`
                }
            };

            await this.sendToResponsaveis([crianca.responsavel_id], notification);
            await this.sendExternalNotification(crianca, 'desembarque', notification.data);
            
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar desembarque:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula atualização de localização
     */
    async handleLocalizacaoAtualizada(dados) {
        try {
            const { motorista, localizacao, criancas_embarcadas, velocidade } = dados;
            
            // Obter IDs dos responsáveis das crianças embarcadas
            const responsaveisInteressados = criancas_embarcadas
                .map(crianca => crianca.responsavel_id);

            const notification = {
                type: 'localizacao_atualizada',
                priority: 'medium',
                data: {
                    motorista: {
                        nome: motorista.nome
                    },
                    localizacao,
                    velocidade,
                    timestamp: new Date(),
                    criancas_embarcadas: criancas_embarcadas.length,
                    message: `Localização atualizada - Velocidade: ${velocidade}km/h`
                }
            };

            await this.sendToResponsaveis(responsaveisInteressados, notification);
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar localização:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula veículo chegando ao destino
     */
    async handleVeiculoChegando(dados) {
        try {
            const { motorista, destino, criancas_embarcadas, tempo_estimado } = dados;
            
            const responsaveisIds = criancas_embarcadas.map(crianca => crianca.responsavel_id);

            const notification = {
                type: 'veiculo_chegando',
                priority: 'high',
                data: {
                    motorista: {
                        nome: motorista.nome
                    },
                    destino,
                    tempo_estimado,
                    timestamp: new Date(),
                    message: `Veículo chegando em ${destino} - ETA: ${tempo_estimado} minutos`
                }
            };

            await this.sendToResponsaveis(responsaveisIds, notification);
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar chegada:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula início de viagem
     */
    async handleViagemIniciada(dados) {
        try {
            const { viagem, motorista, criancas } = dados;
            
            const responsaveisIds = criancas.map(crianca => crianca.responsavel_id);

            const notification = {
                type: 'viagem_iniciada',
                priority: 'medium',
                data: {
                    viagem: {
                        id: viagem.id,
                        tipo: viagem.tipo,
                        origem: viagem.origem,
                        destino: viagem.destino
                    },
                    motorista: {
                        nome: motorista.nome,
                        telefone: motorista.telefone
                    },
                    timestamp: new Date(),
                    message: `Viagem iniciada: ${viagem.origem} → ${viagem.destino}`
                }
            };

            await this.sendToResponsaveis(responsaveisIds, notification);
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar início de viagem:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula fim de viagem
     */
    async handleViagemFinalizada(dados) {
        try {
            const { viagem, motorista, criancas, duracao } = dados;
            
            const responsaveisIds = criancas.map(crianca => crianca.responsavel_id);

            const notification = {
                type: 'viagem_finalizada',
                priority: 'medium',
                data: {
                    viagem: {
                        id: viagem.id,
                        tipo: viagem.tipo
                    },
                    motorista: {
                        nome: motorista.nome
                    },
                    duracao,
                    timestamp: new Date(),
                    message: `Viagem finalizada - Duração: ${duracao} minutos`
                }
            };

            await this.sendToResponsaveis(responsaveisIds, notification);
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar fim de viagem:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula detecção de atraso
     */
    async handleAtrasoDetectado(dados) {
        try {
            const { motorista, atraso_minutos, motivo, criancas_afetadas } = dados;
            
            const responsaveisIds = criancas_afetadas.map(crianca => crianca.responsavel_id);

            const notification = {
                type: 'atraso_detectado',
                priority: 'high',
                data: {
                    motorista: {
                        nome: motorista.nome,
                        telefone: motorista.telefone
                    },
                    atraso_minutos,
                    motivo,
                    timestamp: new Date(),
                    message: `Atraso de ${atraso_minutos} minutos detectado. Motivo: ${motivo}`
                }
            };

            await this.sendToResponsaveis(responsaveisIds, notification);
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar atraso:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula emergências
     */
    async handleEmergencia(dados) {
        try {
            const { tipo, motorista, localizacao, criancas_embarcadas, descricao } = dados;
            
            const responsaveisIds = criancas_embarcadas.map(crianca => crianca.responsavel_id);

            const notification = {
                type: 'emergencia',
                priority: 'critical',
                data: {
                    tipo,
                    motorista: {
                        nome: motorista.nome,
                        telefone: motorista.telefone
                    },
                    localizacao,
                    descricao,
                    timestamp: new Date(),
                    message: `EMERGÊNCIA: ${tipo} - ${descricao}`
                }
            };

            // Enviar para todos os responsáveis imediatamente
            await this.sendToResponsaveis(responsaveisIds, notification);
            
            // Também enviar para administradores
            await this.sendToAdministradores(notification);
            
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar emergência:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Manipula manutenção programada
     */
    async handleManutencaoProgramada(dados) {
        try {
            const { data_manutencao, servicos_afetados, mensagem } = dados;

            const notification = {
                type: 'manutencao_programada',
                priority: 'low',
                data: {
                    data_manutencao,
                    servicos_afetados,
                    mensagem,
                    timestamp: new Date(),
                    message: `Manutenção programada para ${data_manutencao}`
                }
            };

            // Broadcast para todos os usuários conectados
            this.wsManager.broadcast(notification);
            this.updateStats('sent');

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao processar manutenção:', error);
            this.updateStats('failed');
        }
    }

    /**
     * Método principal para envio de notificações
     */
    async sendNotification(notification) {
        try {
            // Validar estrutura da notificação
            if (!notification || !notification.tipo) {
                throw new Error('Notificação deve ter um tipo definido');
            }

            // Adicionar timestamp se não existir
            if (!notification.timestamp) {
                notification.timestamp = new Date();
            }

            // Determinar método de envio baseado nos destinatários
            if (notification.destinatarios && Array.isArray(notification.destinatarios)) {
                // Enviar para usuários específicos
                let sent = 0;
                for (const destinatario of notification.destinatarios) {
                    if (this.wsManager.sendToUser(destinatario, notification)) {
                        sent++;
                    }
                }
                console.log(`[NOTIFICATION-HUB] Notificação enviada para ${sent}/${notification.destinatarios.length} destinatários`);
                this.updateStats('sent');
                return sent;
            } else {
                // Broadcast para todos
                const sent = this.wsManager.broadcast(notification);
                console.log(`[NOTIFICATION-HUB] Broadcast enviado para ${sent} conexões`);
                this.updateStats('sent');
                return sent;
            }

        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao enviar notificação:', error);
            this.updateStats('failed');
            throw error;
        }
    }

    /**
     * Envia notificação para responsáveis específicos
     */
    async sendToResponsaveis(responsaveisIds, notification) {
        if (!Array.isArray(responsaveisIds) || responsaveisIds.length === 0) {
            return;
        }

        let sent = 0;
        
        for (const responsavelId of responsaveisIds) {
            if (this.wsManager.sendToUser(responsavelId, notification)) {
                sent++;
            }
        }

        console.log(`[NOTIFICATION-HUB] Notificação enviada para ${sent}/${responsaveisIds.length} responsáveis`);
        return sent;
    }

    /**
     * Envia notificação para administradores
     */
    async sendToAdministradores(notification) {
        // Obter administradores conectados
        const connectionStore = this.wsManager.connectionStore;
        const admins = connectionStore.getUsersByType('admin');
        
        let sent = 0;
        
        for (const admin of admins) {
            if (this.wsManager.sendToUser(admin.userId, notification)) {
                sent++;
            }
        }

        console.log(`[NOTIFICATION-HUB] Notificação enviada para ${sent} administradores`);
        return sent;
    }

    /**
     * Envia notificação externa (email/SMS)
     */
    async sendExternalNotification(crianca, tipo, dados) {
        try {
            // Usar o serviço de notificação existente para email/SMS
            if (notificationService && typeof notificationService.notificarEvento === 'function') {
                await notificationService.notificarEvento(crianca, tipo, dados);
            }
        } catch (error) {
            console.error('[NOTIFICATION-HUB] Erro ao enviar notificação externa:', error);
        }
    }

    /**
     * Atualiza estatísticas
     */
    updateStats(type) {
        const now = new Date();
        
        // Reset diário
        if (now.toDateString() !== this.stats.lastReset.toDateString()) {
            this.stats.notificationsSent = 0;
            this.stats.notificationsFailed = 0;
            this.stats.lastReset = now;
        }

        if (type === 'sent') {
            this.stats.notificationsSent++;
        } else if (type === 'failed') {
            this.stats.notificationsFailed++;
        }
    }

    /**
     * Obtém estatísticas do hub
     */
    getStats() {
        return {
            ...this.stats,
            isActive: this.isActive,
            successRate: this.stats.notificationsSent > 0 
                ? ((this.stats.notificationsSent / (this.stats.notificationsSent + this.stats.notificationsFailed)) * 100).toFixed(2)
                : 100,
            wsStats: this.wsManager.getStats()
        };
    }

    /**
     * Para o hub de notificações
     */
    shutdown() {
        this.isActive = false;
        this.removeAllListeners();
        console.log('[NOTIFICATION-HUB] Hub de notificações desativado');
    }
}

module.exports = NotificationHub;