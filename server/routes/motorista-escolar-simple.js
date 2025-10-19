const KoaRouter = require('koa-router');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth-utils');
const { validateInput, sanitizeForLog } = require('../security-config');
const notificationService = require('../notification-service');

const router = new KoaRouter({ prefix: '/api/motorista-escolar' });

// Rota de teste básica
router.get('/test', async (ctx) => {
    ctx.body = {
        sucesso: true,
        mensagem: 'API do motorista escolar funcionando'
    };
});

// Rota para obter perfil do motorista
router.get('/profile', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        
        // Buscar dados do usuário
        const usuario = await db.query(`
            SELECT id, nome_completo, email, celular, tipo_cadastro
            FROM usuarios 
            WHERE id = $1
        `, [motoristaId]);

        // Buscar dados do veículo
        const veiculo = await db.query(`
            SELECT placa, renavam, lotacao_maxima
            FROM veiculos 
            WHERE usuario_id = $1
        `, [motoristaId]);

        console.log(JSON.stringify(sanitizeForLog({
            acao: 'buscar_profile',
            motorista_id: motoristaId
        })));

        ctx.body = {
            sucesso: true,
            usuario: usuario.rows[0] || {},
            veiculo: veiculo.rows[0] || null
        };
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para listar crianças do motorista
router.get('/criancas', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        
        const criancas = await db.query(`
            SELECT 
                c.id,
                c.nome_completo,
                c.data_nascimento,
                c.endereco_residencial,
                c.escola,
                c.endereco_escola,
                c.rota_id,
                r.nome_rota,
                c.ativo,
                c.criado_em
            FROM criancas c
            LEFT JOIN rotas r ON c.rota_id = r.id
            WHERE c.motorista_id = $1
            ORDER BY c.nome_completo
        `, [motoristaId]);

        console.log(JSON.stringify(sanitizeForLog({
            acao: 'listar_criancas',
            motorista_id: motoristaId,
            total_criancas: criancas.rows.length
        })));

        ctx.body = {
            sucesso: true,
            criancas: criancas.rows
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

// Rota para adicionar uma criança
router.post('/criancas', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_email } = ctx.request.body;

        // Validação de entrada
        const validacoes = [
            validateInput(nome_completo, { type: 'text', minLength: 2, maxLength: 100 }),
            validateInput(data_nascimento, { type: 'date' }),
            validateInput(endereco_residencial, { type: 'text', minLength: 5, maxLength: 200 }),
            validateInput(escola, { type: 'text', minLength: 2, maxLength: 100 }),
            validateInput(endereco_escola, { type: 'text', minLength: 5, maxLength: 200 }),
            validateInput(responsavel_email, { type: 'email' })
        ];

        for (const validacao of validacoes) {
            if (!validacao.valid) {
                ctx.status = 400;
                ctx.body = {
                    sucesso: false,
                    mensagem: validacao.error
                };
                return;
            }
        }

        // Verificar se já existe uma criança com o mesmo nome e responsável
        const criancaExistente = await db.query(
            'SELECT id FROM criancas WHERE nome_completo = $1 AND responsavel_email = $2',
            [nome_completo, responsavel_email]
        );

        if (criancaExistente.rows.length > 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Já existe uma criança cadastrada com este nome e responsável'
            };
            return;
        }

        // Inserir a criança
        const resultado = await db.query(`
            INSERT INTO criancas (
                nome_completo, data_nascimento, endereco_residencial, 
                escola, endereco_escola, responsavel_email, motorista_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, nome_completo
        `, [nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola, responsavel_email, motoristaId]);

        console.log(JSON.stringify(sanitizeForLog({
            acao: 'adicionar_crianca',
            motorista_id: motoristaId,
            crianca_id: resultado.rows[0].id,
            nome_crianca: resultado.rows[0].nome_completo
        })));

        ctx.status = 201;
        ctx.body = {
            sucesso: true,
            mensagem: 'Criança adicionada com sucesso',
            crianca: resultado.rows[0]
        };
    } catch (error) {
        console.error('Erro ao adicionar criança:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota para listar rotas do motorista
router.get('/rotas', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        
        const rotas = await db.query(`
            SELECT 
                r.id,
                r.nome_rota as nome,
                r.descricao,
                r.ativo,
                r.criado_em,
                COUNT(c.id) as total_criancas
            FROM rotas r
            LEFT JOIN criancas c ON r.id = c.rota_id
            WHERE r.motorista_id = $1
            GROUP BY r.id, r.nome_rota, r.descricao, r.ativo, r.criado_em
            ORDER BY r.nome_rota
        `, [motoristaId]);

        ctx.body = {
            sucesso: true,
            rotas: rotas.rows
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
router.post('/rotas', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const { nome, descricao } = ctx.request.body;

        // Validação de entrada
        const validacoes = [
            validateInput(nome, { type: 'text', minLength: 2, maxLength: 100 }),
            validateInput(descricao, { type: 'text', minLength: 5, maxLength: 500 })
        ];

        for (const validacao of validacoes) {
            if (!validacao.valid) {
                ctx.status = 400;
                ctx.body = {
                    sucesso: false,
                    mensagem: validacao.error
                };
                return;
            }
        }

        // Verificar se já existe uma rota com o mesmo nome
        const rotaExistente = await db.query(
            'SELECT id FROM rotas WHERE nome = $1 AND motorista_id = $2',
            [nome, motoristaId]
        );

        if (rotaExistente.rows.length > 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Já existe uma rota com este nome'
            };
            return;
        }

        // Inserir a rota
        const resultado = await db.query(`
            INSERT INTO rotas (nome, descricao, motorista_id)
            VALUES ($1, $2, $3)
            RETURNING id, nome, descricao
        `, [nome, descricao, motoristaId]);

        console.log(JSON.stringify(sanitizeForLog({
            acao: 'criar_rota',
            motorista_id: motoristaId,
            rota_id: resultado.rows[0].id,
            nome_rota: resultado.rows[0].nome
        })));

        ctx.status = 201;
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

// === SISTEMA DE CHECK-IN/CHECK-OUT ===

// Listar crianças na viagem atual para check-in/check-out
router.get('/viagem-atual/criancas', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        // Aqui você buscaria as crianças da viagem ativa atual
        const criancasViagem = [
            {
                id: 1,
                nome: 'João Silva',
                ponto_embarque: 'Rua das Flores, 123',
                ponto_desembarque: 'Escola Municipal ABC',
                status_checkin: 'pendente', // pendente, embarcou, desembarcou
                horario_embarque_previsto: '07:15',
                responsavel: {
                    nome: 'Maria Silva',
                    telefone: '(11) 99999-9999',
                    preferencias_notificacao: {
                        tipo: 'whatsapp', // email, whatsapp, ambos
                        frequencia: '5min' // 5min, 15min, chegada_saida
                    }
                }
            },
            {
                id: 2,
                nome: 'Ana Costa',
                ponto_embarque: 'Av. Principal, 456',
                ponto_desembarque: 'Escola Municipal ABC',
                status_checkin: 'embarcou',
                horario_embarque_previsto: '07:20',
                horario_embarque_real: '07:22',
                responsavel: {
                    nome: 'Carlos Costa',
                    telefone: '(11) 88888-8888',
                    preferencias_notificacao: {
                        tipo: 'email',
                        frequencia: '15min'
                    }
                }
            }
        ];
        
        console.log(`[${new Date().toISOString()}] Lista de crianças da viagem consultada por usuário ${ctx.user.id}`);
        
        ctx.body = {
            sucesso: true,
            mensagem: 'Crianças da viagem listadas com sucesso',
            dados: criancasViagem
        };
    } catch (error) {
        console.error('Erro ao listar crianças da viagem:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Check-in de criança (embarque)
router.post('/checkin/:crianca_id', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const { crianca_id } = ctx.params;
        const { latitude, longitude, observacoes } = ctx.request.body;

        // Validar dados obrigatórios
        if (!latitude || !longitude) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                erro: 'Localização (latitude e longitude) é obrigatória'
            };
            return;
        }

        // Simular busca da criança e responsável
        const crianca = {
            id: crianca_id,
            nome: 'Ana Silva',
            idade: 8,
            escola: 'Escola Municipal João Paulo II'
        };

        const responsavel = {
            nome: 'Maria Silva',
            telefone: '+5511999999999',
            email: 'maria.silva@email.com',
            preferencias_notificacao: {
                tipo: 'ambos', // email, whatsapp, ambos
                frequencia: '15min' // 5min, 15min, chegada_saida
            }
        };

        // Registrar check-in
        const checkin = {
            crianca_id,
            timestamp: new Date(),
            localizacao: { latitude, longitude },
            observacoes,
            tipo: 'embarque'
        };

        // Enviar notificação de embarque
        const resultadosNotificacao = await notificationService.notificarEmbarque(
            crianca, 
            responsavel, 
            { latitude, longitude }
        );

        console.log(`[CHECK-IN] Criança ${crianca.nome} embarcou às ${checkin.timestamp.toLocaleString('pt-BR')}`);
        console.log(`[NOTIFICAÇÃO] Resultados:`, resultadosNotificacao);

        ctx.body = {
            sucesso: true,
            mensagem: 'Check-in realizado com sucesso',
            dados: {
                checkin,
                crianca,
                notificacoes: resultadosNotificacao
            }
        };

    } catch (error) {
        console.error('[ERRO] Check-in:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            erro: 'Erro interno do servidor'
        };
    }
});

// Check-out de criança (desembarque)
router.post('/checkout/:crianca_id', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const { crianca_id } = ctx.params;
        const { latitude, longitude, observacoes } = ctx.request.body;

        // Validar dados obrigatórios
        if (!latitude || !longitude) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                erro: 'Localização (latitude e longitude) é obrigatória'
            };
            return;
        }

        // Simular busca da criança e responsável
        const crianca = {
            id: crianca_id,
            nome: 'Ana Silva',
            idade: 8,
            escola: 'Escola Municipal João Paulo II'
        };

        const responsavel = {
            nome: 'Maria Silva',
            telefone: '+5511999999999',
            email: 'maria.silva@email.com',
            preferencias_notificacao: {
                tipo: 'ambos',
                frequencia: '15min'
            }
        };

        // Registrar check-out
        const checkout = {
            crianca_id,
            timestamp: new Date(),
            localizacao: { latitude, longitude },
            observacoes,
            tipo: 'desembarque'
        };

        // Enviar notificação de desembarque
        const resultadosNotificacao = await notificationService.notificarDesembarque(
            crianca, 
            responsavel, 
            { latitude, longitude }
        );

        console.log(`[CHECK-OUT] Criança ${crianca.nome} desembarcou às ${checkout.timestamp.toLocaleString('pt-BR')}`);
        console.log(`[NOTIFICAÇÃO] Resultados:`, resultadosNotificacao);

        ctx.body = {
            sucesso: true,
            mensagem: 'Check-out realizado com sucesso',
            dados: {
                checkout,
                crianca,
                notificacoes: resultadosNotificacao
            }
        };

    } catch (error) {
        console.error('[ERRO] Check-out:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            erro: 'Erro interno do servidor'
        };
    }
});

// === RELATÓRIOS E DADOS DE RASTREAMENTO ===

// Obter dados de rastreamento da viagem
router.get('/relatorios/rastreamento', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const { periodo = 'diario', data_inicio, data_fim } = ctx.query;
        
        // Dados simulados de rastreamento
        const dadosRastreamento = {
            periodo,
            data_inicio: data_inicio || new Date().toISOString().split('T')[0],
            data_fim: data_fim || new Date().toISOString().split('T')[0],
            resumo: {
                total_viagens: 12,
                distancia_total_km: 145.8,
                tempo_total_minutos: 720,
                combustivel_consumido_litros: 18.2,
                media_velocidade_kmh: 35.5,
                economia_combustivel_kmpl: 8.0
            },
            viagens: [
                {
                    id: 1,
                    data: '2024-01-15',
                    tipo: 'ida',
                    horario_inicio: '07:00',
                    horario_fim: '08:30',
                    distancia_km: 12.5,
                    tempo_minutos: 90,
                    combustivel_litros: 1.8,
                    criancas_transportadas: 8,
                    pontos_parada: 5
                },
                {
                    id: 2,
                    data: '2024-01-15',
                    tipo: 'volta',
                    horario_inicio: '17:00',
                    horario_fim: '18:15',
                    distancia_km: 11.8,
                    tempo_minutos: 75,
                    combustivel_litros: 1.6,
                    criancas_transportadas: 8,
                    pontos_parada: 5
                }
            ]
        };
        
        console.log(`[${new Date().toISOString()}] Relatório de rastreamento consultado - Período: ${periodo}, Usuário: ${ctx.user.id}`);
        
        ctx.body = {
            sucesso: true,
            mensagem: 'Dados de rastreamento obtidos com sucesso',
            dados: dadosRastreamento
        };
    } catch (error) {
        console.error('Erro ao obter dados de rastreamento:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Obter relatório financeiro
router.get('/relatorios/financeiro', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const { periodo = 'mensal' } = ctx.query;
        
        const relatorioFinanceiro = {
            periodo,
            receita_total: 2850.00,
            custos: {
                combustivel: 456.80,
                manutencao: 180.00,
                seguro: 120.00,
                outros: 93.20
            },
            lucro_liquido: 2000.00,
            margem_lucro: 70.2,
            comparacao_mes_anterior: {
                receita: '+12.5%',
                custos: '+8.3%',
                lucro: '+15.2%'
            }
        };
        
        console.log(`[${new Date().toISOString()}] Relatório financeiro consultado - Período: ${periodo}, Usuário: ${ctx.user.id}`);
        
        ctx.body = {
            sucesso: true,
            mensagem: 'Relatório financeiro obtido com sucesso',
            dados: relatorioFinanceiro
        };
    } catch (error) {
        console.error('Erro ao obter relatório financeiro:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// ===== ROTAS PARA GERENCIAMENTO DE ROTAS DE TRANSPORTE =====

// Simulação de banco de dados em memória para rotas
let rotasTransporte = [
    {
        id: 1,
        name: 'Rota Manhã - Centro',
        period: 'Manhã',
        type: 'Ida e Volta',
        days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
        observations: 'Rota principal do centro da cidade',
        active: true,
        tracking: true,
        motorista_id: null,
        created_at: new Date('2024-01-01'),
        stops: [
            {
                number: 1,
                address: 'Rua Principal, 100 - Centro',
                reference: 'Próximo ao banco',
                time: '07:00',
                children: [1, 2, 3]
            },
            {
                number: 2,
                address: 'Av. Central, 250 - Centro',
                reference: 'Em frente à farmácia',
                time: '07:15',
                children: [4, 5]
            }
        ]
    },
    {
        id: 2,
        name: 'Rota Tarde - Bairro Sul',
        period: 'Tarde',
        type: 'Somente Ida',
        days: ['Segunda', 'Quarta', 'Sexta'],
        observations: 'Rota para o bairro sul',
        active: true,
        tracking: false,
        motorista_id: null,
        created_at: new Date('2024-01-02'),
        stops: [
            {
                number: 1,
                address: 'Rua do Sul, 50 - Bairro Sul',
                reference: 'Próximo à escola',
                time: '13:00',
                children: [6, 7, 8]
            }
        ]
    }
];

let nextRouteId = 3;

// Listar todas as rotas do motorista
router.get('/rotas', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        
        // Filtrar rotas do motorista ou rotas não atribuídas
        const rotasMotorista = rotasTransporte.filter(rota => 
            rota.motorista_id === motoristaId || rota.motorista_id === null
        );

        // Adicionar estatísticas para cada rota
        const rotasComEstatisticas = rotasMotorista.map(rota => ({
            ...rota,
            stops: rota.stops.length,
            children: rota.stops.reduce((total, stop) => total + stop.children.length, 0)
        }));

        console.log(`[${new Date().toISOString()}] Rotas listadas - Motorista: ${motoristaId}, Total: ${rotasComEstatisticas.length}`);

        ctx.body = {
            sucesso: true,
            mensagem: 'Rotas obtidas com sucesso',
            dados: rotasComEstatisticas
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

// Criar nova rota
router.post('/rotas', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const motoristaId = ctx.user.id;
        const dadosRota = ctx.request.body;

        // Validações básicas
        if (!dadosRota.name || !dadosRota.period || !dadosRota.type) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Nome, período e tipo da rota são obrigatórios'
            };
            return;
        }

        if (!dadosRota.days || dadosRota.days.length === 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Selecione pelo menos um dia da semana'
            };
            return;
        }

        if (!dadosRota.stops || dadosRota.stops.length === 0) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Adicione pelo menos uma parada'
            };
            return;
        }

        // Validar paradas
        for (const stop of dadosRota.stops) {
            if (!stop.address || !stop.time) {
                ctx.status = 400;
                ctx.body = {
                    sucesso: false,
                    mensagem: 'Endereço e horário são obrigatórios para todas as paradas'
                };
                return;
            }
        }

        // Criar nova rota
        const novaRota = {
            id: nextRouteId++,
            name: dadosRota.name,
            period: dadosRota.period,
            type: dadosRota.type,
            days: dadosRota.days,
            observations: dadosRota.observations || '',
            active: dadosRota.active !== false,
            tracking: dadosRota.tracking === true,
            motorista_id: motoristaId,
            created_at: new Date(),
            stops: dadosRota.stops.map((stop, index) => ({
                number: index + 1,
                address: stop.address,
                reference: stop.reference || '',
                time: stop.time,
                children: stop.children || []
            }))
        };

        rotasTransporte.push(novaRota);

        console.log(`[${new Date().toISOString()}] Nova rota criada - ID: ${novaRota.id}, Motorista: ${motoristaId}, Nome: ${novaRota.name}`);

        ctx.status = 201;
        ctx.body = {
            sucesso: true,
            mensagem: 'Rota criada com sucesso',
            dados: novaRota
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

// Obter detalhes de uma rota específica
router.get('/rotas/:id', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const rotaId = parseInt(ctx.params.id);
        const motoristaId = ctx.user.id;

        const rota = rotasTransporte.find(r => 
            r.id === rotaId && (r.motorista_id === motoristaId || r.motorista_id === null)
        );

        if (!rota) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Rota não encontrada'
            };
            return;
        }

        console.log(`[${new Date().toISOString()}] Detalhes da rota consultados - ID: ${rotaId}, Motorista: ${motoristaId}`);

        ctx.body = {
            sucesso: true,
            mensagem: 'Detalhes da rota carregados com sucesso',
            dados: rota
        };
    } catch (error) {
        console.error('Erro ao obter detalhes da rota:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Atualizar rota existente
router.put('/rotas/:id', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const rotaId = parseInt(ctx.params.id);
        const motoristaId = ctx.user.id;
        const dadosAtualizacao = ctx.request.body;

        const rotaIndex = rotasTransporte.findIndex(r => 
            r.id === rotaId && r.motorista_id === motoristaId
        );

        if (rotaIndex === -1) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Rota não encontrada ou não pertence ao motorista'
            };
            return;
        }

        // Atualizar rota
        const rotaAtualizada = {
            ...rotasTransporte[rotaIndex],
            ...dadosAtualizacao,
            id: rotaId, // Manter ID original
            motorista_id: motoristaId, // Manter motorista original
            updated_at: new Date()
        };

        rotasTransporte[rotaIndex] = rotaAtualizada;

        console.log(`[${new Date().toISOString()}] Rota atualizada - ID: ${rotaId}, Motorista: ${motoristaId}`);

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota atualizada com sucesso',
            dados: rotaAtualizada
        };
    } catch (error) {
        console.error('Erro ao atualizar rota:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Iniciar rota (ativar rastreamento)
router.post('/rotas/:id/iniciar', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const rotaId = parseInt(ctx.params.id);
        const motoristaId = ctx.user.id;

        const rotaIndex = rotasTransporte.findIndex(r => 
            r.id === rotaId && (r.motorista_id === motoristaId || r.motorista_id === null)
        );

        if (rotaIndex === -1) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Rota não encontrada'
            };
            return;
        }

        // Atribuir rota ao motorista e ativar rastreamento
        rotasTransporte[rotaIndex].motorista_id = motoristaId;
        rotasTransporte[rotaIndex].tracking = true;
        rotasTransporte[rotaIndex].active = true;
        rotasTransporte[rotaIndex].started_at = new Date();

        console.log(`[${new Date().toISOString()}] Rota iniciada - ID: ${rotaId}, Motorista: ${motoristaId}, Rastreamento ativo`);

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota iniciada com sucesso! Rastreamento GPS ativado.',
            dados: {
                rota_id: rotaId,
                tracking_ativo: true,
                horario_inicio: rotasTransporte[rotaIndex].started_at
            }
        };
    } catch (error) {
        console.error('Erro ao iniciar rota:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Finalizar rota
router.post('/rotas/:id/finalizar', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const rotaId = parseInt(ctx.params.id);
        const motoristaId = ctx.user.id;

        const rotaIndex = rotasTransporte.findIndex(r => 
            r.id === rotaId && r.motorista_id === motoristaId
        );

        if (rotaIndex === -1) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Rota não encontrada ou não está ativa'
            };
            return;
        }

        // Finalizar rota
        rotasTransporte[rotaIndex].tracking = false;
        rotasTransporte[rotaIndex].finished_at = new Date();

        console.log(`[${new Date().toISOString()}] Rota finalizada - ID: ${rotaId}, Motorista: ${motoristaId}`);

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota finalizada com sucesso!',
            dados: {
                rota_id: rotaId,
                horario_fim: rotasTransporte[rotaIndex].finished_at
            }
        };
    } catch (error) {
        console.error('Erro ao finalizar rota:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Deletar rota
router.delete('/rotas/:id', authenticateToken, requireRole('motorista_escolar'), async (ctx) => {
    try {
        const rotaId = parseInt(ctx.params.id);
        const motoristaId = ctx.user.id;

        const rotaIndex = rotasTransporte.findIndex(r => 
            r.id === rotaId && r.motorista_id === motoristaId
        );

        if (rotaIndex === -1) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                mensagem: 'Rota não encontrada ou não pertence ao motorista'
            };
            return;
        }

        // Verificar se a rota está ativa
        if (rotasTransporte[rotaIndex].tracking) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                mensagem: 'Não é possível deletar uma rota ativa. Finalize a rota primeiro.'
            };
            return;
        }

        rotasTransporte.splice(rotaIndex, 1);

        console.log(`[${new Date().toISOString()}] Rota deletada - ID: ${rotaId}, Motorista: ${motoristaId}`);

        ctx.body = {
            sucesso: true,
            mensagem: 'Rota deletada com sucesso'
        };
    } catch (error) {
        console.error('Erro ao deletar rota:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

module.exports = router;