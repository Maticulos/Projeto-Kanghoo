const KoaRouter = require('koa-router');
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth-utils');
const { validateInput, sanitizeForLog } = require('../config/security-config');
const logger = require('../utils/logger');

const router = new KoaRouter({ prefix: '/api/responsavel' });

// Rota de teste básica
router.get('/test', async (ctx) => {
    ctx.body = {
        sucesso: true,
        mensagem: 'API do responsável funcionando'
    };
});

// Rota para obter dados da criança do responsável (primeira criança encontrada)
router.get('/crianca', authenticateToken, requireRole('responsavel'), async (ctx) => {
    try {
        const responsavelEmail = ctx.user.email;

        // Dados de teste para desenvolvimento
        if (ctx.user.id === 999 && process.env.NODE_ENV !== 'production') {
            ctx.body = {
                success: true,
                data: {
                    id: 1,
                    nome_completo: 'João Silva Teste',
                    data_nascimento: '2015-05-15',
                    endereco_residencial: 'Rua das Flores, 123 - Centro',
                    escola: 'Escola Municipal Teste',
                    endereco_escola: 'Av. Educação, 456 - Centro',
                    rota_id: 1,
                    nome_rota: 'Rota Centro',
                    descricao_rota: 'Rota que atende o centro da cidade',
                    ativo: true,
                    criado_em: new Date().toISOString(),
                    nome_motorista: 'Carlos Motorista',
                    telefone_motorista: '(11) 99999-9999',
                    email_motorista: 'motorista@teste.com'
                }
            };
            return;
        }
        
        const crianca = await db.query(`
            SELECT 
                c.id,
                c.nome_completo,
                c.data_nascimento,
                c.endereco_residencial,
                c.escola,
                c.endereco_escola,
                c.rota_id,
                r.nome_rota,
                r.descricao as descricao_rota,
                c.ativo,
                c.criado_em,
                u.nome_completo as nome_motorista,
                u.celular as telefone_motorista,
                u.email as email_motorista
            FROM criancas c
            LEFT JOIN rotas r ON c.rota_id = r.id
            LEFT JOIN usuarios u ON c.motorista_id = u.id
            WHERE c.email_responsavel = $1 AND c.ativo = true
            ORDER BY c.criado_em DESC
            LIMIT 1
        `, [responsavelEmail]);

        if (crianca.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: 'Nenhuma criança encontrada para este responsável'
            };
            return;
        }

        logger.debug(JSON.stringify(sanitizeForLog({
            acao: 'buscar_crianca_responsavel',
            responsavel_email: responsavelEmail,
            crianca_id: crianca.rows[0].id
        })));

        ctx.body = {
            success: true,
            data: crianca.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao buscar dados da criança:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para listar todas as crianças do responsável
router.get('/criancas', async (ctx) => {
    try {
        ctx.body = {
            sucesso: true,
            criancas: [{ id: 1, nome_completo: 'Teste' }]
        };
    } catch (error) {
        logger.error('Erro ao listar crianças do responsável:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para visualizar detalhes de uma criança específica
router.get('/criancas/:id', authenticateToken, requireRole('responsavel'), async (ctx) => {
    try {
        const responsavelEmail = ctx.user.email;
        const criancaId = ctx.params.id;
        
        // Validar ID da criança
        console.log('Iniciando validação do ID...');
        const validationResult = validateInput(criancaId, 'number');
        console.log('Resultado da validação:', JSON.stringify(validationResult, null, 2));
        
        if (!validationResult.valid) {
            console.log('Validação falhou, retornando erro 400');
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'ID da criança inválido',
                detalhes: validationResult.error
            };
            return;
        }
        
        console.log('Validação passou, continuando...');

        const crianca = await db.query(`
            SELECT 
                c.id,
                c.nome_completo,
                c.data_nascimento,
                c.endereco_residencial,
                c.escola,
                c.endereco_escola,
                c.rota_id,
                r.nome_rota as nome_rota,
                r.descricao as descricao_rota,
                c.ativo,
                c.criado_em,
                u.nome_completo as nome_motorista,
                u.celular as telefone_motorista,
                u.email as email_motorista
            FROM criancas c
            LEFT JOIN rotas r ON c.rota_id = r.id
            LEFT JOIN usuarios u ON c.motorista_id = u.id
            WHERE c.id = $1 AND c.email_responsavel = $2
        `, [criancaId, responsavelEmail]);

        if (crianca.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Criança não encontrada'
            };
            return;
        }

        ctx.body = {
            sucesso: true,
            crianca: crianca.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao buscar detalhes da criança:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para atualizar informações de uma criança
router.put('/criancas/:id', authenticateToken, requireRole('responsavel'), async (ctx) => {
    try {
        
        const criancaId = ctx.params.id;
        const responsavelEmail = ctx.user.email;
        const { endereco_residencial, escola, endereco_escola } = ctx.request.body;

        // Validação do ID
        const validacaoId = validateInput(criancaId, { type: 'number' });
        if (!validacaoId.valid) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'ID da criança inválido'
            };
            return;
        }

        // Validação dos dados de entrada
        const validacoes = [
            validateInput(endereco_residencial, { type: 'text', minLength: 5, maxLength: 200 }),
            validateInput(escola, { type: 'text', minLength: 2, maxLength: 100 }),
            validateInput(endereco_escola, { type: 'text', minLength: 5, maxLength: 200 })
        ];

        for (const validacao of validacoes) {
            if (!validacao.valid) {
                ctx.status = 400;
                ctx.body = {
                    sucesso: false,
                    mensagem: validacao.error || 'Erro de validação'
                };
                return;
            }
        }

        // Verificar se a criança pertence ao responsável
        const criancaExistente = await db.query(
            'SELECT id FROM criancas WHERE id = $1 AND email_responsavel = $2',
            [criancaId, responsavelEmail]
        );

        if (criancaExistente.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Criança não encontrada'
            };
            return;
        }

        // Atualizar a criança
        const resultado = await db.query(`
            UPDATE criancas 
            SET endereco_residencial = $1, escola = $2, endereco_escola = $3, atualizado_em = NOW()
            WHERE id = $4 AND email_responsavel = $5
            RETURNING id, nome_completo
        `, [endereco_residencial, escola, endereco_escola, criancaId, responsavelEmail]);

        logger.info(JSON.stringify(sanitizeForLog({
            acao: 'atualizar_crianca_responsavel',
            responsavel_email: responsavelEmail,
            crianca_id: criancaId,
            nome_crianca: resultado.rows[0].nome_completo
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'Informações da criança atualizadas com sucesso',
            crianca: resultado.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao atualizar criança:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para obter localização atual da criança (se em viagem)
router.get('/criancas/:id/localizacao', authenticateToken, requireRole('responsavel'), async (ctx) => {
    try {
        const responsavelEmail = ctx.user.email;
        const criancaId = ctx.params.id;

        // Validação do ID
        const validacao = validateInput(criancaId, { type: 'number' });
        if (!validacao.valid) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'ID da criança inválido'
            };
            return;
        }

        // Verificar se a criança pertence ao responsável
        const criancaExistente = await db.query(
            'SELECT id FROM criancas WHERE id = $1 AND email_responsavel = $2',
            [criancaId, responsavelEmail]
        );

        if (criancaExistente.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Criança não encontrada'
            };
            return;
        }

        // Buscar viagem ativa da criança
        const viagemAtiva = await db.query(`
            SELECT 
                v.id,
                v.data_viagem,
                v.horario_inicio,
                v.tipo_viagem,
                v.status,
                r.nome_rota as nome_rota,
                u.nome_completo as nome_motorista,
                l.latitude,
                l.longitude,
                l.timestamp as ultima_localizacao
            FROM viagens v
            JOIN rotas r ON v.rota_id = r.id
            JOIN usuarios u ON v.motorista_id = u.id
            JOIN criancas_viagens cv ON v.id = cv.viagem_id
            LEFT JOIN localizacoes l ON v.id = l.viagem_id
            WHERE cv.crianca_id = $1 
            AND v.status IN ('em_andamento', 'iniciada')
            AND v.data_viagem = CURRENT_DATE
            ORDER BY l.timestamp DESC
            LIMIT 1
        `, [criancaId]);

        if (viagemAtiva.rows.length === 0) {
            ctx.body = {
                sucesso: true,
                mensagem: 'Criança não está em viagem no momento',
                em_viagem: false
            };
            return;
        }

        ctx.body = {
            sucesso: true,
            em_viagem: true,
            viagem: viagemAtiva.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao buscar localização da criança:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

module.exports = router;