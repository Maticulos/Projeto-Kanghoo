const Router = require('koa-router');
const db = require('../config/db');
const logger = require('../utils/logger');

const router = new Router({ prefix: '/api/transportes' });

/**
 * ENDPOINT DE BUSCA UNIFICADA DE TRANSPORTES
 * 
 * Este endpoint implementa um sistema de busca complexo que permite filtrar
 * tanto transportes escolares quanto excursões/fretamentos em uma única consulta.
 * 
 * ARQUITETURA DA BUSCA:
 * 
 * 1. QUERY DINÂMICA:
 *    - Construção condicional de SELECT baseada no tipo de transporte
 *    - JOINs adaptativos para incluir apenas dados relevantes
 *    - Filtros específicos por tipo de serviço
 * 
 * 2. SISTEMA DE FILTROS MULTI-CAMADA:
 *    - Filtros básicos: tipo, endereço, capacidade
 *    - Filtros específicos: turno/horário (escolar), data/duração (excursão)
 *    - Filtros de características: ar-condicionado, wifi, acessibilidade
 *    - Filtros de preço: faixas dinâmicas por tipo de serviço
 * 
 * 3. ORDENAÇÃO INTELIGENTE:
 *    - Relevância (padrão): avaliação + ID
 *    - Preço: crescente/decrescente adaptado ao tipo
 *    - Avaliação: média de notas dos usuários
 *    - Distância: placeholder para geolocalização futura
 * 
 * 4. PAGINAÇÃO OTIMIZADA:
 *    - Query principal com LIMIT/OFFSET
 *    - Query separada para contagem total
 *    - Metadados de paginação no retorno
 * 
 * PARÂMETROS SUPORTADOS:
 * - tipo: 'escolar'|'excursao'|'todos'
 * - endereco: busca textual no endereço
 * - raio: distância em km (futuro)
 * - capacidade: faixas de lotação do veículo
 * - faixaPreco: intervalos de preço por tipo
 * - turno/horarios: específicos para escolar
 * - datas/duracao: específicos para excursão
 * - caracteristicas: ar, wifi, acessibilidade
 * - ordenacao: critério de ordenação
 * - pagina/limite: controle de paginação
 * 
 * GET /api/transportes/buscar
 */
router.get('/buscar', async (ctx) => {
    try {
        /**
         * EXTRAÇÃO E VALIDAÇÃO DE PARÂMETROS
         * 
         * Definição de valores padrão e normalização de entrada.
         * Parâmetros são extraídos da query string com fallbacks seguros.
         */
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

        /**
         * CONSTRUÇÃO DINÂMICA DA QUERY PRINCIPAL
         * 
         * A query é construída dinamicamente baseada no tipo de transporte solicitado.
         * Isso permite otimizar a consulta incluindo apenas os dados necessários.
         * 
         * ESTRATÉGIA:
         * 1. SELECT base com campos comuns a todos os tipos
         * 2. Adição condicional de campos específicos por tipo
         * 3. JOINs adaptativos para evitar dados desnecessários
         */
        let query = `
            SELECT DISTINCT
                u.id,
                u.nome_completo as nome,
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

        /**
         * ADIÇÃO CONDICIONAL DE CAMPOS ESPECÍFICOS
         * 
         * Campos específicos são adicionados apenas quando necessários,
         * otimizando a query e evitando JOINs desnecessários.
         */
        
        // CAMPOS ESPECÍFICOS PARA TRANSPORTE ESCOLAR
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

        // CAMPOS ESPECÍFICOS PARA EXCURSÕES
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

        // CAMPO ESPECIAL PARA ORDENAÇÃO UNIFICADA
        // Quando tipo='todos', precisamos de um campo comum para ordenar por preço
        if (tipo === 'todos') {
            query += `,
                COALESCE(re.preco_mensal, pe.preco_por_pessoa) as preco_ordenacao
            `;
        }

        /**
         * CONSTRUÇÃO DOS JOINs ADAPTATIVOS
         * 
         * JOINs são adicionados condicionalmente baseados no tipo de busca.
         * Isso evita JOINs desnecessários e melhora a performance.
         * 
         * ESTRUTURA DE TABELAS:
         * - usuarios: dados básicos do prestador
         * - veiculos: informações do veículo
         * - caracteristicas_veiculos: features do veículo
         * - rotas_escolares: dados específicos de transporte escolar
         * - pacotes_excursao: dados específicos de excursões
         * - avaliacoes: sistema de avaliações dos usuários
         */
        
        // ===== CONSTRUÇÃO DE JOINS ADAPTATIVOS =====
        // Sistema de junções condicionais que adapta a query baseada no tipo de transporte
        // Permite busca unificada mantendo performance otimizada
        
        query += `
            FROM usuarios u`;
        
        // JOIN principal: Conecta usuários com seus veículos
        // LEFT JOIN permite usuários sem veículos (para casos especiais)
        // Relação: um usuário pode ter múltiplos veículos
        query += `
            LEFT JOIN veiculos v ON u.id = v.usuario_id`;
        
        // JOIN para características do veículo (sempre necessário para filtros)
        // LEFT JOIN permite veículos sem características cadastradas
        // Conecta veículo específico com suas características opcionais
        query += `
            LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id`;

        // ===== JOINS CONDICIONAIS POR TIPO DE TRANSPORTE =====
        // Estratégia: Adicionar joins apenas quando necessário para evitar overhead
        
        // JOIN CONDICIONAL PARA ROTAS ESCOLARES
        if (tipo === 'escolar' || tipo === 'todos') {
            // JOIN para dados específicos de transporte escolar
            // LEFT JOIN permite usuários que oferecem outros tipos de transporte
            // Conecta com tabela de rotas escolares para obter:
            // - Horários de ida/volta
            // - Turnos disponíveis  
            // - Informações específicas do transporte escolar
            // Filtro adicional: re.ativa = true garante apenas rotas ativas
            query += `
                LEFT JOIN rotas_escolares re ON u.id = re.usuario_id AND re.ativa = true
            `;
        }

        // JOIN CONDICIONAL PARA PACOTES DE EXCURSÃO
        if (tipo === 'excursao' || tipo === 'todos') {
            // JOIN para dados específicos de excursões
            // LEFT JOIN permite usuários que oferecem outros tipos de transporte
            // Conecta com tabela de pacotes de excursão para obter:
            // - Datas de início/fim
            // - Duração da excursão
            // - Preços e informações específicas
            // Filtro adicional: pe.ativo = true garante apenas pacotes ativos
            query += `
                LEFT JOIN pacotes_excursao pe ON u.id = pe.usuario_id AND pe.ativo = true
            `;
        }

        /**
         * SUBQUERY PARA CÁLCULO DE AVALIAÇÕES
         * 
         * Calcula a média de avaliações e total de avaliações por prestador.
         * Utiliza LEFT JOIN para incluir prestadores sem avaliações.
         * 
         * LÓGICA:
         * - Agrupa avaliações por prestador (avaliado_id)
         * - Calcula média arredondada para 1 casa decimal
         * - Conta total de avaliações aprovadas
         * - COALESCE garante valor 0 para prestadores sem avaliações
         */
        
        // ===== SUBQUERY PARA AVALIAÇÕES =====
        // Subquery correlacionada para calcular estatísticas de avaliação
        // Utiliza LEFT JOIN para incluir usuários sem avaliações (média = 0)
        // Otimização: Agrupa por avaliado_id para evitar duplicatas
        query += `
            LEFT JOIN (
                SELECT 
                    avaliado_id,
                    ROUND(AVG(nota::numeric), 1) as media_avaliacao,    -- Média das notas recebidas
                    COUNT(*) as total_avaliacoes                        -- Total de avaliações recebidas
                FROM avaliacoes 
                WHERE aprovado = true                                   -- Apenas avaliações aprovadas pela moderação
                GROUP BY avaliado_id                                    -- Agrupa para evitar duplicatas por usuário
            ) avg_aval ON u.id = avg_aval.avaliado_id                   -- Conecta usuário com suas estatísticas
        `;
        
        // ===== EXPLICAÇÃO DOS TIPOS DE JOIN UTILIZADOS =====
        /*
        LEFT JOIN veiculos:
        - Inclui usuários mesmo sem veículos cadastrados
        - Permite flexibilidade para prestadores em processo de cadastro
        
        LEFT JOIN caracteristicas_veiculos:
        - Inclui veículos mesmo sem características cadastradas
        - Permite filtros opcionais por características (ar, wifi, etc.)
        - Características são opcionais no sistema
        
        LEFT JOIN rotas_escolares/pacotes_excursao:
        - Condicionais baseados no tipo de busca solicitada
        - Permite usuários que oferecem múltiplos tipos de transporte
        - Evita overhead quando tipo específico não é necessário
        - Filtros adicionais (ativa=true, ativo=true) garantem dados válidos
        
        LEFT JOIN subquery avaliacoes:
        - Inclui usuários sem avaliações (novos prestadores)
        - Calcula estatísticas agregadas de forma eficiente
        - Evita múltiplas linhas por usuário devido ao GROUP BY
        - WHERE aprovado=true garante qualidade das avaliações
        */

        /**
         * SISTEMA DE FILTROS DINÂMICOS
         * 
         * Implementa um sistema flexível de filtros que constrói
         * condições WHERE dinamicamente baseadas nos parâmetros fornecidos.
         * 
         * ESTRATÉGIA:
         * 1. Array de condições (conditions) para construir WHERE
         * 2. Array de parâmetros (params) para prepared statements
         * 3. Índice incremental (paramIndex) para evitar conflitos
         * 4. Validação e sanitização de entrada
         */
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        /**
         * FILTRO POR TIPO DE USUÁRIO
         * 
         * Determina quais tipos de prestadores incluir na busca.
         * Suporta busca específica ou unificada.
         */
        if (tipo === 'escolar') {
            conditions.push(`u.tipo_usuario = $${paramIndex}`);
            params.push('escolar');
            paramIndex++;
        } else if (tipo === 'excursao') {
            conditions.push(`u.tipo_usuario = $${paramIndex}`);
            params.push('excursao');
            paramIndex++;
        } else {
            // Para tipo 'todos', incluir ambos os tipos
            conditions.push(`u.tipo_usuario IN ($${paramIndex}, $${paramIndex + 1})`);
            params.push('escolar', 'excursao');
            paramIndex += 2;
        }

        /**
         * FILTRO POR LOCALIZAÇÃO
         * 
         * Implementa busca textual simples por endereço.
         * TODO: Implementar busca geográfica com coordenadas e raio.
         */
        if (endereco) {
            conditions.push(`u.endereco_completo ILIKE $${paramIndex}`);
            params.push(`%${endereco}%`);
            paramIndex++;
        }

        /**
         * FILTRO POR CAPACIDADE DO VEÍCULO
         * 
         * Suporta diferentes formatos de entrada:
         * - Faixa: "10-20" -> BETWEEN 10 AND 20
         * - Mínimo: "50+" -> >= 50
         * - Exato: "15" -> <= 15
         * 
         * LÓGICA DE PARSING:
         * 1. Detecta formato da entrada
         * 2. Extrai valores mínimo e máximo
         * 3. Aplica filtro BETWEEN para flexibilidade
         */
        if (capacidade) {
            const [min, max] = capacidade.includes('-') ? 
                capacidade.split('-').map(Number) : 
                capacidade === '50+' ? [50, 999] : [0, Number(capacidade)];
            
            conditions.push(`v.lotacao_maxima BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(min, max);
            paramIndex += 2;
        }

        /**
         * FILTROS ESPECÍFICOS PARA TRANSPORTE ESCOLAR
         * 
         * Aplicados apenas quando tipo='escolar' ou quando relevante
         * para evitar filtros em dados inexistentes.
         */
        
        // Filtro por turno (manhã, tarde, noite)
        if (tipo === 'escolar' && turno) {
            conditions.push(`re.turno = $${paramIndex}`);
            params.push(turno);
            paramIndex++;
        }

        // Filtro por horário mínimo de ida
        if (tipo === 'escolar' && horarioIda) {
            conditions.push(`re.horario_ida >= $${paramIndex}`);
            params.push(horarioIda);
            paramIndex++;
        }

        // Filtro por horário máximo de volta
        if (tipo === 'escolar' && horarioVolta) {
            conditions.push(`re.horario_volta <= $${paramIndex}`);
            params.push(horarioVolta);
            paramIndex++;
        }

        /**
         * FILTROS ESPECÍFICOS PARA EXCURSÕES
         * 
         * Aplicados apenas para tipo='excursao' ou quando relevante.
         */
        
        // Filtro por data mínima de início
        if (tipo === 'excursao' && dataInicio) {
            conditions.push(`pe.data_inicio >= $${paramIndex}`);
            params.push(dataInicio);
            paramIndex++;
        }

        // Filtro por data máxima de fim
        if (tipo === 'excursao' && dataFim) {
            conditions.push(`pe.data_fim <= $${paramIndex}`);
            params.push(dataFim);
            paramIndex++;
        }

        /**
         * FILTRO POR DURAÇÃO DA EXCURSÃO
         * 
         * Similar ao filtro de capacidade, suporta múltiplos formatos:
         * - Faixa: "3-7" -> entre 3 e 7 dias
         * - Mínimo: "7+" -> 7 dias ou mais
         * - Exato: "5" -> exatamente 5 dias
         */
        if (tipo === 'excursao' && duracao) {
            const [min, max] = duracao.includes('-') ? 
                duracao.split('-').map(Number) : 
                duracao === '7+' ? [7, 365] : [Number(duracao), Number(duracao)];
            
            conditions.push(`pe.duracao_dias BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(min, max);
            paramIndex += 2;
        }

        /**
         * FILTROS DE CARACTERÍSTICAS DO VEÍCULO
         * 
         * Filtros booleanos simples para features específicas.
         * Aplicados apenas quando explicitamente solicitados.
         */
        if (arCondicionado === 'true') {
            conditions.push(`cv.ar_condicionado = true`);
        }

        if (wifi === 'true') {
            conditions.push(`cv.wifi = true`);
        }

        if (acessibilidade === 'true') {
            conditions.push(`cv.acessibilidade_pcd = true`);
        }

        /**
         * FILTRO POR FAIXA DE PREÇO
         * 
         * Implementa lógica complexa para filtrar preços baseado no tipo:
         * - Escolar: filtra por preco_mensal
         * - Excursão: filtra por preco_por_pessoa
         * - Todos: filtra por qualquer um dos dois (OR)
         * 
         * FORMATOS SUPORTADOS:
         * - Faixa: "100-300" -> entre R$ 100 e R$ 300
         * - Mínimo: "500+" -> R$ 500 ou mais
         * - Máximo: "200" -> até R$ 200
         */
        if (faixaPreco) {
            const [min, max] = faixaPreco.includes('-') ? 
                faixaPreco.split('-').map(Number) : 
                faixaPreco === '500+' ? [500, 99999] : [0, Number(faixaPreco)];

            if (tipo === 'escolar') {
                conditions.push(`re.preco_mensal BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            } else if (tipo === 'excursao') {
                conditions.push(`pe.preco_por_pessoa BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            } else {
                // Para tipo 'todos', aceitar qualquer um dos preços
                conditions.push(`(re.preco_mensal BETWEEN $${paramIndex} AND $${paramIndex + 1} OR pe.preco_por_pessoa BETWEEN $${paramIndex} AND $${paramIndex + 1})`);
            }
            params.push(min, max);
            paramIndex += 2;
        }

        // APLICAÇÃO DAS CONDIÇÕES WHERE
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        /**
         * SISTEMA DE ORDENAÇÃO INTELIGENTE
         * 
         * Implementa diferentes critérios de ordenação adaptados ao tipo de busca.
         * A ordenação é otimizada para cada tipo de transporte.
         * 
         * CRITÉRIOS SUPORTADOS:
         * - relevancia: avaliação + ID (padrão)
         * - preco-menor/maior: adaptado ao tipo de serviço
         * - avaliacao: média de notas dos usuários
         * - distancia: placeholder para geolocalização futura
         */
        let orderBy = '';
        switch (ordenacao) {
            case 'preco-menor':
                orderBy = tipo === 'escolar' ? 're.preco_mensal ASC' : 
                         tipo === 'excursao' ? 'pe.preco_por_pessoa ASC' : 
                         'preco_ordenacao ASC';
                break;
            case 'preco-maior':
                orderBy = tipo === 'escolar' ? 're.preco_mensal DESC' : 
                         tipo === 'excursao' ? 'pe.preco_por_pessoa DESC' : 
                         'preco_ordenacao DESC';
                break;
            case 'avaliacao':
                orderBy = 'avaliacao DESC NULLS LAST';
                break;
            case 'distancia':
                // TODO: Implementar cálculo de distância real com coordenadas
                orderBy = 'u.id ASC'; // Placeholder
                break;
            default:
                // Ordenação padrão: relevância (avaliação + ID para desempate)
                orderBy = 'avaliacao DESC NULLS LAST, u.id ASC';
        }

        query += ` ORDER BY ${orderBy}`;

        /**
         * IMPLEMENTAÇÃO DE PAGINAÇÃO
         * 
         * Adiciona LIMIT e OFFSET para controle de paginação.
         * Parâmetros são adicionados ao final para evitar conflitos.
         */
        const offset = (pagina - 1) * limite;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limite, offset);

        // Log da query para debugging
        logger.debug('Query SQL:', query);
        logger.debug('Parâmetros:', params);

        // Execução da query principal
        const result = await db.query(query, params);

        /**
         * QUERY DE CONTAGEM PARA PAGINAÇÃO
         * 
         * Executa uma query separada para contar o total de resultados
         * sem LIMIT/OFFSET para calcular metadados de paginação.
         * 
         * OTIMIZAÇÃO:
         * - Reutiliza as mesmas condições WHERE
         * - Remove apenas LIMIT e OFFSET dos parâmetros
         * - Usa COUNT(DISTINCT) para evitar duplicatas
         */
        let countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM usuarios u
            LEFT JOIN veiculos v ON u.id = v.usuario_id
            LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
        `;

        // Adicionar os mesmos JOINs da query principal
        if (tipo === 'escolar' || tipo === 'todos') {
            countQuery += ` LEFT JOIN rotas_escolares re ON u.id = re.usuario_id AND re.ativa = true`;
        }

        if (tipo === 'excursao' || tipo === 'todos') {
            countQuery += ` LEFT JOIN pacotes_excursao pe ON u.id = pe.usuario_id AND pe.ativo = true`;
        }

        // Aplicar as mesmas condições WHERE
        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.join(' AND ')}`;
        }

        // Executar query de contagem (sem LIMIT e OFFSET)
        const countResult = await db.query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        /**
         * FORMATAÇÃO E ESTRUTURAÇÃO DOS RESULTADOS
         * 
         * Transforma os dados brutos do banco em uma estrutura
         * padronizada para o frontend.
         */
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
        logger.error('Erro na busca de transportes:', error);
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

        const result = await db.query(query, [id]);

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
            const rotasResult = await db.query(rotasQuery, [id]);
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
            const pacotesResult = await db.query(pacotesQuery, [id]);
            pacotes = pacotesResult.rows;
        }

        // Buscar avaliações recentes
        const avaliacoesQuery = `
            SELECT 
                a.*,
                CASE 
                    WHEN a.anonimo = true THEN 'Usuário Anônimo'
                    ELSE u.nome_completo
                END as nome_avaliador
            FROM avaliacoes a
            LEFT JOIN usuarios u ON a.avaliador_id = u.id
            WHERE a.avaliado_id = $1 AND a.aprovado = true
            ORDER BY a.created_at DESC
            LIMIT 10
        `;
        const avaliacoesResult = await db.query(avaliacoesQuery, [id]);

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
        logger.error('Erro ao buscar detalhes do transporte:', error);
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

        const result = await db.query(query, [
            ctx.user?.id || null, // Se houver autenticação
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
        logger.error('Erro ao solicitar cotação:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        };
    }
});

module.exports = router;