const Router = require('koa-router');
const db = require('../config/db');
const logger = require('../utils/logger');
const { apiResponse } = require('../utils/api-response');
const { authenticateToken, verificarMotoristaExcursao } = require('../middleware/auth-utils');
const { validate } = require('../middleware/validation');

const router = new Router({ prefix: '/api/motorista-excursao' });

// O middleware verificarMotoristaExcursao agora é importado do auth-utils

// GET /api/motorista-excursao/perfil - Obter perfil do motorista de excursão
router.get('/perfil', authenticateToken, verificarMotoristaExcursao, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    const result = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.telefone,
        u.endereco,
        u.cidade,
        u.estado,
        u.cep,
        u.tipo_usuario,
        u.status_conta,
        u.criado_em,
        COUNT(pe.id) as total_excursoes,
        COUNT(CASE WHEN pe.data_excursao >= CURRENT_DATE THEN 1 END) as excursoes_ativas
      FROM usuarios u
      LEFT JOIN pacotes_excursao pe ON u.id = pe.usuario_id AND pe.ativo = true
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);
    
    if (!result.rows.length) {
      return ctx.body = apiResponse.error('Perfil não encontrado', 404);
    }
    
    ctx.body = apiResponse.success(result.rows[0], 'Perfil obtido com sucesso');
  } catch (error) {
    logger.error('Erro ao obter perfil do motorista de excursão:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// GET /api/motorista-excursao/excursoes - Listar excursões do motorista
router.get('/excursoes', authenticateToken, verificarMotoristaExcursao, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { status = 'todas', page = 1, limit = 10 } = ctx.query;
    
    let whereClause = 'WHERE pe.usuario_id = $1 AND pe.ativo = true';
    const params = [userId];
    
    if (status === 'ativas') {
      whereClause += ' AND pe.data_excursao >= CURRENT_DATE';
    } else if (status === 'finalizadas') {
      whereClause += ' AND pe.data_excursao < CURRENT_DATE';
    }
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT 
        pe.*,
        COUNT(ie.id) as total_inscritos,
        COUNT(CASE WHEN ie.status_inscricao = 'confirmada' THEN 1 END) as inscritos_confirmados
      FROM pacotes_excursao pe
      LEFT JOIN inscricoes_excursao ie ON pe.id = ie.pacote_id
      ${whereClause}
      GROUP BY pe.id
      ORDER BY pe.data_excursao DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    // Contar total para paginação
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM pacotes_excursao pe
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    ctx.body = apiResponse.success({
      excursoes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Excursões obtidas com sucesso');
  } catch (error) {
    logger.error('Erro ao listar excursões:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// POST /api/motorista-excursao/excursoes - Criar nova excursão
router.post('/excursoes', 
  authenticateToken, 
  verificarMotoristaExcursao,
  validate({
    nome_pacote: { required: true, type: 'string', minLength: 3, maxLength: 100 },
    destino: { required: true, type: 'string', minLength: 3, maxLength: 200 },
    data_excursao: { required: true, type: 'string' },
    horario_saida: { required: true, type: 'string' },
    horario_retorno: { required: true, type: 'string' },
    ponto_encontro: { required: true, type: 'string', minLength: 10, maxLength: 500 },
    preco_por_pessoa: { required: true, type: 'number', min: 0 },
    vagas_disponiveis: { required: true, type: 'number', min: 1, max: 50 },
    descricao: { required: false, type: 'string', maxLength: 1000 }
  }),
  async (ctx) => {
    try {
      const userId = ctx.state.user.id;
      const {
        nome_pacote,
        destino,
        data_excursao,
        horario_saida,
        horario_retorno,
        ponto_encontro,
        preco_por_pessoa,
        vagas_disponiveis,
        descricao = ''
      } = ctx.request.body;
      
      // Verificar se a data não é no passado
      const dataExcursao = new Date(data_excursao);
      if (dataExcursao < new Date()) {
        return ctx.body = apiResponse.error('A data da excursão não pode ser no passado', 400);
      }
      
      const result = await db.query(`
        INSERT INTO pacotes_excursao (
          usuario_id, nome_pacote, destino, data_excursao, 
          horario_saida, horario_retorno, ponto_encontro,
          preco_por_pessoa, vagas_disponiveis, descricao, ativo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING *
      `, [
        userId, nome_pacote, destino, data_excursao,
        horario_saida, horario_retorno, ponto_encontro,
        preco_por_pessoa, vagas_disponiveis, descricao
      ]);
      
      ctx.body = apiResponse.success(result.rows[0], 'Excursão criada com sucesso', 201);
    } catch (error) {
      logger.error('Erro ao criar excursão:', error);
      ctx.body = apiResponse.error('Erro interno do servidor', 500);
    }
  }
);

// GET /api/motorista-excursao/excursoes/:id/participantes - Listar participantes de uma excursão
router.get('/excursoes/:id/participantes', authenticateToken, verificarMotoristaExcursao, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const excursaoId = ctx.params.id;
    
    // Verificar se a excursão pertence ao motorista
    const excursaoResult = await db.query(
      'SELECT id FROM pacotes_excursao WHERE id = $1 AND usuario_id = $2',
      [excursaoId, userId]
    );
    
    if (!excursaoResult.rows.length) {
      return ctx.body = apiResponse.error('Excursão não encontrada ou não autorizada', 404);
    }
    
    const result = await db.query(`
      SELECT 
        ie.id as inscricao_id,
        ie.status_inscricao,
        ie.data_inscricao,
        ie.observacoes,
        u.nome as participante_nome,
        u.email as participante_email,
        u.telefone as participante_telefone
      FROM inscricoes_excursao ie
      JOIN usuarios u ON ie.usuario_id = u.id
      WHERE ie.pacote_id = $1
      ORDER BY ie.data_inscricao DESC
    `, [excursaoId]);
    
    ctx.body = apiResponse.success(result.rows, 'Participantes obtidos com sucesso');
  } catch (error) {
    logger.error('Erro ao listar participantes:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// GET /api/motorista-excursao/gps/status - Status do GPS
router.get('/gps/status', authenticateToken, verificarMotoristaExcursao, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    // Simular status do GPS (pode ser integrado com sistema real)
    const gpsStatus = {
      ativo: true,
      precisao: 'alta',
      ultima_atualizacao: new Date().toISOString(),
      coordenadas: {
        latitude: -23.5505,
        longitude: -46.6333
      },
      velocidade: 0,
      direcao: 0
    };
    
    ctx.body = apiResponse.success(gpsStatus, 'Status do GPS obtido com sucesso');
  } catch (error) {
    logger.error('Erro ao obter status do GPS:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// POST /api/motorista-excursao/gps/posicao - Atualizar posição GPS
router.post('/gps/posicao',
  authenticateToken,
  verificarMotoristaExcursao,
  validate({
    latitude: { required: true, type: 'number' },
    longitude: { required: true, type: 'number' },
    velocidade: { required: false, type: 'number', min: 0 },
    direcao: { required: false, type: 'number', min: 0, max: 360 }
  }),
  async (ctx) => {
    try {
      const userId = ctx.state.user.id;
      const { latitude, longitude, velocidade = 0, direcao = 0 } = ctx.request.body;
      
      // Salvar posição no banco (tabela de rastreamento)
      const result = await db.query(`
        INSERT INTO rastreamento_gps (
          usuario_id, latitude, longitude, velocidade, direcao, timestamp
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [userId, latitude, longitude, velocidade, direcao]);
      
      ctx.body = apiResponse.success(result.rows[0], 'Posição GPS atualizada com sucesso');
    } catch (error) {
      logger.error('Erro ao atualizar posição GPS:', error);
      ctx.body = apiResponse.error('Erro interno do servidor', 500);
    }
  }
);

// GET /api/motorista-excursao/notificacoes - Buscar notificações
router.get('/notificacoes', authenticateToken, verificarMotoristaExcursao, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { page = 1, limit = 10, lidas = 'todas' } = ctx.query;
    
    let whereClause = 'WHERE n.usuario_id = $1';
    const params = [userId];
    
    if (lidas === 'nao_lidas') {
      whereClause += ' AND n.lida = false';
    } else if (lidas === 'lidas') {
      whereClause += ' AND n.lida = true';
    }
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT 
        n.id,
        n.titulo,
        n.mensagem,
        n.tipo,
        n.lida,
        n.criado_em
      FROM notificacoes n
      ${whereClause}
      ORDER BY n.criado_em DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    ctx.body = apiResponse.success(result.rows, 'Notificações obtidas com sucesso');
  } catch (error) {
    logger.error('Erro ao buscar notificações:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

module.exports = router;