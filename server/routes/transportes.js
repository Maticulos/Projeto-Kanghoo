const Router = require('koa-router');
const pool = require('../config/database');

const router = new Router();

/**
 * Busca unificada de transportes (escolar e excursão)
 * GET /api/transportes/buscar
 */
router.get('/buscar', async (ctx) => {
    try {
        const {
            tipo = 'todos', // 'escolar', 'excursao', 'todos'
            endereco,
            raio = 10,
            capacidade,
            faixaPreco,
            turno, // Para transporte escolar
            horarioIda,
            horarioVolta,
            dataInicio, // Para excursões
            dataFim,
            duracao,
            arCondicionado,
            wifi,
            acessibilidade,
            seguro,
            ordenacao = 'relevancia',
            pagina = 1,
            limite = 20
        } = ctx.query;

        let query = `
            SELECT DISTINCT
                u.id,
                u.nome,
                u.email,
                u.celular,
                u.tipo_usuario,
                u.endereco_completo,
                v.placa,
                v.lotacao_maxima,
                v.ano_fabricacao,
                v.cor,
                cv.ar_condicionado,
                cv.wifi,
                cv.acessibilidade_pcd,
                cv.gps_rastreamento,
                COALESCE(avg_aval.media_avaliacao, 0) as avaliacao,
                COALESCE(avg_aval.total_avaliacoes, 0) as total_avaliacoes,
                CASE 
                    WHEN u.tipo_usuario = 'escolar' THEN 'Transporte Escolar'
                    WHEN u.tipo_usuario = 'excursao' THEN 'Excursão & Fretamento'
                    ELSE 'Transporte'
                END as tipo_servico
        `;

        // Adicionar campos específicos baseado no tipo
        if (tipo === 'escolar' || tipo === 'todos') {
            query += `,
                re.nome_rota,
                re.escola_destino,
                re.turno,
                re.horario_ida,
                re.horario_volta,
                re.preco_mensal,
                re.vagas_disponiveis as vagas_escolar
            `;
        }

        if (tipo === 'excursao' || tipo === 'todos') {
            query += `,
                pe.nome_pacote,
                pe.destino,
                pe.duracao_dias,
                pe.preco_por_pessoa,
                pe.vagas_disponiveis as vagas_excursao,
                pe.data_inicio,
                pe.data_fim
            `;
        }

        query += `
            FROM usuarios u
            LEFT JOIN veiculos v ON u.id = v.usuario_id
            LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
        `;

        // Joins específicos baseado no tipo
        if (tipo === 'escolar' || tipo === 'todos') {
            query += `
                LEFT JOIN rotas_escolares re ON u.id = re.usuario_id AND re.ativa = true
            `;
        }

        if (tipo === 'excursao' || tipo === 'todos') {
            query += `
                LEFT JOIN pacotes_excursao pe ON u.id = pe.usuario_id AND pe.ativo = true
            `;
        }

        // Subquery para avaliações
        query += `
            LEFT JOIN (
                SELECT 
                    avaliado_id,
                    ROUND(AVG(nota::numeric), 1) as media_avaliacao,
                    COUNT(*) as total_avaliacoes
                FROM avaliacoes 
                WHERE aprovado = true
                GROUP BY avaliado_id
            ) avg_aval ON u.id = avg_aval.avaliado_id
        `;

        // Condições WHERE
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        // Filtro por tipo de usuário
        if (tipo === 'escolar') {
            conditions.push(`u.tipo_usuario = $${paramIndex}`);
            params.push('escolar');
            paramIndex++;
        } else if (tipo === 'excursao') {
            conditions.push(`u.tipo_usuario = $${paramIndex}`);
            params.push('excursao');
            paramIndex++;
        } else {
            conditions.push(`u.tipo_usuario IN ($${paramIndex}, $${paramIndex + 1})`);
            params.push('escolar', 'excursao');
            paramIndex += 2;
        }

        // Filtro por endereço (busca simples por enquanto)
        if (endereco) {
            conditions.push(`u.endereco_completo ILIKE $${paramIndex}`);
            params.push(`%${endereco}%`);
            paramIndex++;
        }

        // Filtro por capacidade
        if (capacidade) {
            const [min, max] = capacidade.includes('-') ? 
                capacidade.split('-').map(Number) : 
                capacidade === '50+' ? [50, 999] : [0, Number(capacidade)];
            
            conditions.push(`v.lotacao_maxima BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(min, max);
            paramIndex += 2;
        }

        // Filtros específicos para transporte escolar
        if (tipo === 'escolar' && turno) {
            conditions.push(`re.turno = $${paramIndex}`);
            params.push(turno);
            paramIndex++;
        }

        if (tipo === 'escolar' && horarioIda) {
            conditions.push(`re.horario_ida >= $${paramIndex}`);
            params.push(horarioIda);
            paramIndex++;
        }

        if (tipo === 'escolar' && horarioVolta) {
            conditions.push(`re.horario_volta <= $${paramIndex}`);
            params.push(horarioVolta);
            paramIndex++;
        }

        // Filtros específicos para excursões
        if (tipo === 'excursao' && dataInicio) {
            conditions.push(`pe.data_inicio >= $${paramIndex}`);
            params.push(dataInicio);
            paramIndex++;
        }

        if (tipo === 'excursao' && dataFim) {
            conditions.push(`pe.data_fim <= $${paramIndex}`);
            params.push(dataFim);
            paramIndex++;
        }

        if (tipo === 'excursao' && duracao) {
            const [min, max] = duracao.includes('-') ? 
                duracao.split('-').map(Number) : 
                duracao === '7+' ? [7, 365] : [Number(duracao), Number(duracao)];
            
            conditions.push(`pe.duracao_dias BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(min, max);
            paramIndex += 2;
        }

        // Filtros de características do veículo
        if (arCondicionado === 'true') {
            conditions.push(`cv.ar_condicionado = true`);
        }

        if (wifi === 'true') {
            conditions.push(`cv.wifi = true`);
        }

        if (acessibilidade === 'true') {
            conditions.push(`cv.acessibilidade_pcd = true`);
        }

        // Filtro por faixa de preço
        if (faixaPreco) {
            const [min, max] = faixaPreco.includes('-') ? 
                faixaPreco.split('-').map(Number) : 
                faixaPreco === '500+' ? [500, 99999] : [0, Number(faixaPreco)];

            if (tipo === 'escolar') {
                conditions.push(`re.preco_mensal BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            } else if (tipo === 'excursao') {
                conditions.push(`pe.preco_por_pessoa BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            } else {
                conditions.push(`(re.preco_mensal BETWEEN $${paramIndex} AND $${paramIndex + 1} OR pe.preco_por_pessoa BETWEEN $${paramIndex} AND $${paramIndex + 1})`);
            }
            params.push(min, max);
            paramIndex += 2;
        }

        // Adicionar condições WHERE
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        // Ordenação
        let orderBy = '';
        switch (ordenacao) {
            case 'preco-menor':
                orderBy = tipo === 'escolar' ? 're.preco_mensal ASC' : 
                         tipo === 'excursao' ? 'pe.preco_por_pessoa ASC' : 
                         'COALESCE(re.preco_mensal, pe.preco_por_pessoa) ASC';
                break;
            case 'preco-maior':
                orderBy = tipo === 'escolar' ? 're.preco_mensal DESC' : 
                         tipo === 'excursao' ? 'pe.preco_por_pessoa DESC' : 
                         'COALESCE(re.preco_mensal, pe.preco_por_pessoa) DESC';
                break;
            case 'avaliacao':
                orderBy = 'avg_aval.media_avaliacao DESC NULLS LAST';
                break;
            case 'distancia':
                orderBy = 'u.id ASC'; // Placeholder - implementar cálculo de distância real
                break;
            default:
                orderBy = 'avg_aval.media_avaliacao DESC NULLS LAST, u.id ASC';
        }

        query += ` ORDER BY ${orderBy}`;

        // Paginação
        const offset = (pagina - 1) * limite;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limite, offset);

        console.log('Query SQL:', query);
        console.log('Parâmetros:', params);

        const result = await pool.query(query, params);

        // Query para contar total de resultados
        let countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM usuarios u
            LEFT JOIN veiculos v ON u.id = v.usuario_id
            LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
        `;

        if (tipo === 'escolar' || tipo === 'todos') {
            countQuery += ` LEFT JOIN rotas_escolares re ON u.id = re.usuario_id AND re.ativa = true`;
        }

        if (tipo === 'excursao' || tipo === 'todos') {
            countQuery += ` LEFT JOIN pacotes_excursao pe ON u.id = pe.usuario_id AND pe.ativo = true`;
        }

        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(' AND ')}`;
        }

        const countResult = await pool.query(countQuery, params.slice(0, -2)); // Remove LIMIT e OFFSET
        const total = parseInt(countResult.rows[0].total);

        // Formatar resultados
        const transportes = result.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            email: row.email,
            celular: row.celular,
            tipo: row.tipo_servico,
            endereco: row.endereco_completo,
            avaliacao: parseFloat(row.avaliacao) || 0,
            totalAvaliacoes: parseInt(row.total_avaliacoes) || 0,
            veiculo: {
                placa: row.placa,
                capacidade: row.lotacao_maxima,
                ano: row.ano_fabricacao,
                cor: row.cor,
                caracteristicas: {
                    arCondicionado: row.ar_condicionado,
                    wifi: row.wifi,
                    acessibilidade: row.acessibilidade_pcd,
                    gps: row.gps_rastreamento
                }
            },
            // Dados específicos do tipo
            ...(row.nome_rota && {
                rota: {
                    nome: row.nome_rota,
                    escola: row.escola_destino,
                    turno: row.turno,
                    horarioIda: row.horario_ida,
                    horarioVolta: row.horario_volta,
                    precoMensal: parseFloat(row.preco_mensal),
                    vagas: row.vagas_escolar
                }
            }),
            ...(row.nome_pacote && {
                pacote: {
                    nome: row.nome_pacote,
                    destino: row.destino,
                    duracao: row.duracao_dias,
                    precoPorPessoa: parseFloat(row.preco_por_pessoa),
                    vagas: row.vagas_excursao,
                    dataInicio: row.data_inicio,
                    dataFim: row.data_fim
                }
            })
        }));

        ctx.body = {
            success: true,
            data: {
                transportes,
                paginacao: {
                    paginaAtual: parseInt(pagina),
                    totalPaginas: Math.ceil(total / limite),
                    totalResultados: total,
                    resultadosPorPagina: limite
                },
                filtros: {
                    tipo,
                    endereco,
                    raio: parseInt(raio),
                    ordenacao
                }
            }
        };

    } catch (error) {
        console.error('Erro na busca de transportes:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        };
    }
});

/**
 * Buscar detalhes de um transporte específico
 * GET /api/transportes/:id
 */
router.get('/:id', async (ctx) => {
    try {
        const { id } = ctx.params;

        const query = `
            SELECT 
                u.*,
                v.*,
                cv.*,
                e.razao_social,
                e.nome_fantasia,
                e.cnpj,
                COALESCE(avg_aval.media_avaliacao, 0) as avaliacao,
                COALESCE(avg_aval.total_avaliacoes, 0) as total_avaliacoes
            FROM usuarios u
            LEFT JOIN veiculos v ON u.id = v.usuario_id
            LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
            LEFT JOIN empresas e ON u.id = e.usuario_id
            LEFT JOIN (
                SELECT 
                    avaliado_id,
                    ROUND(AVG(nota::numeric), 1) as media_avaliacao,
                    COUNT(*) as total_avaliacoes
                FROM avaliacoes 
                WHERE aprovado = true
                GROUP BY avaliado_id
            ) avg_aval ON u.id = avg_aval.avaliado_id
            WHERE u.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: 'Transporte não encontrado'
            };
            return;
        }

        const transporte = result.rows[0];

        // Buscar rotas (se for transporte escolar)
        let rotas = [];
        if (transporte.tipo_usuario === 'escolar') {
            const rotasQuery = `
                SELECT re.*, 
                       array_agg(
                           json_build_object(
                               'endereco', pp.endereco,
                               'horario_ida', pp.horario_ida,
                               'horario_volta', pp.horario_volta,
                               'ordem', pp.ordem_parada
                           ) ORDER BY pp.ordem_parada
                       ) as pontos_parada
                FROM rotas_escolares re
                LEFT JOIN pontos_parada pp ON re.id = pp.rota_id AND pp.ativo = true
                WHERE re.usuario_id = $1 AND re.ativa = true
                GROUP BY re.id
                ORDER BY re.nome_rota
            `;
            const rotasResult = await pool.query(rotasQuery, [id]);
            rotas = rotasResult.rows;
        }

        // Buscar pacotes (se for excursão)
        let pacotes = [];
        if (transporte.tipo_usuario === 'excursao') {
            const pacotesQuery = `
                SELECT * FROM pacotes_excursao 
                WHERE usuario_id = $1 AND ativo = true
                ORDER BY nome_pacote
            `;
            const pacotesResult = await pool.query(pacotesQuery, [id]);
            pacotes = pacotesResult.rows;
        }

        // Buscar avaliações recentes
        const avaliacoesQuery = `
            SELECT 
                a.*,
                CASE 
                    WHEN a.anonimo = true THEN 'Usuário Anônimo'
                    ELSE u.nome
                END as nome_avaliador
            FROM avaliacoes a
            LEFT JOIN usuarios u ON a.avaliador_id = u.id
            WHERE a.avaliado_id = $1 AND a.aprovado = true
            ORDER BY a.created_at DESC
            LIMIT 10
        `;
        const avaliacoesResult = await pool.query(avaliacoesQuery, [id]);

        ctx.body = {
            success: true,
            data: {
                id: transporte.id,
                nome: transporte.nome,
                email: transporte.email,
                celular: transporte.celular,
                tipo: transporte.tipo_usuario,
                endereco: transporte.endereco_completo,
                dataNascimento: transporte.data_nascimento,
                avaliacao: parseFloat(transporte.avaliacao) || 0,
                totalAvaliacoes: parseInt(transporte.total_avaliacoes) || 0,
                empresa: transporte.razao_social ? {
                    razaoSocial: transporte.razao_social,
                    nomeFantasia: transporte.nome_fantasia,
                    cnpj: transporte.cnpj
                } : null,
                veiculo: {
                    placa: transporte.placa,
                    renavam: transporte.renavam,
                    capacidade: transporte.lotacao_maxima,
                    anoFabricacao: transporte.ano_fabricacao,
                    anoModelo: transporte.ano_modelo,
                    cor: transporte.cor,
                    caracteristicas: {
                        arCondicionado: transporte.ar_condicionado,
                        wifi: transporte.wifi,
                        acessibilidade: transporte.acessibilidade_pcd,
                        gps: transporte.gps_rastreamento,
                        cameras: transporte.cameras_seguranca,
                        banheiro: transporte.banheiro,
                        frigobar: transporte.frigobar,
                        tv: transporte.tv_dvd
                    }
                },
                rotas,
                pacotes,
                avaliacoes: avaliacoesResult.rows
            }
        };

    } catch (error) {
        console.error('Erro ao buscar detalhes do transporte:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        };
    }
});

/**
 * Solicitar cotação
 * POST /api/transportes/cotacao
 */
router.post('/cotacao', async (ctx) => {
    try {
        const {
            prestadorId,
            tipoServico,
            descricaoServico,
            dataInicio,
            dataFim,
            numeroPassageiros,
            enderecoOrigem,
            enderecoDestino,
            observacoes
        } = ctx.request.body;

        // Validações básicas
        if (!prestadorId || !tipoServico || !descricaoServico) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Dados obrigatórios não informados'
            };
            return;
        }

        const query = `
            INSERT INTO cotacoes (
                solicitante_id, prestador_id, tipo_servico, descricao_servico,
                data_inicio, data_fim, numero_passageiros, endereco_origem,
                endereco_destino, observacoes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `;

        const result = await pool.query(query, [
            ctx.state.user?.id || null, // Se houver autenticação
            prestadorId,
            tipoServico,
            descricaoServico,
            dataInicio,
            dataFim,
            numeroPassageiros,
            enderecoOrigem,
            enderecoDestino,
            observacoes
        ]);

        ctx.body = {
            success: true,
            message: 'Cotação solicitada com sucesso',
            data: {
                cotacaoId: result.rows[0].id
            }
        };

    } catch (error) {
        console.error('Erro ao solicitar cotação:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        };
    }
});

module.exports = router;