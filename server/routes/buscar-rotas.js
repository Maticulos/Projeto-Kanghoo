const Router = require('koa-router');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth-utils');
const { validate } = require('../middleware/validation');
const apiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/buscar-rotas'
});

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================

// Middleware para verificar se o usuário é responsável
const verificarResponsavel = async (ctx, next) => {
  try {
    if (!ctx.user || ctx.user.tipo !== 'responsavel') {
      return ctx.body = apiResponse.error('Acesso negado. Apenas responsáveis podem acessar esta funcionalidade.', 403);
    }
    await next();
  } catch (error) {
    logger.error('Erro na verificação de responsável:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
};

// ==========================================
// ENDPOINTS DE BUSCA DE ROTAS
// ==========================================

// GET /api/buscar-rotas - Buscar rotas escolares disponíveis
router.get('/', async (ctx) => {
  try {
    const {
      escola,
      bairro,
      cidade,
      turno,
      tipo_rota,
      valor_max,
      latitude,
      longitude,
      raio_km = 10,
      page = 1,
      limit = 10
    } = ctx.query;
    
    let whereClause = 'WHERE r.ativa = true AND r.status_rota = \'ativa\'';
    let params = [];
    let paramCount = 0;
    
    // Filtros de busca
    if (escola) {
      paramCount++;
      whereClause += ` AND LOWER(r.escola_destino) LIKE LOWER($${paramCount})`;
      params.push(`%${escola}%`);
    }
    
    if (bairro) {
      paramCount++;
      whereClause += ` AND (LOWER(r.endereco_origem) LIKE LOWER($${paramCount}) OR LOWER(r.endereco_destino) LIKE LOWER($${paramCount}))`;
      params.push(`%${bairro}%`);
    }
    
    if (cidade) {
      paramCount++;
      whereClause += ` AND (LOWER(r.endereco_origem) LIKE LOWER($${paramCount}) OR LOWER(r.endereco_destino) LIKE LOWER($${paramCount}))`;
      params.push(`%${cidade}%`);
    }
    
    if (turno) {
      paramCount++;
      whereClause += ` AND r.turno = $${paramCount}`;
      params.push(turno);
    }
    
    if (tipo_rota) {
      paramCount++;
      whereClause += ` AND r.tipo_rota = $${paramCount}`;
      params.push(tipo_rota);
    }
    
    if (valor_max) {
      paramCount++;
      whereClause += ` AND r.valor_mensal <= $${paramCount}`;
      params.push(parseFloat(valor_max));
    }
    
    // Filtro por proximidade geográfica (se latitude e longitude fornecidas)
    let distanciaSelect = '';
    if (latitude && longitude) {
      paramCount += 2;
      distanciaSelect = `, 
        ROUND(
          6371 * acos(
            cos(radians($${paramCount - 1})) * cos(radians(COALESCE(r.latitude_origem, 0))) * 
            cos(radians(COALESCE(r.longitude_origem, 0)) - radians($${paramCount})) + 
            sin(radians($${paramCount - 1})) * sin(radians(COALESCE(r.latitude_origem, 0)))
          )::numeric, 2
        ) as distancia_km`;
      params.push(parseFloat(latitude), parseFloat(longitude));
      
      // Adicionar filtro de raio
      paramCount++;
      whereClause += ` AND (
        r.latitude_origem IS NULL OR 
        6371 * acos(
          cos(radians($${paramCount - 2})) * cos(radians(r.latitude_origem)) * 
          cos(radians(r.longitude_origem) - radians($${paramCount - 1})) + 
          sin(radians($${paramCount - 2})) * sin(radians(r.latitude_origem))
        ) <= $${paramCount}
      )`;
      params.push(parseFloat(raio_km));
    }
    
    // Consulta principal
    const offset = (page - 1) * limit;
    const orderBy = latitude && longitude ? 'ORDER BY distancia_km ASC, r.criado_em DESC' : 'ORDER BY r.criado_em DESC';
    
    const result = await db.query(`
      SELECT 
        r.id,
        r.nome_rota,
        r.descricao,
        r.tipo_rota,
        r.escola_destino,
        r.turno,
        r.endereco_origem,
        r.endereco_destino,
        r.horario_ida,
        r.horario_volta,
        r.dias_semana,
        r.valor_mensal,
        r.capacidade_maxima,
        r.capacidade_atual,
        r.status_rota,
        r.observacoes,
        r.criado_em,
        u.nome_completo as motorista_nome,
        u.celular as motorista_telefone,
        u.email as motorista_email,
        (r.capacidade_maxima - r.capacidade_atual) as vagas_disponiveis
        ${distanciaSelect}
      FROM rotas_escolares r
      JOIN usuarios u ON u.id = r.usuario_id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);
    
    // Contar total de registros
    const countResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM rotas_escolares r
      JOIN usuarios u ON u.id = r.usuario_id
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // Adicionar informações extras para cada rota
    const rotasComDetalhes = await Promise.all(
      result.rows.map(async (rota) => {
        // Buscar avaliações da rota (se houver sistema de avaliação)
        const avaliacoesResult = await db.query(`
          SELECT 
            AVG(nota) as media_avaliacoes,
            COUNT(*) as total_avaliacoes
          FROM avaliacoes_rotas 
          WHERE rota_id = $1
        `, [rota.id]);
        
        const avaliacoes = avaliacoesResult.rows[0];
        
        return {
          ...rota,
          media_avaliacoes: avaliacoes.media_avaliacoes ? parseFloat(avaliacoes.media_avaliacoes).toFixed(1) : null,
          total_avaliacoes: parseInt(avaliacoes.total_avaliacoes),
          vagas_disponiveis: parseInt(rota.vagas_disponiveis),
          lotada: rota.capacidade_atual >= rota.capacidade_maxima
        };
      })
    );
    
    ctx.body = apiResponse.success({
      rotas: rotasComDetalhes,
      filtros_aplicados: {
        escola,
        bairro,
        cidade,
        turno,
        tipo_rota,
        valor_max,
        raio_km: latitude && longitude ? raio_km : null
      },
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
    logger.error('Erro ao buscar rotas escolares:', error);
    ctx.body = apiResponse.error('Erro ao buscar rotas escolares', 500);
  }
});

// GET /api/buscar-rotas/:id - Detalhes de uma rota específica
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const result = await db.query(`
      SELECT 
        r.*,
        u.nome_completo as motorista_nome,
        u.celular as motorista_telefone,
        u.email as motorista_email,
        u.endereco_completo as motorista_endereco,
        (r.capacidade_maxima - r.capacidade_atual) as vagas_disponiveis
      FROM rotas_escolares r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.id = $1 AND r.ativa = true
    `, [id]);
    
    if (result.rows.length === 0) {
      return ctx.body = apiResponse.error('Rota não encontrada ou inativa', 404);
    }
    
    const rota = result.rows[0];
    
    // Buscar informações do veículo (se houver)
    const veiculoResult = await db.query(`
      SELECT 
        placa,
        modelo,
        marca,
        cor,
        ano_fabricacao,
        capacidade,
        tipo_veiculo
      FROM veiculos 
      WHERE usuario_id = $1 AND ativo = true
      ORDER BY criado_em DESC
      LIMIT 1
    `, [rota.usuario_id]);
    
    // Buscar avaliações da rota
    const avaliacoesResult = await db.query(`
      SELECT 
        ar.nota,
        ar.comentario,
        ar.criado_em,
        u.nome_completo as responsavel_nome
      FROM avaliacoes_rotas ar
      JOIN usuarios u ON u.id = ar.responsavel_id
      WHERE ar.rota_id = $1
      ORDER BY ar.criado_em DESC
      LIMIT 5
    `, [id]);
    
    const mediaAvaliacoesResult = await db.query(`
      SELECT 
        AVG(nota) as media_avaliacoes,
        COUNT(*) as total_avaliacoes
      FROM avaliacoes_rotas 
      WHERE rota_id = $1
    `, [id]);
    
    const mediaAvaliacoes = mediaAvaliacoesResult.rows[0];
    
    // Buscar pontos de embarque/desembarque (anonimizados)
    const pontosResult = await db.query(`
      SELECT DISTINCT
        endereco_embarque,
        endereco_desembarque,
        horario_embarque,
        horario_desembarque
      FROM criancas_rotas 
      WHERE rota_id = $1 AND ativo = true
      ORDER BY horario_embarque
    `, [id]);
    
    const rotaDetalhada = {
      ...rota,
      veiculo: veiculoResult.rows[0] || null,
      avaliacoes: {
        media: mediaAvaliacoes.media_avaliacoes ? parseFloat(mediaAvaliacoes.media_avaliacoes).toFixed(1) : null,
        total: parseInt(mediaAvaliacoes.total_avaliacoes),
        comentarios: avaliacoesResult.rows
      },
      pontos_rota: pontosResult.rows,
      vagas_disponiveis: parseInt(rota.vagas_disponiveis),
      lotada: rota.capacidade_atual >= rota.capacidade_maxima
    };
    
    ctx.body = apiResponse.success(rotaDetalhada);
    
  } catch (error) {
    logger.error('Erro ao buscar detalhes da rota:', error);
    ctx.body = apiResponse.error('Erro ao buscar detalhes da rota', 500);
  }
});

// POST /api/buscar-rotas/:id/interesse - Demonstrar interesse em uma rota
router.post('/:id/interesse', 
  authenticateToken, 
  verificarResponsavel,
  validate({
    crianca_id: { required: true, type: 'number' },
    endereco_embarque: { required: true, type: 'string', minLength: 10, maxLength: 500 },
    endereco_desembarque: { required: false, type: 'string', maxLength: 500 },
    horario_preferido_embarque: { required: true, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    horario_preferido_desembarque: { required: false, type: 'string', pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    observacoes: { required: false, type: 'string', maxLength: 500 },
    telefone_contato: { required: true, type: 'string', minLength: 10, maxLength: 15 }
  }),
  async (ctx) => {
    try {
      const { id: rotaId } = ctx.params;
      const responsavelId = ctx.user.id;
      const {
        crianca_id,
        endereco_embarque,
        endereco_desembarque,
        horario_preferido_embarque,
        horario_preferido_desembarque,
        observacoes,
        telefone_contato
      } = ctx.request.body;
      
      // Verificar se a rota existe e está ativa
      const rotaResult = await db.query(`
        SELECT 
          r.id,
          r.nome_rota,
          r.capacidade_maxima,
          r.capacidade_atual,
          r.usuario_id as motorista_id,
          u.nome_completo as motorista_nome,
          u.email as motorista_email
        FROM rotas_escolares r
        JOIN usuarios u ON u.id = r.usuario_id
        WHERE r.id = $1 AND r.ativa = true AND r.status_rota = 'ativa'
      `, [rotaId]);
      
      if (rotaResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Rota não encontrada ou inativa', 404);
      }
      
      const rota = rotaResult.rows[0];
      
      // Verificar se há vagas disponíveis
      if (rota.capacidade_atual >= rota.capacidade_maxima) {
        return ctx.body = apiResponse.error('Rota lotada. Não há vagas disponíveis.', 400);
      }
      
      // Verificar se a criança pertence ao responsável
      const criancaResult = await db.query(`
        SELECT id, nome_completo 
        FROM criancas 
        WHERE id = $1 AND responsavel_id = $2
      `, [crianca_id, responsavelId]);
      
      if (criancaResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Criança não encontrada ou não pertence a você', 404);
      }
      
      const crianca = criancaResult.rows[0];
      
      // Verificar se já existe interesse para esta criança nesta rota
      const interesseExistente = await db.query(`
        SELECT id FROM interesses_rotas 
        WHERE rota_id = $1 AND crianca_id = $2 AND responsavel_id = $3 AND status IN ('pendente', 'aprovado')
      `, [rotaId, crianca_id, responsavelId]);
      
      if (interesseExistente.rows.length > 0) {
        return ctx.body = apiResponse.error('Já existe um interesse registrado para esta criança nesta rota', 400);
      }
      
      // Registrar interesse
      const result = await db.query(`
        INSERT INTO interesses_rotas (
          rota_id, crianca_id, responsavel_id, endereco_embarque, endereco_desembarque,
          horario_preferido_embarque, horario_preferido_desembarque, observacoes,
          telefone_contato, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendente'
        ) RETURNING id
      `, [
        rotaId, crianca_id, responsavelId, endereco_embarque, endereco_desembarque,
        horario_preferido_embarque, horario_preferido_desembarque, observacoes,
        telefone_contato
      ]);
      
      const interesseId = result.rows[0].id;
      
      logger.info(`Interesse registrado: Rota ${rotaId}, Criança ${crianca_id}, Responsável ${responsavelId}`);
      
      ctx.body = apiResponse.success({
        id: interesseId,
        message: `Interesse registrado com sucesso! O motorista ${rota.motorista_nome} será notificado e entrará em contato.`,
        rota_nome: rota.nome_rota,
        crianca_nome: crianca.nome_completo
      }, 201);
      
    } catch (error) {
      logger.error('Erro ao registrar interesse:', error);
      ctx.body = apiResponse.error('Erro ao registrar interesse', 500);
    }
  }
);

// GET /api/buscar-rotas/meus-interesses - Listar interesses do responsável
router.get('/meus-interesses/lista', authenticateToken, verificarResponsavel, async (ctx) => {
  try {
    const responsavelId = ctx.user.id;
    const { page = 1, limit = 10, status } = ctx.query;
    
    let whereClause = 'WHERE ir.responsavel_id = $1';
    let params = [responsavelId];
    
    if (status) {
      whereClause += ' AND ir.status = $2';
      params.push(status);
    }
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT 
        ir.*,
        r.nome_rota,
        r.escola_destino,
        r.turno,
        r.valor_mensal,
        c.nome_completo as crianca_nome,
        u.nome_completo as motorista_nome,
        u.celular as motorista_telefone
      FROM interesses_rotas ir
      JOIN rotas_escolares r ON r.id = ir.rota_id
      JOIN criancas c ON c.id = ir.crianca_id
      JOIN usuarios u ON u.id = r.usuario_id
      ${whereClause}
      ORDER BY ir.criado_em DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    const countResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM interesses_rotas ir
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    ctx.body = apiResponse.success({
      interesses: result.rows,
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
    logger.error('Erro ao buscar interesses:', error);
    ctx.body = apiResponse.error('Erro ao buscar interesses', 500);
  }
});

module.exports = router;