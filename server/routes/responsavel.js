const KoaRouter = require('koa-router');
const { authenticateToken, requireRole } = require('../middleware/auth-utils');
const { validators, validate } = require('../middleware/validation');
const { getFirstChild, getChildById, updateChild } = require('../controllers/responsavel.controller');

const router = new KoaRouter({ prefix: '/api/responsavel' });

// Rota de teste básica
router.get('/test', async (ctx) => {
    ctx.body = {
        sucesso: true,
        mensagem: 'API do responsável funcionando'
    };
});

// Rota para obter dados da criança do responsável (primeira criança encontrada)
router.get('/crianca', authenticateToken, requireRole('responsavel'), getFirstChild);

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
router.get('/criancas/:id', authenticateToken, requireRole('responsavel'), getChildById);

// Rota para atualizar informações de uma criança
const updateSchema = {
    endereco_residencial: { required: true, minLength: 5, maxLength: 200 },
    escola: { required: true, minLength: 2, maxLength: 100 },
    endereco_escola: { required: true, minLength: 5, maxLength: 200 }
};
router.put('/criancas/:id', authenticateToken, requireRole('responsavel'), validate(updateSchema), updateChild);

// Rota para obter localização atual da criança (se em viagem)
router.get('/criancas/:id/localizacao', authenticateToken, requireRole('responsavel'), async (ctx) => {
    try {
        const responsavelId = ctx.user.id;
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
            'SELECT id FROM criancas WHERE id = $1 AND responsavel_id = $2',
            [criancaId, responsavelId]
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
