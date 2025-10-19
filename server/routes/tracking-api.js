/**
 * API Routes para Sistema de Persistência de Rastreamento
 * Endpoints para gerenciar dados de localização e viagens
 */

const Router = require('koa-router');
const trackingService = require('../utils/tracking-persistence');
const { authenticateToken } = require('../middleware/auth-utils');

const router = new Router({ prefix: '/api/tracking' });

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

/**
 * POST /api/tracking/location
 * Salva localização em tempo real
 */
router.post('/location', async (ctx) => {
    try {
        const { latitude, longitude, velocidade, direcao, rota_id } = ctx.request.body;
        const motorista_id = ctx.user.id;

        if (!latitude || !longitude) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Latitude e longitude são obrigatórias'
            };
            return;
        }

        const resultado = await trackingService.salvarLocalizacao({
            motorista_id,
            rota_id,
            latitude,
            longitude,
            velocidade,
            direcao,
            timestamp: new Date()
        });

        ctx.status = resultado.sucesso ? 200 : 400;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao salvar localização:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * GET /api/tracking/location/current
 * Obtém localização atual do motorista
 */
router.get('/location/current', async (ctx) => {
    try {
        const motorista_id = ctx.user.id;

        const resultado = await trackingService.obterLocalizacaoAtual(motorista_id);

        ctx.status = resultado.sucesso ? 200 : 404;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao obter localização atual:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * GET /api/tracking/location/history
 * Obtém histórico de localizações
 */
router.get('/location/history', async (ctx) => {
    try {
        const motorista_id = ctx.user.id;
        const { data_inicio, data_fim, limite = 100 } = ctx.query;

        const filtros = {
            data_inicio,
            data_fim,
            limite: parseInt(limite)
        };

        const resultado = await trackingService.obterHistoricoLocalizacoes(motorista_id, filtros);

        ctx.status = resultado.sucesso ? 200 : 400;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * POST /api/tracking/trip/start
 * Inicia uma nova viagem
 */
router.post('/trip/start', async (ctx) => {
    try {
        const { rota_id, tipo_viagem = 'ida', criancas_ids = [] } = ctx.request.body;
        const motorista_id = ctx.user.id;

        if (!rota_id) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'ID da rota é obrigatório'
            };
            return;
        }

        const resultado = await trackingService.iniciarViagem({
            motorista_id,
            rota_id,
            tipo_viagem,
            criancas_ids
        });

        ctx.status = resultado.sucesso ? 201 : 400;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao iniciar viagem:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * PUT /api/tracking/trip/:id/finish
 * Finaliza uma viagem
 */
router.put('/trip/:id/finish', async (ctx) => {
    try {
        const viagemId = ctx.params.id;
        const { distancia_total, tempo_total, observacoes } = ctx.request.body;

        const resultado = await trackingService.finalizarViagem(viagemId, {
            distancia_total,
            tempo_total,
            observacoes
        });

        ctx.status = resultado.sucesso ? 200 : 404;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao finalizar viagem:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * GET /api/tracking/trip/:id
 * Obtém dados de uma viagem específica
 */
router.get('/trip/:id', async (ctx) => {
    try {
        const viagemId = ctx.params.id;

        const resultado = await trackingService.obterDadosViagem(viagemId);

        ctx.status = resultado.sucesso ? 200 : 404;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao obter dados da viagem:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * POST /api/tracking/checkin
 * Registra embarque de criança
 */
router.post('/checkin', async (ctx) => {
    try {
        const { viagem_id, crianca_id, latitude, longitude } = ctx.request.body;

        if (!viagem_id || !crianca_id || !latitude || !longitude) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Todos os campos são obrigatórios'
            };
            return;
        }

        const resultado = await trackingService.registrarEmbarque({
            viagem_id,
            crianca_id,
            latitude,
            longitude,
            timestamp: new Date()
        });

        ctx.status = resultado.sucesso ? 201 : 400;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao registrar embarque:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * POST /api/tracking/checkout
 * Registra desembarque de criança
 */
router.post('/checkout', async (ctx) => {
    try {
        const { viagem_id, crianca_id, latitude, longitude } = ctx.request.body;

        if (!viagem_id || !crianca_id || !latitude || !longitude) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Todos os campos são obrigatórios'
            };
            return;
        }

        const resultado = await trackingService.registrarDesembarque({
            viagem_id,
            crianca_id,
            latitude,
            longitude,
            timestamp: new Date()
        });

        ctx.status = resultado.sucesso ? 201 : 400;
        ctx.body = resultado;

    } catch (error) {
        console.error('Erro ao registrar desembarque:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * GET /api/tracking/stats
 * Obtém estatísticas do sistema de rastreamento
 */
router.get('/stats', async (ctx) => {
    try {
        const stats = trackingService.obterEstatisticasCache();

        ctx.body = {
            sucesso: true,
            dados: {
                cache: stats,
                timestamp: new Date(),
                sistema: {
                    versao: '1.0.0',
                    status: 'ativo'
                }
            }
        };

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

/**
 * POST /api/tracking/cache/clean
 * Limpa cache antigo (apenas para administradores)
 */
router.post('/cache/clean', async (ctx) => {
    try {
        // Verificar se é administrador (simplificado)
        if (ctx.user.tipo_cadastro !== 'admin') {
            ctx.status = 403;
            ctx.body = {
                sucesso: false,
                mensagem: 'Acesso negado'
            };
            return;
        }

        trackingService.limparCacheAntigo();

        ctx.body = {
            sucesso: true,
            mensagem: 'Cache limpo com sucesso',
            timestamp: new Date()
        };

    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

module.exports = router;