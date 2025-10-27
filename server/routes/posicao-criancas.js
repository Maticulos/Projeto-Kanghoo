const Router = require('koa-router');
const db = require('../config/db');
const logger = require('../utils/logger');
const { apiResponse } = require('../utils/api-response');
const { authenticateToken, verificarResponsavel } = require('../middleware/auth-utils');

const router = new Router({ prefix: '/api/criancas' });

// GET /api/criancas/posicao-atual - Obter posição atual das crianças do responsável
router.get('/posicao-atual', authenticateToken, verificarResponsavel, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    // Buscar crianças do responsável e suas posições atuais
    const result = await db.query(`
      SELECT 
        c.id as crianca_id,
        c.nome as crianca_nome,
        c.escola,
        c.turno,
        re.id as rota_id,
        re.nome_rota,
        re.status_rota,
        u_motorista.nome as motorista_nome,
        u_motorista.telefone as motorista_telefone,
        rg.latitude,
        rg.longitude,
        rg.velocidade,
        rg.direcao,
        rg.timestamp as ultima_atualizacao,
        CASE 
          WHEN rg.timestamp > NOW() - INTERVAL '5 minutes' THEN 'online'
          WHEN rg.timestamp > NOW() - INTERVAL '30 minutes' THEN 'recente'
          ELSE 'offline'
        END as status_gps,
        cr.endereco_embarque,
        cr.endereco_desembarque,
        cr.horario_embarque,
        cr.horario_desembarque,
        cr.status_embarque,
        cr.status_desembarque
      FROM criancas c
      LEFT JOIN criancas_rotas cr ON c.id = cr.crianca_id AND cr.ativo = true
      LEFT JOIN rotas_escolares re ON cr.rota_id = re.id AND re.ativa = true
      LEFT JOIN usuarios u_motorista ON re.usuario_id = u_motorista.id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, velocidade, direcao, timestamp
        FROM rastreamento_gps 
        WHERE usuario_id = re.usuario_id 
        ORDER BY timestamp DESC 
        LIMIT 1
      ) rg ON true
      WHERE c.responsavel_id = $1 AND c.ativo = true
      ORDER BY c.nome
    `, [userId]);
    
    // Agrupar dados por criança
    const criancasComPosicao = result.rows.map(row => ({
      crianca: {
        id: row.crianca_id,
        nome: row.crianca_nome,
        escola: row.escola,
        turno: row.turno
      },
      rota: row.rota_id ? {
        id: row.rota_id,
        nome: row.nome_rota,
        status: row.status_rota,
        motorista: {
          nome: row.motorista_nome,
          telefone: row.motorista_telefone
        }
      } : null,
      posicao_atual: row.latitude && row.longitude ? {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        velocidade: row.velocidade ? parseFloat(row.velocidade) : 0,
        direcao: row.direcao ? parseFloat(row.direcao) : 0,
        ultima_atualizacao: row.ultima_atualizacao,
        status_gps: row.status_gps
      } : null,
      embarque_desembarque: row.endereco_embarque ? {
        endereco_embarque: row.endereco_embarque,
        endereco_desembarque: row.endereco_desembarque,
        horario_embarque: row.horario_embarque,
        horario_desembarque: row.horario_desembarque,
        status_embarque: row.status_embarque,
        status_desembarque: row.status_desembarque
      } : null
    }));
    
    // Estatísticas gerais
    const estatisticas = {
      total_criancas: criancasComPosicao.length,
      com_rota_ativa: criancasComPosicao.filter(c => c.rota && c.rota.status === 'ativa').length,
      com_gps_online: criancasComPosicao.filter(c => c.posicao_atual && c.posicao_atual.status_gps === 'online').length,
      sem_rastreamento: criancasComPosicao.filter(c => !c.posicao_atual).length
    };
    
    ctx.body = apiResponse.success({
      criancas: criancasComPosicao,
      estatisticas
    }, 'Posições atuais obtidas com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter posição atual das crianças:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// GET /api/criancas/:id/historico-rastreamento - Histórico de rastreamento de uma criança
router.get('/:id/historico-rastreamento', authenticateToken, verificarResponsavel, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const criancaId = ctx.params.id;
    const { data_inicio, data_fim, page = 1, limit = 50 } = ctx.query;
    
    // Verificar se a criança pertence ao responsável
    const criancaResult = await db.query(
      'SELECT id FROM criancas WHERE id = $1 AND responsavel_id = $2',
      [criancaId, userId]
    );
    
    if (!criancaResult.rows.length) {
      return ctx.body = apiResponse.error('Criança não encontrada ou não autorizada', 404);
    }
    
    // Verificar se o responsável tem permissão para histórico (plano premium)
    const assinaturaResult = await db.query(`
      SELECT pa.tipo_plano 
      FROM planos_assinatura pa 
      WHERE pa.usuario_id = $1 AND pa.ativo = true
    `, [userId]);
    
    if (!assinaturaResult.rows.length || assinaturaResult.rows[0].tipo_plano !== 'premium') {
      return ctx.body = apiResponse.error('Acesso negado. Permissão insuficiente.', 403);
    }
    
    let whereClause = `
      WHERE c.id = $1 AND c.responsavel_id = $2 
      AND rg.timestamp IS NOT NULL
    `;
    const params = [criancaId, userId];
    
    if (data_inicio) {
      params.push(data_inicio);
      whereClause += ` AND rg.timestamp >= $${params.length}`;
    }
    
    if (data_fim) {
      params.push(data_fim);
      whereClause += ` AND rg.timestamp <= $${params.length}`;
    }
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT 
        rg.latitude,
        rg.longitude,
        rg.velocidade,
        rg.direcao,
        rg.timestamp,
        re.nome_rota,
        u_motorista.nome as motorista_nome
      FROM criancas c
      JOIN criancas_rotas cr ON c.id = cr.crianca_id AND cr.ativo = true
      JOIN rotas_escolares re ON cr.rota_id = re.id
      JOIN usuarios u_motorista ON re.usuario_id = u_motorista.id
      JOIN rastreamento_gps rg ON u_motorista.id = rg.usuario_id
      ${whereClause}
      ORDER BY rg.timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    ctx.body = apiResponse.success(result.rows, 'Histórico de rastreamento obtido com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter histórico de rastreamento:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// GET /api/criancas/relatorios-viagem - Relatórios de viagem das crianças
router.get('/relatorios-viagem', authenticateToken, verificarResponsavel, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { crianca_id, data_inicio, data_fim, page = 1, limit = 20 } = ctx.query;
    
    let whereClause = 'WHERE c.responsavel_id = $1';
    const params = [userId];
    
    if (crianca_id) {
      params.push(crianca_id);
      whereClause += ` AND c.id = $${params.length}`;
    }
    
    if (data_inicio) {
      params.push(data_inicio);
      whereClause += ` AND v.data_viagem >= $${params.length}`;
    }
    
    if (data_fim) {
      params.push(data_fim);
      whereClause += ` AND v.data_viagem <= $${params.length}`;
    }
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT 
        v.id as viagem_id,
        v.data_viagem,
        v.horario_inicio,
        v.horario_fim,
        v.quilometragem_inicial,
        v.quilometragem_final,
        v.status_viagem,
        c.id as crianca_id,
        c.nome as crianca_nome,
        re.nome_rota,
        u_motorista.nome as motorista_nome,
        cc.horario_embarque_real,
        cc.horario_desembarque_real,
        cc.endereco_embarque,
        cc.endereco_desembarque
      FROM criancas c
      JOIN criancas_rotas cr ON c.id = cr.crianca_id AND cr.ativo = true
      JOIN rotas_escolares re ON cr.rota_id = re.id
      JOIN usuarios u_motorista ON re.usuario_id = u_motorista.id
      LEFT JOIN viagens v ON re.id = v.rota_id
      LEFT JOIN conferencia_criancas cc ON v.id = cc.viagem_id AND c.id = cc.crianca_id
      ${whereClause}
      ORDER BY v.data_viagem DESC, v.horario_inicio DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    ctx.body = apiResponse.success(result.rows, 'Relatórios de viagem obtidos com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter relatórios de viagem:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// POST /api/criancas/geofencing - Configurar geofencing para uma criança
router.post('/geofencing', 
  authenticateToken, 
  verificarResponsavel,
  async (ctx) => {
    try {
      const userId = ctx.state.user.id;
      const { 
        crianca_id, 
        nome_zona, 
        latitude, 
        longitude, 
        raio_metros, 
        tipo_alerta 
      } = ctx.request.body;
      
      // Verificar se a criança pertence ao responsável
      const criancaResult = await db.query(
        'SELECT id FROM criancas WHERE id = $1 AND responsavel_id = $2',
        [crianca_id, userId]
      );
      
      if (!criancaResult.rows.length) {
        return ctx.body = apiResponse.error('Criança não encontrada ou não autorizada', 404);
      }
      
      const result = await db.query(`
        INSERT INTO geofencing_zonas (
          crianca_id, nome_zona, latitude, longitude, 
          raio_metros, tipo_alerta, ativo, criado_em
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
        RETURNING *
      `, [crianca_id, nome_zona, latitude, longitude, raio_metros, tipo_alerta]);
      
      ctx.body = apiResponse.success(result.rows[0], 'Zona de geofencing criada com sucesso', 201);
      
    } catch (error) {
      logger.error('Erro ao configurar geofencing:', error);
      ctx.body = apiResponse.error('Erro interno do servidor', 500);
    }
  }
);

module.exports = router;