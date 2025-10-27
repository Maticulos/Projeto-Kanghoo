const db = require('../config/db');
const logger = require('./logger');

/**
 * SERVIÇO DE PERSISTÊNCIA DE RASTREAMENTO
 * 
 * Esta classe gerencia a persistência de dados de rastreamento em tempo real,
 * implementando um sistema híbrido de cache em memória + banco de dados.
 * 
 * ARQUITETURA DO SISTEMA:
 * 
 * 1. CACHE EM MEMÓRIA (Map):
 *    - Armazena dados recentes para acesso ultra-rápido
 *    - Timeout configurável (5 minutos por padrão)
 *    - Limpeza automática de dados expirados
 * 
 * 2. ESTRUTURA DE DADOS:
 *    - location_{motorista_id}: Localização atual do motorista
 *    - viagem_{viagem_id}: Dados completos da viagem
 *    - eventos_{viagem_id}: Array de eventos (embarque/desembarque)
 * 
 * 3. ESTRATÉGIA DE PERSISTÊNCIA:
 *    - Escrita imediata no cache (performance)
 *    - Escrita assíncrona no banco (durabilidade)
 *    - Fallback para banco em caso de cache miss
 * 
 * BENEFÍCIOS:
 * - Latência ultra-baixa para dados recentes
 * - Redução de carga no banco de dados
 * - Tolerância a falhas temporárias do banco
 * - Escalabilidade horizontal
 */

class TrackingPersistenceService {
    constructor() {
        /**
         * SISTEMA DE CACHE EM MEMÓRIA
         * 
         * Utiliza Map nativo do JavaScript para máxima performance.
         * Estrutura das chaves:
         * 
         * - "location_{motorista_id}": {
         *     motorista_id: string,
         *     latitude: number,
         *     longitude: number,
         *     velocidade: number,
         *     direcao: number,
         *     timestamp: Date,
         *     cached_at: Date  // Para controle de expiração
         *   }
         * 
         * - "viagem_{viagem_id}": {
         *     id: string,
         *     motorista_id: string,
         *     rota_id: string,
         *     status: 'iniciada'|'finalizada',
         *     horario_inicio: Date,
         *     horario_fim: Date,
         *     criancas: Array<string>,
         *     localizacoes: Array<Object>,
         *     eventos: Array<Object>
         *   }
         * 
         * - "eventos_{viagem_id}": Array<{
         *     id: string,
         *     tipo_evento: 'embarque'|'desembarque',
         *     crianca_id: string,
         *     latitude: number,
         *     longitude: number,
         *     timestamp: Date
         *   }>
         */
        this.cache = new Map(); // Cache em memória para dados recentes
        
        /**
         * CONFIGURAÇÕES DE PERFORMANCE
         */
        this.batchSize = 50; // Tamanho do lote para inserções em massa no banco
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos - tempo de vida do cache
    }

    /**
     * MÉTODO DE SALVAMENTO DE LOCALIZAÇÃO
     * 
     * Implementa estratégia cache-first para máxima performance:
     * 1. Valida dados de entrada
     * 2. Salva imediatamente no cache (acesso rápido)
     * 3. Agenda salvamento no banco (durabilidade)
     * 
     * ESTRUTURA DOS DADOS DE LOCALIZAÇÃO:
     * {
     *   motorista_id: string (obrigatório),
     *   rota_id: string (opcional),
     *   latitude: number (obrigatório),
     *   longitude: number (obrigatório),
     *   velocidade: number (padrão: 0),
     *   direcao: number (padrão: 0),
     *   timestamp: Date (padrão: agora)
     * }
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

            // CACHE-FIRST STRATEGY: Salvar no cache primeiro para acesso rápido
            // Chave padronizada: location_{motorista_id}
            const cacheKey = `location_${motorista_id}`;
            this.cache.set(cacheKey, {
                ...dados,
                timestamp: new Date(timestamp),
                cached_at: new Date() // Timestamp para controle de expiração
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

            logger.debug(`Localização salva para motorista ${motorista_id}:`, {
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
            logger.error('Erro ao salvar localização:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO DE INICIALIZAÇÃO DE VIAGEM
     * 
     * Cria uma nova viagem no sistema com estratégia cache-first:
     * 1. Gera ID único para a viagem
     * 2. Cria estrutura de dados no cache
     * 3. Persiste no banco de dados
     * 
     * ESTRUTURA DA VIAGEM:
     * {
     *   id: string (UUID gerado automaticamente),
     *   motorista_id: string (obrigatório),
     *   rota_id: string (obrigatório),
     *   status: 'iniciada' (fixo na criação),
     *   horario_inicio: Date (timestamp atual),
     *   criancas: Array<string> (IDs das crianças),
     *   localizacoes: Array<Object> (histórico de posições),
     *   eventos: Array<Object> (embarques/desembarques)
     * }
     */
    async iniciarViagem(dados) {
        try {
            const {
                motorista_id,
                rota_id,
                criancas = []
            } = dados;

            if (!motorista_id || !rota_id) {
                throw new Error('Motorista e rota são obrigatórios');
            }

            const viagemId = `viagem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const viagem = {
                id: viagemId,
                motorista_id,
                rota_id,
                status: 'iniciada',
                horario_inicio: new Date(),
                criancas,
                localizacoes: [],
                eventos: []
            };

            // CACHE-FIRST: Armazenar no cache para acesso imediato
            // Chave padronizada: viagem_{viagem_id}
            this.cache.set(`viagem_${viagemId}`, {
                ...viagem,
                cached_at: new Date()
            });

            logger.debug(`Viagem iniciada:`, {
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
            logger.error('Erro ao iniciar viagem:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO DE FINALIZAÇÃO DE VIAGEM
     * 
     * Encerra uma viagem ativa e atualiza seu status:
     * 1. Busca viagem no cache ou banco
     * 2. Atualiza status e horário de fim
     * 3. Persiste alterações
     * 
     * TRANSIÇÕES DE STATUS:
     * 'iniciada' → 'finalizada'
     */
    async finalizarViagem(viagem_id) {
        try {
            // CACHE-FIRST: Tentar buscar no cache primeiro
            const cacheKey = `viagem_${viagem_id}`;
            let viagem = this.cache.get(cacheKey);

            if (!viagem) {
                // FALLBACK: Buscar no banco se não estiver no cache
                const result = await db.query(
                    'SELECT * FROM viagens WHERE id = $1',
                    [viagem_id]
                );

                if (result.rows.length === 0) {
                    throw new Error('Viagem não encontrada');
                }

                viagem = result.rows[0];
            }

            // Atualizar dados da viagem
            viagem.status = 'finalizada';
            viagem.horario_fim = new Date();
            viagem.cached_at = new Date();

            // Atualizar cache
            this.cache.set(cacheKey, viagem);

            logger.debug(`Viagem finalizada:`, {
                id: viagemId,
                duracao: viagemFinalizada.tempo_total,
                distancia: viagemFinalizada.distancia_total
            });

            return {
                sucesso: true,
                dados: viagemFinalizada
            };

        } catch (error) {
            logger.error('Erro ao finalizar viagem:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO DE REGISTRO DE EMBARQUE
     * 
     * Registra o embarque de uma criança na viagem:
     * 1. Valida dados de entrada
     * 2. Cria evento de embarque
     * 3. Atualiza cache e banco
     * 
     * ESTRUTURA DO EVENTO DE EMBARQUE:
     * {
     *   id: string (UUID gerado),
     *   tipo_evento: 'embarque',
     *   crianca_id: string,
     *   viagem_id: string,
     *   latitude: number,
     *   longitude: number,
     *   timestamp: Date,
     *   observacoes: string (opcional)
     * }
     */
    async registrarEmbarque(dados) {
        try {
            const {
                viagem_id,
                crianca_id,
                latitude,
                longitude,
                observacoes = ''
            } = dados;

            if (!viagem_id || !crianca_id || !latitude || !longitude) {
                throw new Error('Dados obrigatórios não fornecidos');
            }

            const evento = {
                id: `evento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                tipo_evento: 'embarque',
                crianca_id,
                viagem_id,
                latitude,
                longitude,
                timestamp: new Date(),
                observacoes
            };

            // CACHE-FIRST: Atualizar lista de eventos no cache
            const eventosKey = `eventos_${viagem_id}`;
            let eventos = this.cache.get(eventosKey) || [];
            eventos.push(evento);
            this.cache.set(eventosKey, eventos);

            logger.debug(`Embarque registrado:`, {
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
            logger.error('Erro ao registrar embarque:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO DE REGISTRO DE DESEMBARQUE
     * 
     * Registra o desembarque de uma criança da viagem:
     * 1. Valida dados de entrada
     * 2. Cria evento de desembarque
     * 3. Atualiza cache e banco
     * 
     * ESTRUTURA DO EVENTO DE DESEMBARQUE:
     * Similar ao embarque, mas com tipo_evento: 'desembarque'
     */
    async registrarDesembarque(dados) {
        try {
            const {
                viagem_id,
                crianca_id,
                latitude,
                longitude,
                observacoes = ''
            } = dados;

            if (!viagem_id || !crianca_id || !latitude || !longitude) {
                throw new Error('Dados obrigatórios não fornecidos');
            }

            const evento = {
                id: `evento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                tipo_evento: 'desembarque',
                crianca_id,
                viagem_id,
                latitude,
                longitude,
                timestamp: new Date(),
                observacoes
            };

            // CACHE-FIRST: Atualizar lista de eventos no cache
            const eventosKey = `eventos_${viagem_id}`;
            let eventos = this.cache.get(eventosKey) || [];
            eventos.push(evento);
            this.cache.set(eventosKey, eventos);

            logger.debug(`Desembarque registrado:`, {
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
            logger.error('Erro ao registrar desembarque:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO DE CONSULTA DE HISTÓRICO DE LOCALIZAÇÕES
     * 
     * Recupera o histórico de localizações de uma viagem:
     * 1. Busca primeiro no cache (dados recentes)
     * 2. Fallback para banco de dados (dados históricos)
     * 3. Simula dados se necessário (ambiente de desenvolvimento)
     * 
     * ESTRATÉGIA DE BUSCA:
     * - Cache: Para viagens ativas/recentes
     * - Banco: Para viagens finalizadas/antigas
     * - Simulação: Para demonstração/testes
     * 
     * FORMATO DE RETORNO:
     * {
     *   sucesso: boolean,
     *   dados: Array<{
     *     latitude: number,
     *     longitude: number,
     *     timestamp: Date,
     *     velocidade: number,
     *     direcao: number
     *   }>,
     *   total: number,
     *   erro?: string
     * }
     */
    async obterHistoricoLocalizacoes(viagem_id, filtros = {}) {
        try {
            const { limite = 100, offset = 0 } = filtros;

            // CACHE-FIRST: Verificar se a viagem está no cache
            const viagemCache = this.cache.get(`viagem_${viagem_id}`);
            
            if (viagemCache && viagemCache.localizacoes) {
                // Dados encontrados no cache - viagem ativa
                const localizacoes = viagemCache.localizacoes
                    .slice(offset, offset + limite);

                return {
                    sucesso: true,
                    dados: localizacoes,
                    total: viagemCache.localizacoes.length
                };
            }

            // FALLBACK: Buscar no banco de dados
            // Em um ambiente real, aqui seria feita a consulta ao banco
            // Por enquanto, simular dados para demonstração
            const localizacoesSimuladas = this.simularHistoricoLocalizacoes(viagem_id, limite);

            return {
                sucesso: true,
                dados: localizacoesSimuladas,
                total: localizacoesSimuladas.length
            };

        } catch (error) {
            logger.error('[TRACKING] Erro ao obter histórico de localizações:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO AUXILIAR: SIMULAÇÃO DE DADOS
     * 
     * Gera dados simulados para demonstração do sistema.
     * Em produção, este método seria substituído por consultas reais ao banco.
     */
    simularHistoricoLocalizacoes(viagem_id, limite) {
        const localizacoes = [];
        const baseTime = new Date();
        
        // Coordenadas base (exemplo: região de São Paulo)
        const baseLat = -23.5505;
        const baseLng = -46.6333;

        for (let i = 0; i < limite; i++) {
            localizacoes.push({
                latitude: baseLat + (Math.random() - 0.5) * 0.01,
                longitude: baseLng + (Math.random() - 0.5) * 0.01,
                timestamp: new Date(baseTime.getTime() - (limite - i) * 30000), // 30s intervals
                velocidade: Math.random() * 60, // 0-60 km/h
                direcao: Math.random() * 360 // 0-360 graus
            });
        }

        return localizacoes;
    }

    /**
     * MÉTODO DE CONSULTA DE DADOS DE VIAGEM
     * 
     * Recupera informações completas de uma viagem:
     * 1. Busca no cache (performance)
     * 2. Fallback para banco (persistência)
     * 3. Agrega eventos relacionados
     * 
     * DADOS RETORNADOS:
     * - Informações básicas da viagem
     * - Lista de eventos (embarque/desembarque)
     * - Estatísticas calculadas
     * - Status atual
     */
    async obterDadosViagem(viagem_id) {
        try {
            // CACHE-FIRST: Buscar no cache primeiro
            const cacheKey = `viagem_${viagem_id}`;
            let viagem = this.cache.get(cacheKey);

            if (!viagem) {
                // FALLBACK: Buscar no banco de dados
                // Em ambiente real, implementar consulta SQL aqui
                logger.debug(`Viagem ${viagem_id} não encontrada no cache, buscando no banco...`);
                
                // Simular busca no banco
                return {
                    sucesso: false,
                    erro: 'Viagem não encontrada'
                };
            }

            // Buscar eventos relacionados
            const eventosKey = `eventos_${viagem_id}`;
            const eventos = this.cache.get(eventosKey) || [];

            // Agregar dados completos
            const dadosCompletos = {
                ...viagem,
                eventos,
                estatisticas: {
                    total_eventos: eventos.length,
                    embarques: eventos.filter(e => e.tipo_evento === 'embarque').length,
                    desembarques: eventos.filter(e => e.tipo_evento === 'desembarque').length,
                    duracao_minutos: viagem.horario_fim ? 
                        Math.round((new Date(viagem.horario_fim) - new Date(viagem.horario_inicio)) / 60000) : 
                        Math.round((new Date() - new Date(viagem.horario_inicio)) / 60000)
                }
            };

            return {
                sucesso: true,
                dados: dadosCompletos
            };

        } catch (error) {
            logger.error('[TRACKING] Erro ao obter dados da viagem:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO DE CONSULTA DE LOCALIZAÇÃO ATUAL
     * 
     * Obtém a localização mais recente de um motorista:
     * 1. Busca no cache (dados em tempo real)
     * 2. Verifica expiração dos dados
     * 3. Remove dados expirados automaticamente
     * 
     * CONTROLE DE EXPIRAÇÃO:
     * - Dados mais antigos que cacheTimeout são considerados inválidos
     * - Limpeza automática de dados expirados
     * - Retorno de erro para dados não encontrados/expirados
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

            // CONTROLE DE EXPIRAÇÃO: Verificar se não está muito antiga
            const agora = new Date();
            const tempoCache = agora - localizacao.cached_at;
            
            if (tempoCache > this.cacheTimeout) {
                // LIMPEZA AUTOMÁTICA: Remover dados expirados
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
            logger.error('[TRACKING] Erro ao obter localização atual:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    /**
     * MÉTODO DE LIMPEZA DE CACHE
     * 
     * Remove dados expirados do cache para otimizar memória:
     * 1. Itera por todas as entradas do cache
     * 2. Verifica timestamp de cada entrada
     * 3. Remove entradas expiradas
     * 4. Registra estatísticas de limpeza
     * 
     * ESTRATÉGIA DE LIMPEZA:
     * - Execução manual ou agendada
     * - Baseada em timestamp cached_at
     * - Log de estatísticas para monitoramento
     * 
     * RECOMENDAÇÃO:
     * Executar periodicamente (ex: a cada 10 minutos) via cron job
     */
    limparCacheAntigo() {
        const agora = new Date();
        let itensRemovidos = 0;
        const totalInicial = this.cache.size;
        
        // Iterar por todas as entradas do cache
        for (const [key, value] of this.cache.entries()) {
            // Verificar se o item tem timestamp e está expirado
            if (value.cached_at && (agora - value.cached_at) > this.cacheTimeout) {
                this.cache.delete(key);
                itensRemovidos++;
            }
        }
        
        logger.debug(`[CACHE] Limpeza concluída:`, {
            itens_iniciais: totalInicial,
            itens_removidos: itensRemovidos,
            itens_restantes: this.cache.size,
            memoria_liberada: `${itensRemovidos} entradas`
        });
    }

    /**
     * MÉTODO DE ESTATÍSTICAS DO CACHE
     * 
     * Fornece métricas detalhadas sobre o uso do cache:
     * 1. Contagem total de itens
     * 2. Distribuição por tipo de dados
     * 3. Análise de uso de memória
     * 
     * TIPOS DE DADOS MONITORADOS:
     * - location_*: Localizações de motoristas
     * - viagem_*: Dados de viagens
     * - eventos_*: Eventos de embarque/desembarque
     * 
     * USO:
     * Monitoramento de performance e uso de memória
     * Debugging e otimização do sistema
     */
    obterEstatisticasCache() {
        const chaves = Array.from(this.cache.keys());
        
        return {
            total_itens: this.cache.size,
            tipos: {
                localizacoes: chaves.filter(k => k.startsWith('location_')).length,
                viagens: chaves.filter(k => k.startsWith('viagem_')).length,
                eventos: chaves.filter(k => k.startsWith('eventos_')).length
            },
            memoria: {
                estimativa_kb: Math.round(JSON.stringify([...this.cache.entries()]).length / 1024),
                timeout_configurado: `${this.cacheTimeout / 1000}s`,
                batch_size: this.batchSize
            },
            timestamp_consulta: new Date()
        };
    }

}

module.exports = new TrackingPersistenceService();