/**
 * INTEGRAÇÃO ENTRE SISTEMA DE RASTREAMENTO E NOTIFICAÇÕES EM TEMPO REAL
 * 
 * Este módulo conecta o sistema de rastreamento existente com o notification-hub,
 * permitindo que eventos de rastreamento sejam convertidos em notificações em tempo real
 * para os usuários conectados via WebSocket.
 */

const NotificationHub = require('./notification-hub');
const EventTypes = require('./event-types');
const db = require('../config/db');

class TrackingIntegration {
    constructor(notificationHub) {
        this.notificationHub = notificationHub;
        this.isInitialized = false;
        
        // Cache para otimização
        this.viagensAtivas = new Map();
        this.ultimasLocalizacoes = new Map();
        this.alertasAtivos = new Map();
        
        console.log('[TRACKING-INTEGRATION] Inicializando integração de rastreamento');
    }

    /**
     * Inicializa a integração
     */
    async initialize() {
        try {
            // Carregar viagens ativas do banco
            await this.carregarViagensAtivas();
            
            this.isInitialized = true;
            console.log('[TRACKING-INTEGRATION] Integração inicializada com sucesso');
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao inicializar:', error);
            throw error;
        }
    }

    /**
     * Carrega viagens ativas do banco de dados
     */
    async carregarViagensAtivas() {
        try {
            const viagens = await db.query(`
                SELECT 
                    v.id,
                    v.motorista_id,
                    v.rota_id,
                    v.tipo_viagem,
                    v.status,
                    v.horario_inicio,
                    r.nome_rota,
                    array_agg(
                        json_build_object(
                            'id', c.id,
                            'nome', c.nome_completo,
                            'responsavel_id', c.responsavel_id,
                            'embarcada', COALESCE(cv.status = 'embarcada', false)
                        )
                    ) as criancas
                FROM viagens v
                JOIN rotas r ON v.rota_id = r.id
                LEFT JOIN criancas_viagens cv ON v.id = cv.viagem_id
                LEFT JOIN criancas c ON cv.crianca_id = c.id
                WHERE v.status IN ('iniciada', 'em_andamento')
                AND v.data_viagem = CURRENT_DATE
                GROUP BY v.id, r.nome_rota
            `);

            for (const viagem of viagens.rows) {
                this.viagensAtivas.set(viagem.id, viagem);
            }

            console.log(`[TRACKING-INTEGRATION] Carregadas ${viagens.rows.length} viagens ativas`);
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao carregar viagens ativas:', error);
        }
    }

    /**
     * Processa atualização de localização
     */
    async processarLocalizacao(dados) {
        if (!this.isInitialized) {
            console.warn('[TRACKING-INTEGRATION] Integração não inicializada');
            return;
        }

        try {
            const { viagem_id, latitude, longitude, velocidade, timestamp } = dados;
            
            // Verificar se a viagem está ativa
            const viagem = this.viagensAtivas.get(viagem_id);
            if (!viagem) {
                console.warn(`[TRACKING-INTEGRATION] Viagem ${viagem_id} não encontrada ou inativa`);
                return;
            }

            // Atualizar cache de localização
            const localizacaoAtual = {
                latitude,
                longitude,
                velocidade,
                timestamp: timestamp || new Date(),
                viagem_id
            };
            
            this.ultimasLocalizacoes.set(viagem_id, localizacaoAtual);

            // Enviar notificação de localização para responsáveis das crianças embarcadas
            await this.notificarLocalizacaoAtualizada(viagem, localizacaoAtual);

            // Verificar alertas baseados na localização
            await this.verificarAlertas(viagem, localizacaoAtual);

            console.log(`[TRACKING-INTEGRATION] Localização processada para viagem ${viagem_id}`);
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao processar localização:', error);
        }
    }

    /**
     * Processa embarque de criança
     */
    async processarEmbarque(dados) {
        try {
            const { viagem_id, crianca_id, timestamp } = dados;
            
            const viagem = this.viagensAtivas.get(viagem_id);
            if (!viagem) return;

            // Atualizar status no cache
            const crianca = viagem.criancas.find(c => c.id === crianca_id);
            if (crianca) {
                crianca.embarcada = true;
                crianca.horario_embarque = timestamp || new Date();
            }

            // Buscar dados do responsável
            const responsavel = await this.buscarResponsavel(crianca_id);
            
            // Criar notificação de embarque
            const notification = EventTypes.createNotification(
                EventTypes.EVENT_TYPES.CRIANCA_EMBARCOU,
                {
                    crianca_id,
                    crianca_nome: crianca?.nome,
                    viagem_id,
                    rota_nome: viagem.nome_rota,
                    horario: timestamp || new Date(),
                    localizacao: this.ultimasLocalizacoes.get(viagem_id)
                },
                EventTypes.PRIORITY_LEVELS.MEDIUM,
                [responsavel?.id]
            );

            // Enviar notificação
            await this.notificationHub.sendNotification(notification);

            console.log(`[TRACKING-INTEGRATION] Embarque processado: criança ${crianca_id} na viagem ${viagem_id}`);
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao processar embarque:', error);
        }
    }

    /**
     * Processa desembarque de criança
     */
    async processarDesembarque(dados) {
        try {
            const { viagem_id, crianca_id, timestamp } = dados;
            
            const viagem = this.viagensAtivas.get(viagem_id);
            if (!viagem) return;

            // Atualizar status no cache
            const crianca = viagem.criancas.find(c => c.id === crianca_id);
            if (crianca) {
                crianca.embarcada = false;
                crianca.horario_desembarque = timestamp || new Date();
            }

            // Buscar dados do responsável
            const responsavel = await this.buscarResponsavel(crianca_id);
            
            // Criar notificação de desembarque
            const notification = EventTypes.createNotification(
                EventTypes.EVENT_TYPES.CRIANCA_DESEMBARCOU,
                {
                    crianca_id,
                    crianca_nome: crianca?.nome,
                    viagem_id,
                    rota_nome: viagem.nome_rota,
                    horario: timestamp || new Date(),
                    localizacao: this.ultimasLocalizacoes.get(viagem_id)
                },
                EventTypes.PRIORITY_LEVELS.HIGH,
                [responsavel?.id]
            );

            // Enviar notificação
            await this.notificationHub.sendNotification(notification);

            console.log(`[TRACKING-INTEGRATION] Desembarque processado: criança ${crianca_id} na viagem ${viagem_id}`);
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao processar desembarque:', error);
        }
    }

    /**
     * Notifica atualização de localização para responsáveis
     */
    async notificarLocalizacaoAtualizada(viagem, localizacao) {
        try {
            // Filtrar crianças embarcadas
            const criancasEmbarcadas = viagem.criancas.filter(c => c.embarcada);
            
            if (criancasEmbarcadas.length === 0) return;

            // Buscar responsáveis
            const responsaveisIds = criancasEmbarcadas.map(c => c.responsavel_id);
            
            // Criar notificação de localização
            const notification = EventTypes.createNotification(
                EventTypes.EVENT_TYPES.LOCALIZACAO_ATUALIZADA,
                {
                    viagem_id: viagem.id,
                    rota_nome: viagem.nome_rota,
                    latitude: localizacao.latitude,
                    longitude: localizacao.longitude,
                    velocidade: localizacao.velocidade,
                    timestamp: localizacao.timestamp,
                    criancas_embarcadas: criancasEmbarcadas.length
                },
                EventTypes.PRIORITY_LEVELS.LOW,
                responsaveisIds
            );

            // Enviar notificação
            await this.notificationHub.sendNotification(notification);
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao notificar localização:', error);
        }
    }

    /**
     * Verifica alertas baseados na localização
     */
    async verificarAlertas(viagem, localizacao) {
        try {
            // Verificar velocidade excessiva
            if (localizacao.velocidade > 80) {
                await this.criarAlertaVelocidade(viagem, localizacao);
            }

            // Verificar parada prolongada
            await this.verificarParadaProlongada(viagem, localizacao);

            // Verificar desvio de rota (implementação futura)
            // await this.verificarDesvioRota(viagem, localizacao);
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao verificar alertas:', error);
        }
    }

    /**
     * Cria alerta de velocidade excessiva
     */
    async criarAlertaVelocidade(viagem, localizacao) {
        const alertaKey = `velocidade_${viagem.id}`;
        
        // Evitar spam de alertas
        if (this.alertasAtivos.has(alertaKey)) {
            const ultimoAlerta = this.alertasAtivos.get(alertaKey);
            if (Date.now() - ultimoAlerta < 300000) { // 5 minutos
                return;
            }
        }

        this.alertasAtivos.set(alertaKey, Date.now());

        // Buscar responsáveis de todas as crianças da viagem
        const responsaveisIds = viagem.criancas.map(c => c.responsavel_id);

        const notification = EventTypes.createNotification(
            EventTypes.EVENT_TYPES.ALERTA_VELOCIDADE,
            {
                viagem_id: viagem.id,
                rota_nome: viagem.nome_rota,
                velocidade_atual: localizacao.velocidade,
                velocidade_limite: 80,
                latitude: localizacao.latitude,
                longitude: localizacao.longitude,
                timestamp: localizacao.timestamp
            },
            EventTypes.PRIORITY_LEVELS.HIGH,
            responsaveisIds
        );

        await this.notificationHub.sendNotification(notification);
        
        console.log(`[TRACKING-INTEGRATION] Alerta de velocidade criado para viagem ${viagem.id}`);
    }

    /**
     * Verifica parada prolongada
     */
    async verificarParadaProlongada(viagem, localizacao) {
        if (localizacao.velocidade > 5) return; // Veículo em movimento

        const ultimaLocalizacao = this.ultimasLocalizacoes.get(viagem.id);
        if (!ultimaLocalizacao) return;

        const tempoParado = Date.now() - new Date(ultimaLocalizacao.timestamp).getTime();
        
        // Alerta após 15 minutos parado
        if (tempoParado > 900000) {
            const alertaKey = `parada_${viagem.id}`;
            
            if (!this.alertasAtivos.has(alertaKey)) {
                this.alertasAtivos.set(alertaKey, Date.now());

                const responsaveisIds = viagem.criancas.map(c => c.responsavel_id);

                const notification = EventTypes.createNotification(
                    EventTypes.EVENT_TYPES.PARADA_PROLONGADA,
                    {
                        viagem_id: viagem.id,
                        rota_nome: viagem.nome_rota,
                        tempo_parado: Math.floor(tempoParado / 60000), // minutos
                        latitude: localizacao.latitude,
                        longitude: localizacao.longitude,
                        timestamp: localizacao.timestamp
                    },
                    EventTypes.PRIORITY_LEVELS.MEDIUM,
                    responsaveisIds
                );

                await this.notificationHub.sendNotification(notification);
                
                console.log(`[TRACKING-INTEGRATION] Alerta de parada prolongada criado para viagem ${viagem.id}`);
            }
        }
    }

    /**
     * Busca dados do responsável
     */
    async buscarResponsavel(criancaId) {
        try {
            const resultado = await db.query(
                'SELECT responsavel_id FROM criancas WHERE id = $1',
                [criancaId]
            );
            
            return resultado.rows[0];
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao buscar responsável:', error);
            return null;
        }
    }

    /**
     * Atualiza status de viagem
     */
    async atualizarStatusViagem(viagemId, novoStatus) {
        try {
            const viagem = this.viagensAtivas.get(viagemId);
            if (!viagem) return;

            viagem.status = novoStatus;

            // Se a viagem foi finalizada, remover do cache
            if (novoStatus === 'finalizada') {
                this.viagensAtivas.delete(viagemId);
                this.ultimasLocalizacoes.delete(viagemId);
                
                // Limpar alertas ativos
                for (const [key] of this.alertasAtivos) {
                    if (key.includes(`_${viagemId}`)) {
                        this.alertasAtivos.delete(key);
                    }
                }
            }

            console.log(`[TRACKING-INTEGRATION] Status da viagem ${viagemId} atualizado para: ${novoStatus}`);
            
        } catch (error) {
            console.error('[TRACKING-INTEGRATION] Erro ao atualizar status da viagem:', error);
        }
    }

    /**
     * Obtém estatísticas da integração
     */
    getStats() {
        return {
            viagens_ativas: this.viagensAtivas.size,
            localizacoes_cache: this.ultimasLocalizacoes.size,
            alertas_ativos: this.alertasAtivos.size,
            inicializada: this.isInitialized
        };
    }

    /**
     * Limpa cache e recursos
     */
    cleanup() {
        this.viagensAtivas.clear();
        this.ultimasLocalizacoes.clear();
        this.alertasAtivos.clear();
        this.isInitialized = false;
        
        console.log('[TRACKING-INTEGRATION] Cache limpo');
    }
}

module.exports = TrackingIntegration;