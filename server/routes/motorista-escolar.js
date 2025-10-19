const KoaRouter = require('koa-router');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth-utils');
const { validateInput, sanitizeForLog } = require('../security-config');
const multer = require('@koa/multer');
const csv = require('csv-parser');
const fs = require('fs');

const router = new KoaRouter();

// Configuração do multer para upload de CSV
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV são permitidos'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Aplicar middlewares de autenticação e autorização em todas as rotas
router.use(authenticateToken);
router.use(requireRole('motorista_escolar'));

// Rota para listar crianças do motorista
router.get('/criancas', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        
        const resultado = await db.query(`
            SELECT c.*, u.nome_completo as responsavel_nome, u.email as responsavel_email,
                   r.nome_rota, r.horario_inicio, r.horario_fim
            FROM criancas c
            LEFT JOIN usuarios u ON c.responsavel_id = u.id
            LEFT JOIN rotas r ON c.rota_id = r.id
            WHERE c.motorista_id = $1 AND c.ativo = true
            ORDER BY c.nome_completo
        `, [motoristaId]);

        ctx.body = {
            sucesso: true,
            criancas: resultado.rows
        };
    } catch (error) {
        console.error('Erro ao listar crianças:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para cadastrar uma criança
router.post('/criancas', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const dadosCrianca = ctx.request.body;

        // Validar dados da criança
        const validacao = validateInput(dadosCrianca, {
            nome_completo: 'name',
            data_nascimento: 'date',
            endereco_residencial: 'address',
            escola: 'name',
            endereco_escola: 'address',
            responsavel_email: 'email'
        });

        if (!validacao.isValid) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Dados inválidos',
                erros: validacao.errors
            };
            return;
        }

        // Verificar se o responsável existe
        const responsavel = await db.query(
            'SELECT id FROM usuarios WHERE email = $1 AND tipo_cadastro = $2',
            [dadosCrianca.responsavel_email, 'responsavel']
        );

        if (responsavel.rows.length === 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Responsável não encontrado. Verifique o email informado.'
            };
            return;
        }

        const responsavelId = responsavel.rows[0].id;

        // Inserir criança
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

        console.log('Nova criança cadastrada:', JSON.stringify(sanitizeForLog({
            crianca_id: resultado.rows[0].id,
            motorista_id: motoristaId,
            responsavel_id: responsavelId
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'Criança cadastrada com sucesso',
            crianca: resultado.rows[0]
        };
    } catch (error) {
        console.error('Erro ao cadastrar criança:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para importar crianças via CSV
router.post('/criancas/importar-csv', upload.single('arquivo_csv'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const arquivo = ctx.file;

        if (!arquivo) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Arquivo CSV não fornecido'
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

                        // Verificar se o responsável existe
                        const responsavel = await db.query(
                            'SELECT id FROM usuarios WHERE email = $1 AND tipo_cadastro = $2',
                            [linha.responsavel_email, 'responsavel']
                        );

                        if (responsavel.rows.length === 0) {
                            erros.push({
                                linha: linha,
                                erro: 'Responsável não encontrado'
                            });
                            return;
                        }

                        const responsavelId = responsavel.rows[0].id;

                        // Inserir criança
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

        // Remover arquivo temporário
        fs.unlinkSync(arquivo.path);

        console.log('Importação CSV concluída:', JSON.stringify(sanitizeForLog({
            motorista_id: motoristaId,
            criancas_importadas: criancasImportadas.length,
            erros: erros.length
        })));

        ctx.body = {
            sucesso: true,
            mensagem: `Importação concluída. ${criancasImportadas.length} crianças importadas.`,
            criancas_importadas: criancasImportadas,
            erros: erros
        };
    } catch (error) {
        console.error('Erro na importação CSV:', error);
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
        console.error('Erro ao listar rotas:', error);
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
                mensagem: 'Dados inválidos',
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

        console.log('Nova rota criada:', JSON.stringify(sanitizeForLog({
            rota_id: resultado.rows[0].id,
            motorista_id: motoristaId
        })));

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota criada com sucesso',
            rota: resultado.rows[0]
        };
    } catch (error) {
        console.error('Erro ao criar rota:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para atribuir criança a uma rota
router.put('/criancas/:id/rota', async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const criancaId = ctx.params.id;
        const { rota_id } = ctx.request.body;

        // Verificar se a criança pertence ao motorista
        const crianca = await db.query(
            'SELECT id FROM criancas WHERE id = $1 AND motorista_id = $2',
            [criancaId, motoristaId]
        );

        if (crianca.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Criança não encontrada'
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
                    mensagem: 'Rota não encontrada'
                };
                return;
            }
        }

        // Atualizar rota da criança
        await db.query(
            'UPDATE criancas SET rota_id = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
            [rota_id || null, criancaId]
        );

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota da criança atualizada com sucesso'
        };
    } catch (error) {
        console.error('Erro ao atualizar rota da criança:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

module.exports = router;