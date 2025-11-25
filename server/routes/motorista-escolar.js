const KoaRouter = require('koa-router');
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth-utils');
const { validateInput, sanitizeForLog, securityConfig } = require('../config/security-config');
const { validate, validators } = require('../middleware/validation');
const { createSecureUpload, validateUploadedFiles } = require('../middleware/upload-security');
const { USER_TYPES, PAGINATION } = require('../config/constants');
const { upsertStatus, getStatus } = require('../repositories/usuario-status.repository');
const { success, error, validationError, paginated, send } = require('../utils/api-response');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('../utils/logger');

const router = new KoaRouter({ prefix: '/api/motorista-escolar' });

// ConfiguraÃ§Ã£o segura do upload para CSV
const csvUpload = createSecureUpload('csv', { maxFiles: 1 });
const documentUpload = createSecureUpload('documents', { maxFiles: 5 });
const imageUpload = createSecureUpload('images', { maxFiles: 3 });
const allFilesUpload = createSecureUpload('all', { maxFiles: 10 });
const spreadsheetUpload = createSecureUpload('spreadsheets', { maxFiles: 1 });

const isDemoMode = () => process.env.DEMO_MODE === 'true';
const saltRounds = securityConfig?.bcrypt?.saltRounds || 10;

const gerarSenhaTemporaria = () => {
    const random = crypto.randomBytes(6).toString('hex');
    return `Resp${random}!`;
};

const parsePaginationQuery = (query = {}) => {
    const page = Math.max(parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE, 1);
    const limitRaw = parseInt(query.limit, 10);
    const limit = Math.min(Math.max(limitRaw || PAGINATION.DEFAULT_LIMIT, 1), PAGINATION.MAX_LIMIT);
    return { page, limit, offset: (page - 1) * limit };
};

const rotaPertenceAoMotorista = async (rotaId, motoristaId) => {
    if (!rotaId) return false;
    const res = await db.query('SELECT id FROM rotas WHERE id = $1 AND motorista_id = $2 LIMIT 1', [rotaId, motoristaId]);
    return res.rows.length > 0;
};

const responsavelVinculadoAoMotorista = async (responsavelId, motoristaId) => {
    const res = await db.query(
        'SELECT 1 FROM criancas WHERE responsavel_id = $1 AND motorista_id = $2 LIMIT 1',
        [responsavelId, motoristaId]
    );
    return res.rowCount > 0;
};

const getPlanoAtivo = async (motoristaId) => {
    const result = await db.query(
        `SELECT id, tipo_plano, ativo, data_inicio, data_fim, criado_em
         FROM planos_assinatura
         WHERE usuario_id = $1
         ORDER BY criado_em DESC
         LIMIT 1`,
        [motoristaId]
    );
    const plano = result.rows[0];
    if (!plano) return { plano: null, ativo: false };
    const expirou = plano.data_fim && new Date(plano.data_fim) < new Date();
    const ativo = !!plano.ativo && !expirou;
    return { plano, ativo };
};

const sincronizarStatusMotorista = async (motoristaId) => {
    if (isDemoMode()) {
        return upsertStatus({
            usuarioId: motoristaId,
            tipoUsuario: USER_TYPES.MOTORISTA_ESCOLAR,
            ativo: true,
            origem: 'plano'
        });
    }
    const { plano, ativo } = await getPlanoAtivo(motoristaId);
    const status = await upsertStatus({
        usuarioId: motoristaId,
        tipoUsuario: USER_TYPES.MOTORISTA_ESCOLAR,
        ativo,
        origem: 'plano'
    });
    return { status, plano, ativo };
};

const registrarStatusResponsavel = async (responsavelId, ativo, atualizadoPor, origem = 'motorista', motivo = null) =>
    upsertStatus({
        usuarioId: responsavelId,
        tipoUsuario: USER_TYPES.RESPONSAVEL,
        ativo,
        origem,
        motivo,
        atualizadoPor: atualizadoPor || null
    });

const encontrarOuCriarResponsavel = async ({ nome, email, celular, endereco }, motoristaId) => {
    const existente = await db.query(
        'SELECT id, nome_completo FROM usuarios WHERE LOWER(email)=LOWER($1) AND (tipo_usuario = $2 OR tipo_cadastro = $2) LIMIT 1',
        [email, USER_TYPES.RESPONSAVEL]
    );

    if (existente.rows.length > 0) {
        await registrarStatusResponsavel(existente.rows[0].id, true, motoristaId, 'motorista');
        return { id: existente.rows[0].id, criado: false, senhaTemporaria: null };
    }

    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await bcrypt.hash(senhaTemporaria, saltRounds);
    const novo = await db.query(
        `INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id`,
        [nome, email, senhaHash, celular || null, USER_TYPES.RESPONSAVEL, USER_TYPES.RESPONSAVEL, endereco || null]
    );

    await registrarStatusResponsavel(novo.rows[0].id, true, motoristaId, 'motorista');
    return { id: novo.rows[0].id, criado: true, senhaTemporaria };
};


// Aplicar middlewares de autenticaÃ§Ã£o e autorizaÃ§Ã£o em todas as rotas
router.use(authenticateToken);
router.use(requireRole('motorista_escolar'));

const exigirPlanoAtivo = async (ctx) => {
    const motoristaId = ctx.user.id;
    if (isDemoMode()) return { ativo: true };
    const { ativo } = await sincronizarStatusMotorista(motoristaId);
    if (!ativo) {
        ctx.status = 403;
        send(ctx, error('Plano inativo. Ative um plano para gerenciar responsáveis.', 403));
        return { ativo: false };
    }
    return { ativo: true };
};

// Listagem de responsaveis com busca, filtro e paginacao
router.get('/responsaveis', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { q = '', ativo, sort = 'nome' } = ctx.query || {};
        const { page, limit, offset } = parsePaginationQuery(ctx.query);

        if (isDemoMode()) {
            const demoData = [
                { id: 1, nome_completo: 'Ana Costa', email: 'ana.responsavel@demo.com', celular: '(11) 98888-0001', ativo: true, total_criancas: 1 },
                { id: 2, nome_completo: 'Bruno Silva', email: 'bruno.silva@demo.com', celular: '(11) 98888-0002', ativo: true, total_criancas: 2 }
            ];
            return send(
                ctx,
                paginated(demoData, {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: demoData.length,
                    itemsPerPage: demoData.length,
                    hasNextPage: false,
                    hasPreviousPage: false
                }, 'DEMO: lista simulada de responsaveis')
            );
        }

        const condicoes = ['c.motorista_id = $1'];
        const params = [motoristaId];

        if (q) {
            params.push(`%${q.toLowerCase()}%`);
            condicoes.push('(LOWER(u.nome_completo) LIKE $' + params.length + ' OR LOWER(u.email) LIKE $' + params.length + ' OR u.celular ILIKE $' + params.length + ')');
        }

        if (ativo === 'true' || ativo === 'false') {
            params.push(ativo === 'true');
            condicoes.push('COALESCE(us.ativo, true) = $' + params.length);
        }

        const allowedSort = {
            nome: 'u.nome_completo ASC',
            criado_em: 'min_c ASC',
            total_criancas: 'total_criancas DESC'
        };
        const orderBy = allowedSort[sort] || allowedSort.nome;

        const where = condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : '';

        const totalRes = await db.query(
            `SELECT COUNT(DISTINCT u.id) AS total
             FROM usuarios u
             JOIN criancas c ON c.responsavel_id = u.id
             LEFT JOIN usuarios_status us ON us.usuario_id = u.id
             ${where}`,
            params
        );
        const totalItems = parseInt(totalRes.rows[0].total, 10) || 0;

        params.push(limit, offset);
        const dataRes = await db.query(
            `SELECT 
                u.id,
                u.nome_completo,
                u.email,
                u.celular,
                COALESCE(us.ativo, true) AS ativo,
                COALESCE(us.origem, 'manual') AS origem_status,
                COUNT(c.id) AS total_criancas,
                MIN(c.criado_em) AS min_c,
                MAX(c.atualizado_em) AS ultimo_update
             FROM usuarios u
             JOIN criancas c ON c.responsavel_id = u.id
             LEFT JOIN usuarios_status us ON us.usuario_id = u.id
             ${where}
             GROUP BY u.id, u.nome_completo, u.email, u.celular, us.ativo, us.origem
             ORDER BY ${orderBy}
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
        return send(ctx, paginated(dataRes.rows, {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }));
    } catch (err) {
        logger.error('Erro ao listar responsaveis:', err);
        ctx.status = 500;
        return send(ctx, error('Erro interno ao listar responsaveis', 500));
    }
});

// Detalhes de um responsavel
router.get('/responsaveis/:id', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const responsavelId = parseInt(ctx.params.id, 10);
        if (!Number.isFinite(responsavelId)) {
            ctx.status = 400;
            return send(ctx, validationError(['id invalido'], 'Paramentro invalido'));
        }

        if (isDemoMode()) {
            return send(ctx, success({
                id: responsavelId,
                nome_completo: 'Demo Responsavel',
                email: 'demo@responsavel.com',
                celular: '(11) 99999-0000',
                ativo: true,
                criancas: [
                    { id: 1, nome: 'Crianca Demo', escola: 'Escola Demo' }
                ]
            }, 'DEMO: detalhe simulado'));
        }

        const vinculado = await responsavelVinculadoAoMotorista(responsavelId, motoristaId);
        if (!vinculado) {
            ctx.status = 404;
            return send(ctx, error('Responsavel nao encontrado para este motorista', 404));
        }

        const res = await db.query(
            `SELECT 
                u.id,
                u.nome_completo,
                u.email,
                u.celular,
                u.endereco_completo,
                u.data_nascimento,
                COALESCE(us.ativo, true) AS ativo,
                us.origem,
                us.motivo,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', c.id,
                            'nome', c.nome_completo,
                            'escola', c.escola,
                            'ativo', c.ativo
                        )
                    ) FILTER (WHERE c.id IS NOT NULL),
                    '[]'
                ) AS criancas
             FROM usuarios u
             LEFT JOIN criancas c ON c.responsavel_id = u.id AND c.motorista_id = $1
             LEFT JOIN usuarios_status us ON us.usuario_id = u.id
             WHERE u.id = $2
             GROUP BY u.id, us.ativo, us.origem, us.motivo`,
            [motoristaId, responsavelId]
        );

        if (!res.rows.length) {
            ctx.status = 404;
            return send(ctx, error('Responsavel nao encontrado', 404));
        }

        return send(ctx, success(res.rows[0]));
    } catch (err) {
        logger.error('Erro ao buscar responsavel:', err);
        ctx.status = 500;
        return send(ctx, error('Erro interno ao buscar responsavel', 500));
    }
});

// Edicao de responsavel (dados basicos + ativacao)
router.put('/responsaveis/:id', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const responsavelId = parseInt(ctx.params.id, 10);
        const { nome_completo, celular, endereco_completo, ativo } = ctx.request.body || {};

        if (!Number.isFinite(responsavelId)) {
            ctx.status = 400;
            return send(ctx, validationError(['id invalido'], 'Parametro invalido'));
        }

        if (isDemoMode()) {
            return send(ctx, success({ id: responsavelId, nome_completo, celular, endereco_completo, ativo }, 'DEMO: alteracao simulada'));
        }

        const vinculado = await responsavelVinculadoAoMotorista(responsavelId, motoristaId);
        if (!vinculado) {
            ctx.status = 404;
            return send(ctx, error('Responsavel nao encontrado para este motorista', 404));
        }

        if (!nome_completo && !celular && !endereco_completo && typeof ativo === 'undefined') {
            ctx.status = 422;
            return send(ctx, validationError(['Informe pelo menos um campo para atualizar'], 'Dados faltando'));
        }

        const campos = [];
        const params = [];
        if (nome_completo) {
            campos.push('nome_completo');
            params.push(nome_completo);
        }
        if (celular) {
            campos.push('celular');
            params.push(celular);
        }
        if (endereco_completo) {
            campos.push('endereco_completo');
            params.push(endereco_completo);
        }

        if (campos.length) {
            const setSql = campos.map((c, idx) => `${c} = $${idx + 1}`).join(', ');
            params.push(responsavelId);
            await db.query(`UPDATE usuarios SET ${setSql} WHERE id = $${params.length}`, params);
        }

        if (typeof ativo !== 'undefined') {
            await registrarStatusResponsavel(responsavelId, !!ativo, motoristaId, 'motorista');
        }

        return send(ctx, success({ id: responsavelId }, 'Responsavel atualizado com sucesso'));
    } catch (err) {
        logger.error('Erro ao editar responsavel:', err);
        ctx.status = 500;
        return send(ctx, error('Erro interno ao editar responsavel', 500));
    }
});

// Criacao de responsavel via formulario (atrelado a crianca)
router.post('/responsaveis', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const plano = await exigirPlanoAtivo(ctx);
        if (!plano.ativo) return;

        const {
            nome_responsavel,
            email_responsavel,
            telefone_responsavel,
            nome_crianca,
            data_nascimento,
            endereco_residencial,
            escola,
            endereco_escola,
            rota_id,
            endereco_responsavel
        } = ctx.request.body || {};

        const faltando = [];
        ['nome_responsavel', 'email_responsavel', 'telefone_responsavel', 'nome_crianca', 'data_nascimento', 'endereco_residencial', 'escola', 'endereco_escola'].forEach((f) => {
            if (!ctx.request.body || !ctx.request.body[f]) faltando.push(f);
        });
        if (faltando.length) {
            ctx.status = 422;
            return send(ctx, validationError(faltando, 'Campos obrigatorios ausentes'));
        }

        if (isDemoMode()) {
            return send(ctx, success({
                responsavel: { id: 999, nome: nome_responsavel, email: email_responsavel, celular: telefone_responsavel, senha_temporaria: 'demo123' },
                crianca: { id: 999, nome: nome_crianca }
            }, 'DEMO: criacao simulada'));
        }

        if (rota_id && !(await rotaPertenceAoMotorista(rota_id, motoristaId))) {
            ctx.status = 404;
            return send(ctx, error('Rota nao encontrada para este motorista', 404));
        }

        const responsavel = await encontrarOuCriarResponsavel(
            { nome: nome_responsavel, email: email_responsavel, celular: telefone_responsavel, endereco: endereco_responsavel },
            motoristaId
        );

        const criancaRes = await db.query(
            `INSERT INTO criancas (
                nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, rota_id, ativo, criado_em, atualizado_em
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
            RETURNING id, nome_completo, rota_id, criado_em`,
            [
                nome_crianca,
                data_nascimento,
                endereco_residencial,
                escola,
                endereco_escola,
                responsavel.id,
                motoristaId,
                rota_id || null
            ]
        );

        return send(ctx, success({
            responsavel: {
                id: responsavel.id,
                nome: nome_responsavel,
                email: email_responsavel,
                celular: telefone_responsavel,
                senha_temporaria: responsavel.senhaTemporaria || null
            },
            crianca: criancaRes.rows[0]
        }, 'Responsavel e crianca cadastrados com sucesso', 201));
    } catch (err) {
        logger.error('Erro ao criar responsavel:', err);
        ctx.status = 500;
        return send(ctx, error('Erro interno ao criar responsavel', 500));
    }
});

// Importacao via planilha .xlsx
router.post('/responsaveis/importar-xlsx', spreadsheetUpload.single('arquivo_excel'), validateUploadedFiles('spreadsheets'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const plano = await exigirPlanoAtivo(ctx);
        if (!plano.ativo) return;

        const file = ctx.file;
        if (!file) {
            ctx.status = 400;
            return send(ctx, error('Arquivo nao enviado', 400));
        }

        if (isDemoMode()) {
            fs.unlinkSync(file.path);
            return send(ctx, success({ importados: 2, erros: [] }, 'DEMO: importacao simulada'));
        }

        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        const importados = [];
        const erros = [];

        for (const [index, row] of rows.entries()) {
            try {
                const nome_responsavel = row.nome_responsavel || row.responsavel_nome || row.nomeResponsavel;
                const email_responsavel = row.email_responsavel || row.responsavel_email || row.emailResponsavel;
                const telefone_responsavel = row.telefone_responsavel || row.responsavel_telefone || row.telefoneResponsavel;
                const nome_crianca = row.nome_crianca || row.crianca || row.nomeCrianca;
                const data_nascimento = row.data_nascimento || row.dataNascimento;
                const endereco_residencial = row.endereco_residencial || row.enderecoResidencial;
                const escola = row.escola;
                const endereco_escola = row.endereco_escola || row.enderecoEscola;
                const rota_id = row.rota_id || row.rotaId || null;
                const rota_nome = row.rota_nome || row.nome_rota || row.rotaNome || null;
                const horario_inicio = row.horario_inicio || null;
                const horario_fim = row.horario_fim || null;
                const dias_semana = row.dias_semana || row.diasSemana || null;

                const faltando = [];
                if (!nome_responsavel) faltando.push('nome_responsavel');
                if (!email_responsavel) faltando.push('email_responsavel');
                if (!telefone_responsavel) faltando.push('telefone_responsavel');
                if (!nome_crianca) faltando.push('nome_crianca');
                if (!data_nascimento) faltando.push('data_nascimento');
                if (!endereco_residencial) faltando.push('endereco_residencial');
                if (!escola) faltando.push('escola');
                if (!endereco_escola) faltando.push('endereco_escola');
                if (faltando.length) {
                    erros.push({ linha: index + 2, erro: `Campos faltando: ${faltando.join(', ')}` });
                    continue;
                }

                let rotaFinalId = rota_id;
                // Se não veio ID, mas veio nome, cria rota para o motorista
                if (!rotaFinalId && rota_nome) {
                    const existenteRota = await db.query(
                        'SELECT id FROM rotas WHERE LOWER(nome_rota)=LOWER($1) AND motorista_id=$2 LIMIT 1',
                        [rota_nome, motoristaId]
                    );
                    if (existenteRota.rows.length) {
                        rotaFinalId = existenteRota.rows[0].id;
                    } else {
                        const novaRota = await db.query(
                            `INSERT INTO rotas (motorista_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativo, criado_em)
                             VALUES ($1, $2, $3, $4, $5, $6, true, NOW()) RETURNING id`,
                            [motoristaId, rota_nome, 'Importação Excel', horario_inicio || '07:00', horario_fim || '17:30', dias_semana || 'seg-sex']
                        );
                        rotaFinalId = novaRota.rows[0].id;
                    }
                }

                if (rotaFinalId && !(await rotaPertenceAoMotorista(rotaFinalId, motoristaId))) {
                    erros.push({ linha: index + 2, erro: 'Rota nao pertence ao motorista' });
                    continue;
                }

                const responsavel = await encontrarOuCriarResponsavel(
                    { nome: nome_responsavel, email: email_responsavel, celular: telefone_responsavel, endereco: row.endereco_responsavel || null },
                    motoristaId
                );

                const criancaRes = await db.query(
                    `INSERT INTO criancas (
                        nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, rota_id, ativo, criado_em, atualizado_em
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
                    RETURNING id, nome_completo`,
                    [
                        nome_crianca,
                        data_nascimento,
                        endereco_residencial,
                        escola,
                        endereco_escola,
                        responsavel.id,
                        motoristaId,
                        rotaFinalId || null
                    ]
                );

                importados.push({
                    responsavel: { id: responsavel.id, nome: nome_responsavel, email: email_responsavel },
                    crianca: criancaRes.rows[0]
                });
            } catch (errLinha) {
                erros.push({ linha: index + 2, erro: errLinha.message });
            }
        }

        fs.unlinkSync(file.path);

        return send(ctx, success({ importados, erros }, 'Importacao concluida'));
    } catch (err) {
        logger.error('Erro na importacao XLSX:', err);
        ctx.status = 500;
        return send(ctx, error('Erro interno na importacao', 500));
    }
});

// Rota para listar crianÃ§as do motorista (opcionalmente por rota)
router.get('/criancas', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { rota_id } = ctx.query || {};

        if (isDemoMode()) {
            return send(ctx, success([
                { id: 1, nome_completo: 'CrianÃ§a Demo', rota_id: rota_id || 10, responsavel_nome: 'Demo Resp', responsavel_email: 'demo@resp.com' }
            ]));
        }

        const params = [motoristaId];
        const condicoes = ['c.motorista_id = $1', 'c.ativo = true'];
        if (rota_id) {
            params.push(parseInt(rota_id, 10));
            condicoes.push(`c.rota_id = $${params.length}`);
        }

        const resultado = await db.query(`
            SELECT c.*, u.nome_completo as responsavel_nome, u.email as responsavel_email,
                   r.nome_rota, r.horario_inicio, r.horario_fim
            FROM criancas c
            LEFT JOIN usuarios u ON c.responsavel_id = u.id
            LEFT JOIN rotas r ON c.rota_id = r.id
            WHERE ${condicoes.join(' AND ')}
            ORDER BY c.nome_completo
        `, params);

        return send(ctx, success(resultado.rows));
    } catch (error) {
        logger.error('Erro ao listar crianÃ§as:', error);
        ctx.status = 500;
        return send(ctx, error('Erro interno do servidor', 500));
    }
});

// Listagem de responsÃ¡veis agrupados por rota
router.get('/responsaveis/rotas/:rotaId', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const rotaId = parseInt(ctx.params.rotaId, 10);
        if (!Number.isFinite(rotaId)) {
            ctx.status = 400;
            return send(ctx, validationError(['rotaId invalido'], 'Parametro invalido'));
        }

        if (isDemoMode()) {
            return send(ctx, success({
                rota_id: rotaId,
                responsaveis: [
                    { id: 1, nome: 'Demo Resp', email: 'demo@resp.com', total_criancas: 1 }
                ]
            }, 'DEMO: rota simulada'));
        }

        const rotaPertence = await rotaPertenceAoMotorista(rotaId, motoristaId);
        if (!rotaPertence) {
            ctx.status = 404;
            return send(ctx, error('Rota nÃ£o encontrada para este motorista', 404));
        }

        const res = await db.query(
            `SELECT 
                u.id,
                u.nome_completo as nome,
                u.email,
                u.celular,
                COALESCE(us.ativo, true) as ativo,
                COUNT(c.id) as total_criancas
             FROM usuarios u
             JOIN criancas c ON c.responsavel_id = u.id
             LEFT JOIN usuarios_status us ON us.usuario_id = u.id
             WHERE c.motorista_id = $1 AND c.rota_id = $2
             GROUP BY u.id, u.nome_completo, u.email, u.celular, us.ativo
             ORDER BY u.nome_completo`,
            [motoristaId, rotaId]
        );
        return send(ctx, success({ rota_id: rotaId, responsaveis: res.rows }));
    } catch (err) {
        logger.error('Erro ao listar responsÃ¡veis por rota:', err);
        ctx.status = 500;
        return send(ctx, error('Erro interno ao listar responsÃ¡veis por rota', 500));
    }
});

// Resumo geral de responsÃ¡veis e crianÃ§as do motorista
router.get('/responsaveis/resumo', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        if (isDemoMode()) {
            return send(ctx, success({
                totais: { responsaveis: 2, criancas: 3, rotas: 1 },
                responsaveis: [
                    { id: 1, nome: 'Demo Resp', total_criancas: 2, ativo: true }
                ]
            }, 'DEMO: resumo simulado'));
        }

        const res = await db.query(
            `SELECT 
                u.id,
                u.nome_completo as nome,
                u.email,
                COALESCE(us.ativo, true) as ativo,
                COUNT(c.id) as total_criancas
             FROM usuarios u
             JOIN criancas c ON c.responsavel_id = u.id
             LEFT JOIN usuarios_status us ON us.usuario_id = u.id
             WHERE c.motorista_id = $1
             GROUP BY u.id, u.nome_completo, u.email, us.ativo
             ORDER BY u.nome_completo`,
            [motoristaId]
        );

        const totRes = await db.query(
            `SELECT 
                COUNT(DISTINCT u.id) as responsaveis,
                COUNT(DISTINCT c.id) as criancas,
                COUNT(DISTINCT r.id) as rotas
             FROM criancas c
             LEFT JOIN usuarios u ON c.responsavel_id = u.id
             LEFT JOIN rotas r ON c.rota_id = r.id
             WHERE c.motorista_id = $1`,
            [motoristaId]
        );

        return send(ctx, success({
            totais: totRes.rows[0],
            responsaveis: res.rows
        }));
    } catch (err) {
        logger.error('Erro ao resumir responsÃ¡veis:', err);
        ctx.status = 500;
        return send(ctx, error('Erro interno ao resumir responsÃ¡veis', 500));
    }
});

// Rota para cadastrar uma crianÃ§a
// ValidaÃ§Ã£o por schema unificado
const schemaCrianca = {
    nome_completo: { required: true, minLength: 2, maxLength: 255 },
    data_nascimento: { required: true, validator: validators.isValidDate },
    endereco_residencial: { required: true, minLength: 5, maxLength: 300 },
    escola: { required: true, minLength: 2, maxLength: 200 },
    endereco_escola: { required: true, minLength: 5, maxLength: 300 },
    responsavel_email: { required: true, validator: validators.isEmail }
};

router.post('/criancas', validate(schemaCrianca), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const dadosCrianca = ctx.validatedData;

        // Verificar se o responsÃ¡vel existe
        const responsavel = await db.query(
            'SELECT id FROM usuarios WHERE email = $1 AND tipo_cadastro = $2',
            [dadosCrianca.responsavel_email, 'responsavel']
        );

        if (responsavel.rows.length === 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'ResponsÃ¡vel nÃ£o encontrado. Verifique o email informado.'
            };
            return;
        }

        const responsavelId = responsavel.rows[0].id;

        // Inserir crianÃ§a
        const resultado = await db.query(`
            INSERT INTO criancas (
                nome_completo, data_nascimento, endereco_residencial, 
                escola, endereco_escola, responsavel_id, motorista_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            dadosCrianca.nome_completo,
            dadosCrianca.data_nascimento,
            dadosCrianca.endereco_residencial,
            dadosCrianca.escola,
            dadosCrianca.endereco_escola,
            responsavelId,
            motoristaId
        ]);

        logger.info('Nova crianÃ§a cadastrada:', JSON.stringify(sanitizeForLog({
            crianca_id: resultado.rows[0].id,
            motorista_id: motoristaId,
            responsavel_id: responsavelId
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'CrianÃ§a cadastrada com sucesso',
            crianca: resultado.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao cadastrar crianÃ§a:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para importar crianÃ§as via CSV
router.post('/criancas/importar-csv', csvUpload.single('arquivo_csv'), validateUploadedFiles('csv'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const arquivo = ctx.file;

        if (!arquivo) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Arquivo CSV nÃ£o fornecido'
            };
            return;
        }

        const criancasImportadas = [];
        const erros = [];

        // Ler e processar o arquivo CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(arquivo.path)
                .pipe(csv())
                .on('data', async (linha) => {
                    try {
                        // Validar dados da linha
                        const validacao = validateInput(linha, {
                            nome_completo: 'name',
                            data_nascimento: 'date',
                            endereco_residencial: 'address',
                            escola: 'name',
                            endereco_escola: 'address',
                            responsavel_email: 'email'
                        });

                        if (!validacao.isValid) {
                            erros.push({
                                linha: linha,
                                erros: validacao.errors
                            });
                            return;
                        }

                        // Verificar se o responsÃ¡vel existe
                        const responsavel = await db.query(
                            'SELECT id FROM usuarios WHERE email = $1 AND tipo_cadastro = $2',
                            [linha.responsavel_email, 'responsavel']
                        );

                        if (responsavel.rows.length === 0) {
                            erros.push({
                                linha: linha,
                                erro: 'ResponsÃ¡vel nÃ£o encontrado'
                            });
                            return;
                        }

                        const responsavelId = responsavel.rows[0].id;

                        // Inserir crianÃ§a
                        const resultado = await db.query(`
                            INSERT INTO criancas (
                                nome_completo, data_nascimento, endereco_residencial, 
                                escola, endereco_escola, responsavel_id, motorista_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                            RETURNING *
                        `, [
                            validacao.sanitizedData.nome_completo,
                            validacao.sanitizedData.data_nascimento,
                            validacao.sanitizedData.endereco_residencial,
                            validacao.sanitizedData.escola,
                            validacao.sanitizedData.endereco_escola,
                            responsavelId,
                            motoristaId
                        ]);

                        criancasImportadas.push(resultado.rows[0]);
                    } catch (error) {
                        erros.push({
                            linha: linha,
                            erro: error.message
                        });
                    }
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                });
        });

        // Remover arquivo temporÃ¡rio
        fs.unlinkSync(arquivo.path);

        logger.info('ImportaÃ§Ã£o CSV concluÃ­da:', JSON.stringify(sanitizeForLog({
            motorista_id: motoristaId,
            criancas_importadas: criancasImportadas.length,
            erros: erros.length
        })));

        ctx.body = {
            sucesso: true,
            mensagem: `ImportaÃ§Ã£o concluÃ­da. ${criancasImportadas.length} crianÃ§as importadas.`,
            criancas_importadas: criancasImportadas,
            erros: erros
        };
    } catch (error) {
        logger.error('Erro na importaÃ§Ã£o CSV:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para listar rotas do motorista
router.get('/rotas', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        
        const resultado = await db.query(`
            SELECT r.*, 
                   COUNT(c.id) as total_criancas,
                   ARRAY_AGG(
                       CASE WHEN c.id IS NOT NULL 
                       THEN json_build_object(
                           'id', c.id,
                           'nome', c.nome_completo,
                           'escola', c.escola
                       ) 
                       END
                   ) as criancas
            FROM rotas r
            LEFT JOIN criancas c ON r.id = c.rota_id AND c.ativo = true
            WHERE r.motorista_id = $1 AND r.ativo = true
            GROUP BY r.id
            ORDER BY r.nome_rota
        `, [motoristaId]);

        ctx.body = {
            sucesso: true,
            rotas: resultado.rows
        };
    } catch (error) {
        logger.error('Erro ao listar rotas:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para criar uma nova rota
router.post('/rotas', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const dadosRota = ctx.request.body;

        // Validar dados da rota
        const validacao = validateInput(dadosRota, {
            nome_rota: 'name',
            descricao: 'text',
            horario_inicio: 'time',
            horario_fim: 'time',
            dias_semana: 'text'
        });

        if (!validacao.isValid) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Dados invÃ¡lidos',
                erros: validacao.errors
            };
            return;
        }

        // Inserir rota
        const resultado = await db.query(`
            INSERT INTO rotas (
                motorista_id, nome_rota, descricao, 
                horario_inicio, horario_fim, dias_semana
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            motoristaId,
            validacao.sanitizedData.nome_rota,
            validacao.sanitizedData.descricao,
            validacao.sanitizedData.horario_inicio,
            validacao.sanitizedData.horario_fim,
            validacao.sanitizedData.dias_semana
        ]);

        logger.info('Nova rota criada:', JSON.stringify(sanitizeForLog({
            rota_id: resultado.rows[0].id,
            motorista_id: motoristaId
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota criada com sucesso',
            rota: resultado.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao criar rota:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para atribuir crianÃ§a a uma rota
router.put('/criancas/:id/rota', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const criancaId = ctx.params.id;
        const { rota_id } = ctx.request.body;

        // Verificar se a crianÃ§a pertence ao motorista
        const crianca = await db.query(
            'SELECT id FROM criancas WHERE id = $1 AND motorista_id = $2',
            [criancaId, motoristaId]
        );

        if (crianca.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'CrianÃ§a nÃ£o encontrada'
            };
            return;
        }

        // Verificar se a rota pertence ao motorista
        if (rota_id) {
            const rota = await db.query(
                'SELECT id FROM rotas WHERE id = $1 AND motorista_id = $2',
                [rota_id, motoristaId]
            );

            if (rota.rows.length === 0) {
                ctx.status = 404;
                ctx.body = {
                    sucesso: false,
                    mensagem: 'Rota nÃ£o encontrada'
                };
                return;
            }
        }

        // Atualizar rota da crianÃ§a
        await db.query(
            'UPDATE criancas SET rota_id = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
            [rota_id || null, criancaId]
        );

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota da crianÃ§a atualizada com sucesso'
        };
    } catch (error) {
        logger.error('Erro ao atualizar rota da crianÃ§a:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para upload de documentos (CNH, CRLV, Antecedentes, CNPJ)
router.post('/upload/documentos', documentUpload.fields([
    { name: 'uploadCNH', maxCount: 1 },
    { name: 'uploadCRLV', maxCount: 1 },
    { name: 'uploadAntecedentes', maxCount: 1 },
    { name: 'uploadCNPJ', maxCount: 1 }
]), validateUploadedFiles('documents'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const files = ctx.files;
        
        if (!files || Object.keys(files).length === 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Nenhum arquivo foi enviado'
            };
            return;
        }
        
        const uploadedFiles = {};
        
        // Processar cada tipo de documento
        for (const [fieldName, fileArray] of Object.entries(files)) {
            if (fileArray && fileArray.length > 0) {
                const file = fileArray[0];
                uploadedFiles[fieldName] = {
                    originalName: file.sanitizedOriginalName,
                    fileName: file.secureFileName,
                    size: file.size,
                    mimeType: file.mimetype,
                    uploadDate: new Date(file.uploadTimestamp)
                };
            }
        }
        
        // Salvar informaÃ§Ãµes dos arquivos no banco de dados
        // (Aqui vocÃª pode implementar a lÃ³gica para salvar no banco)
        
        ctx.body = {
            sucesso: true,
            mensagem: 'Documentos enviados com sucesso',
            arquivos: uploadedFiles
        };
        
    } catch (error) {
        logger.error('Erro no upload de documentos:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: error.message || 'Erro interno do servidor'
        };
    }
});

// Rota para upload de foto de perfil
router.post('/upload/foto-perfil', imageUpload.single('fotoPerfil'), validateUploadedFiles('images'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const file = ctx.file;
        
        if (!file) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Nenhuma imagem foi enviada'
            };
            return;
        }
        
        const fileInfo = {
            originalName: file.sanitizedOriginalName,
            fileName: file.secureFileName,
            size: file.size,
            mimeType: file.mimetype,
            uploadDate: new Date(file.uploadTimestamp)
        };
        
        // Salvar informaÃ§Ãµes da foto no banco de dados
        // (Aqui vocÃª pode implementar a lÃ³gica para salvar no banco)
        
        ctx.body = {
            sucesso: true,
            mensagem: 'Foto de perfil enviada com sucesso',
            arquivo: fileInfo
        };
        
    } catch (error) {
        logger.error('Erro no upload da foto de perfil:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: error.message || 'Erro interno do servidor'
        };
    }
});

// Rota para upload mÃºltiplo (todos os tipos)
router.post('/upload/multiplo', allFilesUpload.array('arquivos', 10), validateUploadedFiles('all'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const files = ctx.files;
        
        if (!files || files.length === 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Nenhum arquivo foi enviado'
            };
            return;
        }
        
        const uploadedFiles = files.map(file => ({
            originalName: file.sanitizedOriginalName,
            fileName: file.secureFileName,
            size: file.size,
            mimeType: file.mimetype,
            uploadDate: new Date(file.uploadTimestamp)
        }));
        
        ctx.body = {
            sucesso: true,
            mensagem: `${files.length} arquivo(s) enviado(s) com sucesso`,
            arquivos: uploadedFiles
        };
        
    } catch (error) {
        logger.error('Erro no upload mÃºltiplo:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: error.message || 'Erro interno do servidor'
        };
    }
});

module.exports = router;

