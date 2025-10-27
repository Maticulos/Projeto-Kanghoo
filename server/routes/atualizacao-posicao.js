const Router = require('koa-router');
const db = require('../config/db');
const logger = require('../utils/logger');
const { apiResponse } = require('../utils/api-response');
const { authenticateToken, verificarMotorista } = require('../middleware/auth-utils');

const router = new Router({ prefix: '/api/gps' });

// POST /api/gps/atualizar-posicao - Atualizar posição GPS do motorista
router.post('/atualizar-posicao', authenticateToken, verificarMotorista, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { latitude, longitude, velocidade, direcao, timestamp } = ctx.request.body;
    
    // Validar dados obrigatórios
    if (!latitude || !longitude) {
      return ctx.body = apiResponse.error('Latitude e longitude são obrigatórias', 400);
    }
    
    // Validar formato dos dados
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const vel = velocidade ? parseFloat(velocidade) : 0;
    const dir = direcao ? parseFloat(direcao) : 0;
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return ctx.body = apiResponse.error('Coordenadas inválidas', 400);
    }
    
    // Usar timestamp fornecido ou atual
    const positionTimestamp = timestamp ? new Date(timestamp) : new Date();
    
    // Inserir nova posição GPS
    const result = await db.query(`
      INSERT INTO rastreamento_gps (
        usuario_id, latitude, longitude, velocidade, direcao, timestamp, criado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [userId, lat, lng, vel, dir, positionTimestamp]);
    
    // Atualizar última posição conhecida do motorista
    await db.query(`
      UPDATE usuarios 
      SET ultima_latitude = $1, ultima_longitude = $2, ultima_atualizacao_gps = $3
      WHERE id = $4
    `, [lat, lng, positionTimestamp, userId]);
    
    // Verificar se há rotas ativas para este motorista
    const rotaAtiva = await db.query(`
      SELECT id, nome_rota, status_rota 
      FROM rotas_escolares 
      WHERE usuario_id = $1 AND ativa = true AND status_rota = 'ativa'
      LIMIT 1
    `, [userId]);
    
    let alertas = [];
    
    if (rotaAtiva.rows.length > 0) {
      // Verificar geofencing para crianças da rota
      const criancasRota = await db.query(`
        SELECT DISTINCT c.id, c.nome, gz.* 
        FROM criancas c
        JOIN criancas_rotas cr ON c.id = cr.crianca_id AND cr.ativo = true
        JOIN geofencing_zonas gz ON c.id = gz.crianca_id AND gz.ativo = true
        WHERE cr.rota_id = $1
      `, [rotaAtiva.rows[0].id]);
      
      // Verificar se o motorista está dentro de alguma zona de geofencing
      for (const crianca of criancasRota.rows) {
        const distancia = calcularDistancia(lat, lng, crianca.latitude, crianca.longitude);
        
        if (distancia <= crianca.raio_metros) {
          alertas.push({
            tipo: 'geofencing',
            crianca_id: crianca.crianca_id,
            crianca_nome: crianca.nome,
            zona_nome: crianca.nome_zona,
            tipo_alerta: crianca.tipo_alerta,
            distancia: Math.round(distancia)
          });
          
          // Registrar evento de geofencing
          await db.query(`
            INSERT INTO eventos_geofencing (
              zona_id, usuario_id, tipo_evento, timestamp, criado_em
            ) VALUES ($1, $2, 'entrada', $3, NOW())
          `, [crianca.id, userId, positionTimestamp]);
        }
      }
    }
    
    ctx.body = apiResponse.success({
      posicao: result.rows[0],
      rota_ativa: rotaAtiva.rows[0] || null,
      alertas
    }, 'Posição GPS atualizada com sucesso');
    
  } catch (error) {
    logger.error('Erro ao atualizar posição GPS:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// GET /api/gps/posicao-atual - Obter posição atual do motorista
router.get('/posicao-atual', authenticateToken, verificarMotorista, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    const result = await db.query(`
      SELECT 
        rg.*,
        CASE 
          WHEN rg.timestamp > NOW() - INTERVAL '5 minutes' THEN 'online'
          WHEN rg.timestamp > NOW() - INTERVAL '30 minutes' THEN 'recente'
          ELSE 'offline'
        END as status_gps
      FROM rastreamento_gps rg
      WHERE rg.usuario_id = $1
      ORDER BY rg.timestamp DESC
      LIMIT 1
    `, [userId]);
    
    if (!result.rows.length) {
      return ctx.body = apiResponse.error('Nenhuma posição GPS encontrada', 404);
    }
    
    ctx.body = apiResponse.success(result.rows[0], 'Posição atual obtida com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter posição atual:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// GET /api/gps/historico - Obter histórico de posições GPS
router.get('/historico', authenticateToken, verificarMotorista, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { data_inicio, data_fim, page = 1, limit = 100 } = ctx.query;
    
    let whereClause = 'WHERE usuario_id = $1';
    const params = [userId];
    
    if (data_inicio) {
      params.push(data_inicio);
      whereClause += ` AND timestamp >= $${params.length}`;
    }
    
    if (data_fim) {
      params.push(data_fim);
      whereClause += ` AND timestamp <= $${params.length}`;
    }
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT * FROM rastreamento_gps
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
    
    ctx.body = apiResponse.success(result.rows, 'Histórico de posições obtido com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter histórico de posições:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// POST /api/gps/batch-update - Atualização em lote de posições GPS
router.post('/batch-update', authenticateToken, verificarMotorista, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { posicoes } = ctx.request.body;
    
    if (!Array.isArray(posicoes) || posicoes.length === 0) {
      return ctx.body = apiResponse.error('Array de posições é obrigatório', 400);
    }
    
    if (posicoes.length > 100) {
      return ctx.body = apiResponse.error('Máximo de 100 posições por lote', 400);
    }
    
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const insertedPositions = [];
      
      for (const posicao of posicoes) {
        const { latitude, longitude, velocidade, direcao, timestamp } = posicao;
        
        if (!latitude || !longitude) {
          continue; // Pular posições inválidas
        }
        
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const vel = velocidade ? parseFloat(velocidade) : 0;
        const dir = direcao ? parseFloat(direcao) : 0;
        const positionTimestamp = timestamp ? new Date(timestamp) : new Date();
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          continue; // Pular coordenadas inválidas
        }
        
        const result = await client.query(`
          INSERT INTO rastreamento_gps (
            usuario_id, latitude, longitude, velocidade, direcao, timestamp, criado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `, [userId, lat, lng, vel, dir, positionTimestamp]);
        
        insertedPositions.push(result.rows[0]);
      }
      
      // Atualizar última posição conhecida com a mais recente
      if (insertedPositions.length > 0) {
        const ultimaPosicao = insertedPositions[insertedPositions.length - 1];
        await client.query(`
          UPDATE usuarios 
          SET ultima_latitude = $1, ultima_longitude = $2, ultima_atualizacao_gps = $3
          WHERE id = $4
        `, [ultimaPosicao.latitude, ultimaPosicao.longitude, ultimaPosicao.timestamp, userId]);
      }
      
      await client.query('COMMIT');
      
      ctx.body = apiResponse.success({
        posicoes_inseridas: insertedPositions.length,
        posicoes_enviadas: posicoes.length,
        posicoes: insertedPositions
      }, 'Posições GPS atualizadas em lote com sucesso');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Erro ao atualizar posições GPS em lote:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Função auxiliar para calcular distância entre dois pontos (fórmula de Haversine)
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;