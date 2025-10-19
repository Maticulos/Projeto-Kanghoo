/**
 * Serviço de Persistência de Dados de Rastreamento
 * Gerencia o armazenamento e recuperação de dados de localização e viagens
 */

class TrackingPersistenceService {
    constructor() {
        this.cache = new Map(); // Cache em memória para dados recentes
        this.batchSize = 50; // Tamanho do lote para inserções em massa
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Salva dados de localização em tempo real
     */
    async salvarLocalizacao(dados) {
        try {
            const {
                motorista_id,
                rota_id,
                latitude,
                longitude,
                velocidade = 0,
                direcao = 0,
                timestamp = new Date()
            } = dados;

            // Validar dados obrigatórios
            if (!motorista_id || !latitude || !longitude) {
                throw new Error('Dados obrigatórios não fornecidos');
            }

            // Salvar no cache primeiro para acesso rápido
            const cacheKey = `location_${motorista_id}`;
            this.cache.set(cacheKey, {
                ...dados,
                timestamp: new Date(timestamp),
                cached_at: new Date()
            });

            // Simular salvamento no banco (quando o banco estiver configurado)
            const locationData = {
                motorista_id,
                rota_id,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                velocidade: parseFloat(velocidade) || 0,
                direcao: parseInt(direcao) || 0,
                timestamp_localizacao: new Date(timestamp),
                ativo: true
            };

            console.log(`[TRACKING] Localização salva para motorista ${motorista_id}:`, {
                lat: latitude,
                lng: longitude,
                velocidade,
                timestamp: new Date(timestamp).toISOString()
            });

            return {
                sucesso: true,
                id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                dados: locationData
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao salvar localização:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Inicia uma nova viagem
     */
    async iniciarViagem(dados) {
        try {
            const {
                motorista_id,
                rota_id,
                tipo_viagem = 'ida',
                criancas_ids = []
            } = dados;

            const viagemId = `viagem_${Date.now()}_${motorista_id}`;
            
            const viagem = {
                id: viagemId,
                motorista_id,
                rota_id,
                data_viagem: new Date().toISOString().split('T')[0],
                horario_inicio: new Date(),
                tipo_viagem,
                status: 'iniciada',
                criancas: criancas_ids,
                localizacoes: [],
                eventos: []
            };

            // Salvar no cache
            this.cache.set(`viagem_${viagemId}`, viagem);

            console.log(`[TRACKING] Viagem iniciada:`, {
                id: viagemId,
                motorista_id,
                rota_id,
                tipo_viagem,
                criancas: criancas_ids.length
            });

            return {
                sucesso: true,
                viagem_id: viagemId,
                dados: viagem
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao iniciar viagem:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Finaliza uma viagem
     */
    async finalizarViagem(viagemId, dados = {}) {
        try {
            const viagem = this.cache.get(`viagem_${viagemId}`);
            
            if (!viagem) {
                throw new Error('Viagem não encontrada');
            }

            const viagemFinalizada = {
                ...viagem,
                horario_fim: new Date(),
                status: 'finalizada',
                distancia_total: dados.distancia_total || 0,
                tempo_total: dados.tempo_total || 0,
                observacoes: dados.observacoes || ''
            };

            this.cache.set(`viagem_${viagemId}`, viagemFinalizada);

            console.log(`[TRACKING] Viagem finalizada:`, {
                id: viagemId,
                duracao: viagemFinalizada.tempo_total,
                distancia: viagemFinalizada.distancia_total
            });

            return {
                sucesso: true,
                dados: viagemFinalizada
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao finalizar viagem:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Registra embarque de criança
     */
    async registrarEmbarque(dados) {
        try {
            const {
                viagem_id,
                crianca_id,
                latitude,
                longitude,
                timestamp = new Date()
            } = dados;

            const evento = {
                id: `evento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                viagem_id,
                tipo_evento: 'embarque',
                crianca_id,
                latitude,
                longitude,
                timestamp: new Date(timestamp),
                dados_evento: {
                    crianca_id,
                    local: `${latitude}, ${longitude}`
                }
            };

            // Salvar no cache
            const cacheKey = `eventos_${viagem_id}`;
            const eventos = this.cache.get(cacheKey) || [];
            eventos.push(evento);
            this.cache.set(cacheKey, eventos);

            console.log(`[TRACKING] Embarque registrado:`, {
                viagem_id,
                crianca_id,
                localizacao: `${latitude}, ${longitude}`
            });

            return {
                sucesso: true,
                evento_id: evento.id,
                dados: evento
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao registrar embarque:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Registra desembarque de criança
     */
    async registrarDesembarque(dados) {
        try {
            const {
                viagem_id,
                crianca_id,
                latitude,
                longitude,
                timestamp = new Date()
            } = dados;

            const evento = {
                id: `evento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                viagem_id,
                tipo_evento: 'desembarque',
                crianca_id,
                latitude,
                longitude,
                timestamp: new Date(timestamp),
                dados_evento: {
                    crianca_id,
                    local: `${latitude}, ${longitude}`
                }
            };

            // Salvar no cache
            const cacheKey = `eventos_${viagem_id}`;
            const eventos = this.cache.get(cacheKey) || [];
            eventos.push(evento);
            this.cache.set(cacheKey, eventos);

            console.log(`[TRACKING] Desembarque registrado:`, {
                viagem_id,
                crianca_id,
                localizacao: `${latitude}, ${longitude}`
            });

            return {
                sucesso: true,
                evento_id: evento.id,
                dados: evento
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao registrar desembarque:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Obtém histórico de localizações
     */
    async obterHistoricoLocalizacoes(motorista_id, filtros = {}) {
        try {
            const {
                data_inicio,
                data_fim,
                limite = 100
            } = filtros;

            // Buscar no cache (simulação)
            const localizacoes = [];
            
            // Gerar dados simulados para demonstração
            const agora = new Date();
            for (let i = 0; i < limite; i++) {
                const timestamp = new Date(agora.getTime() - (i * 60000)); // A cada minuto
                localizacoes.push({
                    id: i + 1,
                    motorista_id,
                    latitude: -23.5505 + (Math.random() - 0.5) * 0.01,
                    longitude: -46.6333 + (Math.random() - 0.5) * 0.01,
                    velocidade: Math.random() * 60,
                    direcao: Math.random() * 360,
                    timestamp
                });
            }

            console.log(`[TRACKING] Histórico obtido para motorista ${motorista_id}: ${localizacoes.length} pontos`);

            return {
                sucesso: true,
                dados: localizacoes,
                total: localizacoes.length
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao obter histórico:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Obtém dados de viagem
     */
    async obterDadosViagem(viagemId) {
        try {
            const viagem = this.cache.get(`viagem_${viagemId}`);
            
            if (!viagem) {
                return {
                    sucesso: false,
                    erro: 'Viagem não encontrada'
                };
            }

            const eventos = this.cache.get(`eventos_${viagemId}`) || [];

            return {
                sucesso: true,
                dados: {
                    ...viagem,
                    eventos,
                    total_eventos: eventos.length
                }
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao obter dados da viagem:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Obtém localização atual do motorista
     */
    async obterLocalizacaoAtual(motorista_id) {
        try {
            const cacheKey = `location_${motorista_id}`;
            const localizacao = this.cache.get(cacheKey);

            if (!localizacao) {
                return {
                    sucesso: false,
                    erro: 'Localização não encontrada'
                };
            }

            // Verificar se não está muito antiga
            const agora = new Date();
            const tempoCache = agora - localizacao.cached_at;
            
            if (tempoCache > this.cacheTimeout) {
                this.cache.delete(cacheKey);
                return {
                    sucesso: false,
                    erro: 'Localização expirada'
                };
            }

            return {
                sucesso: true,
                dados: localizacao
            };

        } catch (error) {
            console.error('[TRACKING] Erro ao obter localização atual:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * Limpa cache antigo
     */
    limparCacheAntigo() {
        const agora = new Date();
        
        for (const [key, value] of this.cache.entries()) {
            if (value.cached_at && (agora - value.cached_at) > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
        
        console.log(`[TRACKING] Cache limpo. Itens restantes: ${this.cache.size}`);
    }

    /**
     * Obtém estatísticas do cache
     */
    obterEstatisticasCache() {
        return {
            total_itens: this.cache.size,
            tipos: {
                localizacoes: Array.from(this.cache.keys()).filter(k => k.startsWith('location_')).length,
                viagens: Array.from(this.cache.keys()).filter(k => k.startsWith('viagem_')).length,
                eventos: Array.from(this.cache.keys()).filter(k => k.startsWith('eventos_')).length
            }
        };
    }
}

module.exports = new TrackingPersistenceService();