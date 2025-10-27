const Router = require('koa-router');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth-utils');
const { validate } = require('../middleware/validation');
const apiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/rotas-escolares'
});

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================

// Middleware para verificar se o usuário é motorista escolar
const verificarMotoristaEscolar = async (ctx, next) => {
  try {
    if (!ctx.user || ctx.user.tipo !== 'motorista_escolar') {
      return ctx.body = apiResponse.error('Acesso negado. Apenas motoristas escolares podem acessar esta funcionalidade.', 403);
    }
    await next();
  } catch (error) {
    logger.error('Erro na verificação de motorista escolar:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
};

// Middleware para verificar limites do plano
const verificarLimitesPlano = async (ctx, next) => {
  try {
    const usuarioId = ctx.user.id;
    
    // Buscar plano ativo do usuário
    const planoResult = await db.query(`
      SELECT tipo_plano, limite_rotas, limite_usuarios 
      FROM planos_assinatura 
      WHERE usuario_id = $1 AND ativo = true
      ORDER BY criado_em DESC 
      LIMIT 1
    `, [usuarioId]);
    
    if (planoResult.rows.length === 0) {
      return ctx.body = apiResponse.error('Nenhum plano ativo encontrado', 400);
    }
    
    const plano = planoResult.rows[0];
    
    // Contar rotas ativas do usuário
    const rotasResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM rotas_escolares 
      WHERE usuario_id = $1 AND ativa = true
    `, [usuarioId]);
    
    const totalRotas = parseInt(rotasResult.rows[0].total);
    
    // Verificar se pode criar nova rota (apenas para POST)
    if (ctx.method === 'POST' && totalRotas >= plano.limite_rotas) {
      return ctx.body = apiResponse.error(
        `Limite de rotas atingido. Seu plano ${plano.tipo_plano} permite até ${plano.limite_rotas} rotas ativas.`, 
        400
      );
    }
    
    ctx.state.plano = plano;
    ctx.state.totalRotas = totalRotas;
    await next();
  } catch (error) {
    logger.error('Erro na verificação de limites do plano:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
};

// ==========================================
// ENDPOINTS DE ROTAS ESCOLARES
// ==========================================

// GET /api/rotas-escolares - Listar rotas do motorista
router.get('/', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const usuarioId = ctx.user.id;
    const { page = 1, limit = 10, status, tipo_rota } = ctx.query;
    
    let whereClause = 'WHERE r.usuario_id = $1';
    let params = [usuarioId];
    let paramCount = 1;
    
    // Filtros opcionais
    if (status) {
      paramCount++;
      whereClause += ` AND r.status_rota = $${paramCount}`;
      params.push(status);
    }
    
    if (tipo_rota) {
      paramCount++;
      whereClause += ` AND r.tipo_rota = $${paramCount}`;
      params.push(tipo_rota);
    }
    
    // Consulta principal usando a tabela rotas_escolares
    const offset = (page - 1) * limit;
    const result = await db.query(`
      SELECT r.* FROM rotas_escolares r 
      ${whereClause}
      ORDER BY r.criado_em DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);
    
    // Contar total de registros
    const countResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM rotas_escolares r 
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    ctx.body = apiResponse.success({
      rotas: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    logger.error('Erro ao listar rotas escolares:', error);
    ctx.body = apiResponse.error('Erro ao buscar rotas escolares', 500);
  }
});

// GET /api/rotas-escolares/:id - Buscar rota específica
router.get('/:id', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const { id } = ctx.params;
    const usuarioId = ctx.user.id;
    
    const result = await db.query(`
      SELECT * FROM rotas_escolares 
      WHERE id = $1 AND usuario_id = $2
    `, [id, usuarioId]);
    
    if (result.rows.length === 0) {
      return ctx.body = apiResponse.error('Rota não encontrada', 404);
    }
    
    // Buscar crianças cadastradas na rota
    const criancasResult = await db.query(`
      SELECT 
        cr.*,
        c.nome_completo,
        c.data_nascimento,
        c.escola,
        c.serie_ano,
        u.nome_completo as responsavel_nome,
        u.celular as responsavel_telefone
      FROM criancas_rotas cr
      JOIN criancas c ON c.id = cr.crianca_id
      JOIN usuarios u ON u.id = c.responsavel_id
      WHERE cr.rota_id = $1 AND cr.ativo = true
      ORDER BY cr.horario_embarque
    `, [id]);
    
    const rota = {
      ...result.rows[0],
      criancas: criancasResult.rows
    };
    
    ctx.body = apiResponse.success(rota);
    
  } catch (error) {
    logger.error('Erro ao buscar rota escolar:', error);
    ctx.body = apiResponse.error('Erro ao buscar rota escolar', 500);
  }
});

// POST /api/rotas-escolares - Criar nova rota
router.post('/', 
  authenticateToken, 
  verificarMotoristaEscolar, 
  verificarLimitesPlano,
  validate({
    nome_rota: { required: true, type: 'string', minLength: 3, maxLength: 100 },
    descricao: { required: false, type: 'string', maxLength: 500 },
    tipo_rota: { required: true, type: 'string', enum: ['ida', 'volta', 'ida_volta'] },
    escola_destino: { required: true, type: 'string', minLength: 3, maxLength: 200 },
    turno: { required: true, type: 'string', enum: ['matutino', 'vespertino', 'noturno', 'integral'] },
    endereco_origem: { required: false, type: 'string', maxLength: 500 },
    endereco_destino: { required: false, type: 'string', maxLength: 500 },
    horario_ida: { required: true, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    horario_volta: { required: false, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    dias_semana: { required: true, type: 'string', minLength: 1 },
    valor_mensal: { required: true, type: 'number', min: 0 },
    capacidade_maxima: { required: true, type: 'number', min: 1, max: 50 },
    observacoes: { required: false, type: 'string', maxLength: 1000 }
  }),
  async (ctx) => {
    try {
      const usuarioId = ctx.user.id;
      const {
        nome_rota,
        descricao,
        tipo_rota,
        escola_destino,
        turno,
        endereco_origem,
        endereco_destino,
        latitude_origem,
        longitude_origem,
        latitude_destino,
        longitude_destino,
        horario_ida,
        horario_volta,
        dias_semana,
        valor_mensal,
        capacidade_maxima,
        observacoes
      } = ctx.request.body;
      
      // Validações específicas
      if (tipo_rota === 'volta' && !horario_volta) {
        return ctx.body = apiResponse.error('Horário de volta é obrigatório para rotas do tipo "volta" ou "ida_volta"', 400);
      }
      
      if (tipo_rota === 'ida_volta' && !horario_volta) {
        return ctx.body = apiResponse.error('Horário de volta é obrigatório para rotas do tipo "ida_volta"', 400);
      }
      
      const result = await db.query(`
        INSERT INTO rotas_escolares (
          usuario_id, nome_rota, descricao, tipo_rota, escola_destino, turno,
          endereco_origem, endereco_destino, latitude_origem, longitude_origem,
          latitude_destino, longitude_destino, horario_ida, horario_volta,
          dias_semana, valor_mensal, capacidade_maxima, capacidade_atual,
          status_rota, observacoes, ativa
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 0, 'ativa', $18, true
        ) RETURNING id
      `, [
        usuarioId, nome_rota, descricao, tipo_rota, escola_destino, turno,
        endereco_origem, endereco_destino, latitude_origem, longitude_origem,
        latitude_destino, longitude_destino, horario_ida, horario_volta,
        dias_semana, valor_mensal, capacidade_maxima, observacoes
      ]);
      
      const rotaId = result.rows[0].id;
      
      logger.info(`Nova rota escolar criada: ID ${rotaId} por usuário ${usuarioId}`);
      
      ctx.body = apiResponse.success({
        id: rotaId,
        message: 'Rota escolar criada com sucesso!'
      }, 201);
      
    } catch (error) {
      logger.error('Erro ao criar rota escolar:', error);
      ctx.body = apiResponse.error('Erro ao criar rota escolar', 500);
    }
  }
);

// PUT /api/rotas-escolares/:id - Atualizar rota
router.put('/:id', 
  authenticateToken, 
  verificarMotoristaEscolar,
  validate({
    nome_rota: { required: false, type: 'string', minLength: 3, maxLength: 100 },
    descricao: { required: false, type: 'string', maxLength: 500 },
    tipo_rota: { required: false, type: 'string', enum: ['ida', 'volta', 'ida_volta'] },
    escola_destino: { required: false, type: 'string', minLength: 3, maxLength: 200 },
    turno: { required: false, type: 'string', enum: ['matutino', 'vespertino', 'noturno', 'integral'] },
    endereco_origem: { required: false, type: 'string', maxLength: 500 },
    endereco_destino: { required: false, type: 'string', maxLength: 500 },
    horario_ida: { required: false, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    horario_volta: { required: false, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    dias_semana: { required: false, type: 'string', minLength: 1 },
    valor_mensal: { required: false, type: 'number', min: 0 },
    capacidade_maxima: { required: false, type: 'number', min: 1, max: 50 },
    observacoes: { required: false, type: 'string', maxLength: 1000 },
    ativa: { required: false, type: 'boolean' }
  }),
  async (ctx) => {
    try {
      const { id } = ctx.params;
      const usuarioId = ctx.user.id;
      
      // Verificar se a rota existe e pertence ao usuário
      const rotaExistente = await db.query(`
        SELECT * FROM rotas_escolares 
        WHERE id = $1 AND usuario_id = $2
      `, [id, usuarioId]);
      
      if (rotaExistente.rows.length === 0) {
        return ctx.body = apiResponse.error('Rota não encontrada', 404);
      }
      
      const dadosAtualizacao = ctx.request.body;
      
      // Construir query de atualização dinamicamente
      const campos = [];
      const valores = [];
      let contador = 1;
      
      for (const [campo, valor] of Object.entries(dadosAtualizacao)) {
        if (valor !== undefined && valor !== null) {
          campos.push(`${campo} = $${contador}`);
          valores.push(valor);
          contador++;
        }
      }
      
      if (campos.length === 0) {
        return ctx.body = apiResponse.error('Nenhum campo para atualizar', 400);
      }
      
      // Adicionar timestamp de atualização
      campos.push(`atualizado_em = NOW()`);
      
      const query = `
        UPDATE rotas_escolares 
        SET ${campos.join(', ')}
        WHERE id = $${contador} AND usuario_id = $${contador + 1}
        RETURNING id
      `;
      
      valores.push(id, usuarioId);
      
      const result = await db.query(query, valores);
      
      if (result.rows.length === 0) {
        return ctx.body = apiResponse.error('Erro ao atualizar rota', 500);
      }
      
      logger.info(`Rota escolar atualizada: ID ${id} por usuário ${usuarioId}`);
      
      ctx.body = apiResponse.success({
        id: parseInt(id),
        message: 'Rota escolar atualizada com sucesso!'
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar rota escolar:', error);
      ctx.body = apiResponse.error('Erro ao atualizar rota escolar', 500);
    }
  }
);

// DELETE /api/rotas-escolares/:id - Excluir rota
router.delete('/:id', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const { id } = ctx.params;
    const usuarioId = ctx.user.id;
    
    // Verificar se a rota existe e pertence ao usuário
    const rotaExistente = await db.query(`
      SELECT id FROM rotas_escolares 
      WHERE id = $1 AND usuario_id = $2
    `, [id, usuarioId]);
    
    if (rotaExistente.rows.length === 0) {
      return ctx.body = apiResponse.error('Rota não encontrada', 404);
    }
    
    // Verificar se há crianças cadastradas na rota
    const criancasResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM criancas_rotas 
      WHERE rota_id = $1 AND ativo = true
    `, [id]);
    
    const totalCriancas = parseInt(criancasResult.rows[0].total);
    
    if (totalCriancas > 0) {
      return ctx.body = apiResponse.error(
        `Não é possível excluir a rota. Há ${totalCriancas} criança(s) cadastrada(s) nesta rota. Remova todas as crianças antes de excluir a rota.`, 
        400
      );
    }
    
    // Excluir a rota
    await db.query(`
      DELETE FROM rotas_escolares 
      WHERE id = $1 AND usuario_id = $2
    `, [id, usuarioId]);
    
    logger.info(`Rota escolar excluída: ID ${id} por usuário ${usuarioId}`);
    
    ctx.body = apiResponse.success({
      message: 'Rota escolar excluída com sucesso!'
    });
    
  } catch (error) {
    logger.error('Erro ao excluir rota escolar:', error);
    ctx.body = apiResponse.error('Erro ao excluir rota escolar', 500);
  }
});

// ==========================================
// ENDPOINTS DE GESTÃO DE CRIANÇAS NAS ROTAS
// ==========================================

// POST /api/rotas-escolares/:id/criancas - Adicionar criança à rota
router.post('/:id/criancas', 
  authenticateToken, 
  verificarMotoristaEscolar,
  validate({
    crianca_id: { required: true, type: 'number' },
    endereco_embarque: { required: true, type: 'string', minLength: 10, maxLength: 500 },
    endereco_desembarque: { required: false, type: 'string', maxLength: 500 },
    latitude_embarque: { required: false, type: 'number' },
    longitude_embarque: { required: false, type: 'number' },
    latitude_desembarque: { required: false, type: 'number' },
    longitude_desembarque: { required: false, type: 'number' },
    horario_embarque: { required: true, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    horario_desembarque: { required: false, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    observacoes: { required: false, type: 'string', maxLength: 500 }
  }),
  async (ctx) => {
    try {
      const { id: rotaId } = ctx.params;
      const usuarioId = ctx.user.id;
      const {
        crianca_id,
        endereco_embarque,
        endereco_desembarque,
        latitude_embarque,
        longitude_embarque,
        latitude_desembarque,
        longitude_desembarque,
        horario_embarque,
        horario_desembarque,
        observacoes
      } = ctx.request.body;
      
      // Verificar se a rota existe e pertence ao usuário
      const rotaResult = await db.query(`
        SELECT capacidade_maxima, capacidade_atual 
        FROM rotas_escolares 
        WHERE id = $1 AND usuario_id = $2 AND ativa = true
      `, [rotaId, usuarioId]);
      
      if (rotaResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Rota não encontrada ou inativa', 404);
      }
      
      const rota = rotaResult.rows[0];
      
      // Verificar capacidade
      if (rota.capacidade_atual >= rota.capacidade_maxima) {
        return ctx.body = apiResponse.error('Rota lotada. Capacidade máxima atingida.', 400);
      }
      
      // Verificar se a criança existe
      const criancaResult = await db.query(`
        SELECT id, nome_completo 
        FROM criancas 
        WHERE id = $1
      `, [crianca_id]);
      
      if (criancaResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Criança não encontrada', 404);
      }
      
      // Verificar se a criança já está cadastrada na rota
      const criancaRotaExistente = await db.query(`
        SELECT id FROM criancas_rotas 
        WHERE crianca_id = $1 AND rota_id = $2 AND ativo = true
      `, [crianca_id, rotaId]);
      
      if (criancaRotaExistente.rows.length > 0) {
        return ctx.body = apiResponse.error('Criança já está cadastrada nesta rota', 400);
      }
      
      // Inserir criança na rota
      const result = await db.query(`
        INSERT INTO criancas_rotas (
          crianca_id, rota_id, endereco_embarque, endereco_desembarque,
          latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque,
          horario_embarque, horario_desembarque, observacoes, ativo
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true
        ) RETURNING id
      `, [
        crianca_id, rotaId, endereco_embarque, endereco_desembarque,
        latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque,
        horario_embarque, horario_desembarque, observacoes
      ]);
      
      const criancaRotaId = result.rows[0].id;
      
      logger.info(`Criança ${crianca_id} adicionada à rota ${rotaId} por usuário ${usuarioId}`);
      
      ctx.body = apiResponse.success({
        id: criancaRotaId,
        message: `${criancaResult.rows[0].nome_completo} foi adicionada à rota com sucesso!`
      }, 201);
      
    } catch (error) {
      logger.error('Erro ao adicionar criança à rota:', error);
      ctx.body = apiResponse.error('Erro ao adicionar criança à rota', 500);
    }
  }
);

// DELETE /api/rotas-escolares/:id/criancas/:criancaRotaId - Remover criança da rota
router.delete('/:id/criancas/:criancaRotaId', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const { id: rotaId, criancaRotaId } = ctx.params;
    const usuarioId = ctx.user.id;
    
    // Verificar se a rota pertence ao usuário
    const rotaResult = await db.query(`
      SELECT id FROM rotas_escolares 
      WHERE id = $1 AND usuario_id = $2
    `, [rotaId, usuarioId]);
    
    if (rotaResult.rows.length === 0) {
      return ctx.body = apiResponse.error('Rota não encontrada', 404);
    }
    
    // Verificar se a criança está na rota
    const criancaRotaResult = await db.query(`
      SELECT cr.id, c.nome_completo 
      FROM criancas_rotas cr
      JOIN criancas c ON c.id = cr.crianca_id
      WHERE cr.id = $1 AND cr.rota_id = $2 AND cr.ativo = true
    `, [criancaRotaId, rotaId]);
    
    if (criancaRotaResult.rows.length === 0) {
      return ctx.body = apiResponse.error('Criança não encontrada nesta rota', 404);
    }
    
    // Remover criança da rota (soft delete)
    await db.query(`
      UPDATE criancas_rotas 
      SET ativo = false, atualizado_em = NOW()
      WHERE id = $1 AND rota_id = $2
    `, [criancaRotaId, rotaId]);
    
    const nomeCrianca = criancaRotaResult.rows[0].nome_completo;
    
    logger.info(`Criança ${criancaRotaId} removida da rota ${rotaId} por usuário ${usuarioId}`);
    
    ctx.body = apiResponse.success({
      message: `${nomeCrianca} foi removida da rota com sucesso!`
    });
    
  } catch (error) {
    logger.error('Erro ao remover criança da rota:', error);
    ctx.body = apiResponse.error('Erro ao remover criança da rota', 500);
  }
});

// ==========================================
// ENDPOINTS DE ESTATÍSTICAS E RELATÓRIOS
// ==========================================

// GET /api/rotas-escolares/estatisticas - Estatísticas do motorista
router.get('/estatisticas/dashboard', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const usuarioId = ctx.user.id;
    
    // Buscar estatísticas usando as views criadas
    const estatisticasResult = await db.query(`
      SELECT * FROM vw_estatisticas_motoristas 
      WHERE usuario_id = $1
    `, [usuarioId]);
    
    const ocupacaoResult = await db.query(`
      SELECT * FROM vw_ocupacao_rotas 
      WHERE usuario_id = $1
    `, [usuarioId]);
    
    // Buscar informações do plano
    const planoResult = await db.query(`
      SELECT tipo_plano, limite_rotas, limite_usuarios 
      FROM planos_assinatura 
      WHERE usuario_id = $1 AND ativo = true
      ORDER BY criado_em DESC 
      LIMIT 1
    `, [usuarioId]);
    
    const estatisticas = estatisticasResult.rows[0] || {
      total_rotas: 0,
      rotas_ativas: 0,
      total_criancas: 0,
      receita_mensal_estimada: 0
    };
    
    const plano = planoResult.rows[0] || {
      tipo_plano: 'básico',
      limite_rotas: 3,
      limite_usuarios: 15
    };
    
    ctx.body = apiResponse.success({
      estatisticas,
      ocupacao_rotas: ocupacaoResult.rows,
      plano_atual: plano,
      utilizacao_plano: {
        rotas_utilizadas: estatisticas.rotas_ativas,
        rotas_limite: plano.limite_rotas,
        usuarios_utilizados: estatisticas.total_criancas,
        usuarios_limite: plano.limite_usuarios,
        percentual_rotas: Math.round((estatisticas.rotas_ativas / plano.limite_rotas) * 100),
        percentual_usuarios: Math.round((estatisticas.total_criancas / plano.limite_usuarios) * 100)
      }
    });
    
  } catch (error) {
    logger.error('Erro ao buscar estatísticas:', error);
    ctx.body = apiResponse.error('Erro ao buscar estatísticas', 500);
  }
});

module.exports = router;