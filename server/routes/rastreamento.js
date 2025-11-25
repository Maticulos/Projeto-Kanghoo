const KoaRouter = require('koa-router');
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth-utils');
const { sanitizeForLog } = require('../config/security-config');
const { validate, validators } = require('../middleware/validation');
const notificationService = require('../utils/notification-service');
const logger = require('../utils/logger');
const { DEMO_MODE } = require('../config/app-config');

// Integração com sistema de notificações em tempo real
let trackingIntegration = null;

// Função para definir a integração (será chamada pelo servidor principal)
function setTrackingIntegration(integration) {
    trackingIntegration = integration;
    logger.info('[RASTREAMENTO] Integração de notificações em tempo real configurada');
}

const router = new KoaRouter({ prefix: '/api/rastreamento' });

// Rota de teste básica
router.get('/test', async (ctx) => {
    ctx.body = {
        sucesso: true,
        mensagem: 'API de rastreamento funcionando'
    };
});

// Viagem ativa (compatibilidade com UI legada)
router.get('/viagem-ativa', authenticateToken, async (ctx) => {
    try {
        const userId = ctx.user.id;
        // Tenta como motorista
        let res = await db.query(
            `SELECT v.id, v.rota_id, v.tipo_viagem, v.status, v.horario_inicio, v.data_viagem,
                    r.nome_rota,
                    (SELECT json_build_object('latitude', ra.latitude, 'longitude', ra.longitude, 'timestamp', ra.timestamp_localizacao)
                       FROM rastreamento ra
                       WHERE ra.motorista_id = v.motorista_id
                       ORDER BY ra.timestamp_localizacao DESC LIMIT 1) as ultima_posicao
             FROM viagens v
             LEFT JOIN rotas r ON r.id = v.rota_id
             WHERE v.motorista_id = $1 AND v.status IN ('iniciada','em_andamento') AND v.data_viagem = CURRENT_DATE
             ORDER BY v.horario_inicio DESC LIMIT 1`, [userId]
        );

        // Se n�o for motorista, tenta por crian�a vinculada (respons�vel)
        if (res.rows.length === 0) {
            res = await db.query(
                `SELECT v.id, v.rota_id, v.tipo_viagem, v.status, v.horario_inicio, v.data_viagem,
                        r.nome_rota
                 FROM viagens v
                 JOIN criancas_viagens cv ON cv.viagem_id = v.id
                 JOIN criancas c ON c.id = cv.crianca_id
                 LEFT JOIN rotas r ON r.id = v.rota_id
                 WHERE c.responsavel_id = $1 AND v.status IN ('iniciada','em_andamento') AND v.data_viagem = CURRENT_DATE
                 ORDER BY v.horario_inicio DESC LIMIT 1`, [userId]
            );
        }

        if (res.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { sucesso: false, mensagem: 'Nenhuma viagem ativa' };
            return;
        }
        ctx.body = { sucesso: true, viagem: res.rows[0] };
    } catch (e) {
        logger.error('Erro /viagem-ativa:', e);
        ctx.status = 500;
        ctx.body = { sucesso: false, mensagem: 'Erro interno' };
    }
});

// Estat�sticas simples (compatibilidade com UI legada)
router.get('/estatisticas', authenticateToken, async (ctx) => {
    try {
        const userId = ctx.user.id;
        const totalViagensHoje = await db.query(`SELECT COUNT(*)::int AS c FROM viagens WHERE data_viagem=CURRENT_DATE AND motorista_id=$1`, [userId]);
        const totalCriancas = await db.query(`SELECT COUNT(*)::int AS c FROM criancas WHERE motorista_id=$1 AND ativo=true`, [userId]);
        ctx.body = {
            sucesso: true,
            dados: {
                viagens_hoje: totalViagensHoje.rows[0]?.c || 0,
                criancas_ativas: totalCriancas.rows[0]?.c || 0,
                atualizacao: new Date().toISOString()
            }
        };
    } catch (e) {
        logger.error('Erro /estatisticas:', e);
        ctx.status = 500;
        ctx.body = { sucesso: false, mensagem: 'Erro interno' };
    }
});

// Rota para iniciar uma viagem
const schemaIniciarViagem = {
    rota_id: { required: true, validator: validators.isPositiveNumber },
    tipo_viagem: { required: true, enum: ['ida','volta'] },
    criancas_ids: { required: false }
};
router.post('/viagens/iniciar', authenticateToken, requireRole('motorista_escolar'), validate(schemaIniciarViagem), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { rota_id, tipo_viagem, criancas_ids } = ctx.validatedData;
        // Verificar se a rota pertence ao motorista
        const rotaExistente = await db.query(
            'SELECT id FROM rotas WHERE id = $1 AND motorista_id = $2',
            [rota_id, motoristaId]
        );

        if (rotaExistente.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Rota não encontrada'
            };
            return;
        }

        // Verificar se já existe uma viagem ativa
        const viagemAtiva = await db.query(
            'SELECT id FROM viagens WHERE motorista_id = $1 AND status IN (\'iniciada\', \'em_andamento\') AND data_viagem = CURRENT_DATE',
            [motoristaId]
        );

        if (viagemAtiva.rows.length > 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Já existe uma viagem ativa'
            };
            return;
        }

        // Criar a viagem
        const viagem = await db.query(`
            INSERT INTO viagens (motorista_id, rota_id, data_viagem, horario_inicio, tipo_viagem, status)
            VALUES ($1, $2, CURRENT_DATE, NOW(), $3, 'iniciada')
            RETURNING id, data_viagem, horario_inicio
        `, [motoristaId, rota_id, tipo_viagem]);

        const viagemId = viagem.rows[0].id;

        // Adicionar crianças à viagem se fornecidas
        if (criancas_ids && Array.isArray(criancas_ids) && criancas_ids.length > 0) {
            for (const criancaId of criancas_ids) {
                await db.query(
                    'INSERT INTO criancas_viagens (viagem_id, crianca_id) VALUES ($1, $2)',
                    [viagemId, criancaId]
                );
            }
        }

        logger.info(JSON.stringify(sanitizeForLog({
            acao: 'iniciar_viagem',
            motorista_id: motoristaId,
            viagem_id: viagemId,
            rota_id: rota_id,
            tipo_viagem: tipo_viagem
        })));

        ctx.status = 201;
        ctx.body = {
            sucesso: true,
            mensagem: 'Viagem iniciada com sucesso',
            viagem: viagem.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao iniciar viagem:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para finalizar uma viagem
router.put('/viagens/:id/finalizar', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const viagemId = ctx.params.id;
        // Verificar se a viagem pertence ao motorista e está ativa
        const viagemExistente = await db.query(
            'SELECT id FROM viagens WHERE id = $1 AND motorista_id = $2 AND status IN (\'iniciada\', \'em_andamento\')',
            [viagemId, motoristaId]
        );

        if (viagemExistente.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
<<<<<<< HEAD
                mensagem: 'Viagem não encontrada ou já concluída'
=======
                mensagem: 'Viagem não encontrada ou já finalizada'
>>>>>>> 7e3033439b6ddb76a0413d080f32ee1cb52d2502
            };
            return;
        }

        // Finalizar a viagem
        const resultado = await db.query(`
            UPDATE viagens 
            SET status = 'concluida', horario_fim = NOW()
            WHERE id = $1
            RETURNING id, horario_inicio, horario_fim
        `, [viagemId]);

        logger.info(JSON.stringify(sanitizeForLog({
            acao: 'finalizar_viagem',
            motorista_id: motoristaId,
            viagem_id: viagemId
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'Viagem concluída com sucesso',
            viagem: resultado.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao finalizar viagem:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Enviar localização atual
router.post('/localizacao', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const { 
            latitude, 
            longitude, 
            velocidade = 0, 
            combustivel_nivel = 0,
            odometro = 0,
            rpm = 0,
            temperatura = 0,
            timestamp 
        } = ctx.request.body;
        // Simular dados da viagem ativa
        const viagemAtiva = {
            id: 'viagem_123',
            motorista_id: ctx.user.id,
            veiculo_id: 'veiculo_456',
            rota_id: 'rota_789',
            inicio: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
            criancas: [
                { 
                    id: 1, 
                    nome: 'Ana Silva', 
                    embarcada: true,
                    responsavel: {
                        nome: 'Maria Silva',
                        telefone: '+5511999999999',
                        email: 'maria.silva@email.com',
                        preferencias_notificacao: {
                            tipo: 'ambos',
                            frequencia: '15min'
                        },
                        ultima_notificacao: new Date(Date.now() - 16 * 60 * 1000) // 16 min atrás
                    }
                },
                { 
                    id: 2, 
                    nome: 'João Santos', 
                    embarcada: true,
                    responsavel: {
                        nome: 'Carlos Santos',
                        telefone: '+5511888888888',
                        email: 'carlos.santos@email.com',
                        preferencias_notificacao: {
                            tipo: 'whatsapp',
                            frequencia: '5min'
                        },
                        ultima_notificacao: new Date(Date.now() - 6 * 60 * 1000) // 6 min atrás
                    }
                },
                { 
                    id: 3, 
                    nome: 'Maria Oliveira', 
                    embarcada: false,
                    responsavel: {
                        nome: 'José Oliveira',
                        telefone: '+5511777777777',
                        email: 'jose.oliveira@email.com',
                        preferencias_notificacao: {
                            tipo: 'email',
                            frequencia: 'chegada_saida'
                        }
                    }
                }
            ]
        };

        // Calcular dados de rastreamento
        const dadosRastreamento = {
            viagem_id: viagemAtiva.id,
            timestamp: timestamp || new Date(),
            localizacao: { latitude, longitude },
            velocidade,
            combustivel: {
                nivel_atual: combustivel_nivel,
                consumo_estimado: velocidade > 0 ? (velocidade * 0.1) : 0 // Simulação simples
            },
            distancia: {
                percorrida: odometro,
                desde_ultimo_ponto: velocidade > 0 ? (velocidade / 60) : 0 // km por minuto
            },
            veiculo: {
                rpm,
                temperatura,
                status: rpm > 0 ? 'em_movimento' : 'parado'
            },
            tempo_viagem: Math.floor((new Date() - viagemAtiva.inicio) / 1000 / 60) // minutos
        };

        // Processar notificações para crianças embarcadas
        const notificacoesEnviadas = [];
        for (const crianca of viagemAtiva.criancas) {
            if (crianca.embarcada && crianca.responsavel.preferencias_notificacao.frequencia !== 'chegada_saida') {
                const deveNotificar = notificationService.deveEnviarNotificacao(
                    crianca.responsavel.ultima_notificacao,
                    crianca.responsavel.preferencias_notificacao.frequencia
                );

                if (deveNotificar) {
                    const resultados = await notificationService.notificarLocalizacao(
                        crianca,
                        crianca.responsavel,
                        { latitude, longitude },
                        dadosRastreamento
                    );
                    
                    notificacoesEnviadas.push({
                        crianca: crianca.nome,
                        responsavel: crianca.responsavel.nome,
                        resultados
                    });

                    // Atualizar timestamp da última notificação
                    crianca.responsavel.ultima_notificacao = new Date();
                }
            }
        }

        // Integrar com sistema de notificações em tempo real
        if (trackingIntegration) {
            try {
                await trackingIntegration.processarLocalizacao({
                    viagem_id: viagemAtiva.id,
                    latitude,
                    longitude,
                    velocidade,
                    timestamp: new Date(),
                    dados_completos: dadosRastreamento
                });
            } catch (error) {
                logger.error('[RASTREAMENTO] Erro na integração de notificações:', error);
            }
        }

        // Simular armazenamento dos dados
        logger.debug(`[RASTREAMENTO] Dados coletados:`, {
            viagem: viagemAtiva.id,
            localizacao: `${latitude}, ${longitude}`,
            velocidade: `${velocidade} km/h`,
            combustivel: `${combustivel_nivel}%`,
            distancia: `${dadosRastreamento.distancia.percorrida} km`,
            tempo: `${dadosRastreamento.tempo_viagem} min`,
            notificacoes_enviadas: notificacoesEnviadas.length
        });

        ctx.body = {
            sucesso: true,
            mensagem: 'Localização registrada com sucesso',
            dados: {
                rastreamento: dadosRastreamento,
                viagem: viagemAtiva,
                notificacoes: notificacoesEnviadas,
                estatisticas: {
                    velocidade_media: 45, // km/h
                    combustivel_consumido: 2.5, // litros
                    tempo_estimado_chegada: 15 // minutos
                }
            }
        };

    } catch (error) {
        logger.error('[ERRO] Rastreamento:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            erro: 'Erro interno do servidor'
        };
    }
});

// Rota para obter viagem ativa do motorista
router.get('/viagem-ativa', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;

        // Tentar buscar viagem ativa real
        try {
            const viagemAtiva = await db.query(`
                SELECT 
                    v.id,
                    v.data_viagem,
                    v.horario_inicio,
                    v.tipo_viagem,
                    v.status,
                    r.nome_rota as nome_rota,
                    r.descricao as descricao_rota,
                    COUNT(cv.crianca_id) as total_criancas
                FROM viagens v
                JOIN rotas r ON v.rota_id = r.id
                LEFT JOIN criancas_viagens cv ON v.id = cv.viagem_id
                WHERE v.motorista_id = $1 
                AND v.status IN ('iniciada', 'em_andamento')
                AND v.data_viagem = CURRENT_DATE
                GROUP BY v.id, r.nome_rota, r.descricao
            `, [motoristaId]);

            if (viagemAtiva.rows.length > 0) {
                ctx.body = {
                    sucesso: true,
                    viagem_ativa: viagemAtiva.rows[0]
                };
                return;
            }
        } catch (dbError) {
            logger.debug('Tabelas de viagem não encontradas, usando dados simulados');
        }

        // Se nao ha viagem ativa ou erro na query, respeitar flag de demo
        if (DEMO_MODE) {
            ctx.body = {
                sucesso: true,
                mensagem: 'Nenhuma viagem ativa no momento',
                viagem_ativa: null,
                dados_simulados: {
                    id: 1,
                    data_viagem: new Date().toISOString().split('T')[0],
                    horario_inicio: '07:00',
                    tipo_viagem: 'ida',
                    status: 'aguardando',
                    nome_rota: 'Rota Centro - Escola Municipal',
                    descricao_rota: 'Transporte escolar da regiao central',
                    total_criancas: 15,
                    motorista_id: motoristaId
                }
            };
        } else {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Nenhuma viagem ativa no momento'
            };
        }
    } catch (error) {
        logger.error('Erro ao buscar viagem ativa:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para listar histórico de viagens do motorista
router.get('/historico', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { limite = 20, pagina = 1 } = ctx.query;

        const offset = (pagina - 1) * limite;

        // Tentar buscar histórico real
        try {
            const historico = await db.query(`
                SELECT 
                    v.id,
                    v.data_viagem,
                    v.horario_inicio,
                    v.horario_fim,
                    v.tipo_viagem,
                    v.status,
                    r.nome_rota as nome_rota,
                    COUNT(cv.crianca_id) as total_criancas
                FROM viagens v
                JOIN rotas r ON v.rota_id = r.id
                LEFT JOIN criancas_viagens cv ON v.id = cv.viagem_id
                WHERE v.motorista_id = $1
                GROUP BY v.id, r.nome_rota
                ORDER BY v.data_viagem DESC, v.horario_inicio DESC
                LIMIT $2 OFFSET $3
            `, [motoristaId, limite, offset]);

            // Contar total de registros
            const total = await db.query(
                'SELECT COUNT(*) FROM viagens WHERE motorista_id = $1',
                [motoristaId]
            );

            if (historico.rows.length > 0) {
                ctx.body = {
                    sucesso: true,
                    historico: historico.rows,
                    paginacao: {
                        pagina_atual: parseInt(pagina),
                        total_registros: parseInt(total.rows[0].count),
                        total_paginas: Math.ceil(total.rows[0].count / limite),
                        registros_por_pagina: parseInt(limite)
                    }
                };
                return;
            }
        } catch (dbError) {
            logger.debug('Tabelas de histórico não encontradas, usando dados simulados');
        }

        if (!DEMO_MODE) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Nenhum historico de viagens encontrado'
            };
            return;
        }

        // Dados simulados para demonstracao
        const historicoSimulado = [
            {
                id: 1,
                data_viagem: '2024-01-15',
                horario_inicio: '07:00',
                horario_fim: '08:30',
                tipo_viagem: 'ida',
                status: 'concluida',
                nome_rota: 'Rota Centro - Escola Municipal',
                total_criancas: 15
            },
            {
                id: 2,
                data_viagem: '2024-01-15',
                horario_inicio: '17:00',
                horario_fim: '18:30',
                tipo_viagem: 'volta',
                status: 'concluida',
                nome_rota: 'Rota Centro - Escola Municipal',
                total_criancas: 15
            },
            {
                id: 3,
                data_viagem: '2024-01-14',
                horario_inicio: '07:00',
                horario_fim: '08:30',
                tipo_viagem: 'ida',
                status: 'concluida',
                nome_rota: 'Rota Centro - Escola Municipal',
                total_criancas: 12
            }
        ];

        ctx.body = {
            sucesso: true,
            historico: historicoSimulado,
            dados_simulados: true,
            paginacao: {
                pagina_atual: parseInt(pagina),
                total_registros: historicoSimulado.length,
                total_paginas: 1,
                registros_por_pagina: parseInt(limite)
            }
        };
    } catch (error) {
        logger.error('Erro ao buscar histórico de viagens:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para obter detalhes de uma viagem específica
router.get('/viagens/:id', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const viagemId = ctx.params.id;
        // Buscar detalhes da viagem
        const viagem = await db.query(`
            SELECT 
                v.id,
                v.data_viagem,
                v.horario_inicio,
                v.horario_fim,
                v.tipo_viagem,
                v.status,
                r.nome_rota as nome_rota,
                r.descricao as descricao_rota
            FROM viagens v
            JOIN rotas r ON v.rota_id = r.id
            WHERE v.id = $1 AND v.motorista_id = $2
        `, [viagemId, motoristaId]);

        if (viagem.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Viagem não encontrada'
            };
            return;
        }

        // Buscar crianças da viagem
        const criancas = await db.query(`
            SELECT 
                c.id,
                c.nome_completo,
                c.escola
            FROM criancas c
            JOIN criancas_viagens cv ON c.id = cv.crianca_id
            WHERE cv.viagem_id = $1
        `, [viagemId]);

        // Buscar localizações da viagem
        const localizacoes = await db.query(`
            SELECT 
                latitude,
                longitude,
                velocidade,
                precisao,
                timestamp
            FROM localizacoes
            WHERE viagem_id = $1
            ORDER BY timestamp
        `, [viagemId]);

        ctx.body = {
            sucesso: true,
            viagem: {
                ...viagem.rows[0],
                criancas: criancas.rows,
                localizacoes: localizacoes.rows
            }
        };
    } catch (error) {
        logger.error('Erro ao buscar detalhes da viagem:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para registrar embarque de criança
router.post('/embarque', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { viagem_id, crianca_id } = ctx.request.body;
        // Verificar se a viagem pertence ao motorista e está ativa
        const viagemExistente = await db.query(
            'SELECT id FROM viagens WHERE id = $1 AND motorista_id = $2 AND status IN (\'iniciada\', \'em_andamento\')',
            [viagem_id, motoristaId]
        );

        if (viagemExistente.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Viagem não encontrada ou não está ativa'
            };
            return;
        }

        // Registrar embarque
        await db.query(
            'UPDATE criancas_viagens SET embarcada = true, horario_embarque = NOW() WHERE viagem_id = $1 AND crianca_id = $2',
            [viagem_id, crianca_id]
        );

        // Integrar com sistema de notificações em tempo real
        if (trackingIntegration) {
            try {
                await trackingIntegration.processarEmbarque({
                    viagem_id,
                    crianca_id,
                    timestamp: new Date()
                });
            } catch (error) {
                logger.error('[RASTREAMENTO] Erro na integração de embarque:', error);
            }
        }

        logger.info(JSON.stringify(sanitizeForLog({
            acao: 'embarque_crianca',
            motorista_id: motoristaId,
            viagem_id,
            crianca_id
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'Embarque registrado com sucesso'
        };
    } catch (error) {
        logger.error('Erro ao registrar embarque:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para registrar desembarque de criança
router.post('/desembarque', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { viagem_id, crianca_id } = ctx.request.body;
        // Verificar se a viagem pertence ao motorista e está ativa
        const viagemExistente = await db.query(
            'SELECT id FROM viagens WHERE id = $1 AND motorista_id = $2 AND status IN (\'iniciada\', \'em_andamento\')',
            [viagem_id, motoristaId]
        );

        if (viagemExistente.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Viagem não encontrada ou não está ativa'
            };
            return;
        }

        // Registrar desembarque
        await db.query(
            'UPDATE criancas_viagens SET embarcada = false, horario_desembarque = NOW() WHERE viagem_id = $1 AND crianca_id = $2',
            [viagem_id, crianca_id]
        );

        // Integrar com sistema de notificações em tempo real
        if (trackingIntegration) {
            try {
                await trackingIntegration.processarDesembarque({
                    viagem_id,
                    crianca_id,
                    timestamp: new Date()
                });
            } catch (error) {
                logger.error('[RASTREAMENTO] Erro na integração de desembarque:', error);
            }
        }

        logger.debug(JSON.stringify(sanitizeForLog({
            acao: 'desembarque_crianca',
            motorista_id: motoristaId,
            viagem_id,
            crianca_id
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'Desembarque registrado com sucesso'
        };
    } catch (error) {
        logger.error('Erro ao registrar desembarque:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

module.exports = router;
module.exports.setTrackingIntegration = setTrackingIntegration;


