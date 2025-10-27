const Router = require('koa-router');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth-utils');
const { validate } = require('../middleware/validation');
const apiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/rastreamento-gps'
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
// ROTAS DE RASTREAMENTO GPS
// ==========================================

// Enviar posição GPS (motorista)
router.post('/posicao', 
  authenticateToken, 
  verificarMotoristaEscolar,
  validate({
    viagem_id: { required: true, type: 'number' },
    latitude: { required: true, type: 'number', min: -90, max: 90 },
    longitude: { required: true, type: 'number', min: -180, max: 180 },
    velocidade: { required: false, type: 'number', min: 0 },
    direcao: { required: false, type: 'number', min: 0, max: 360 },
    precisao: { required: false, type: 'number', min: 0 }
  }),
  async (ctx) => {
    try {
      const motoristaId = ctx.user.id;
      const { viagem_id, latitude, longitude, velocidade, direcao, precisao } = ctx.request.body;

      // Verificar se a viagem pertence ao motorista e está ativa
      const viagemResult = await db.query(`
        SELECT va.id, va.rota_id, va.status
        FROM viagens_ativas va
        JOIN rotas_escolares re ON va.rota_id = re.id
        WHERE va.id = $1 AND re.usuario_id = $2 AND va.status IN ('iniciada', 'em_andamento')
      `, [viagem_id, motoristaId]);

      if (viagemResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Viagem não encontrada, não pertence ao motorista ou não está ativa', 404);
      }

      // Inserir posição GPS
      const posicaoResult = await db.query(`
        INSERT INTO rastreamento_gps (
          viagem_id, latitude, longitude, velocidade, direcao, precisao, timestamp_gps, criado_em
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [viagem_id, latitude, longitude, velocidade, direcao, precisao]);

      const posicao = posicaoResult.rows[0];

      // Atualizar status da viagem para 'em_andamento' se ainda estiver 'iniciada'
      await db.query(`
        UPDATE viagens_ativas 
        SET status = 'em_andamento', atualizado_em = NOW()
        WHERE id = $1 AND status = 'iniciada'
      `, [viagem_id]);

      // Verificar se está próximo de alguma parada
      const paradasResult = await db.query(`
        SELECT pr.*, 
               ST_Distance(
                 ST_Point($2, $1)::geography,
                 ST_Point(pr.longitude, pr.latitude)::geography
               ) as distancia
        FROM paradas_rota pr
        WHERE pr.rota_id = (SELECT rota_id FROM viagens_ativas WHERE id = $3)
          AND pr.ativa = true
        ORDER BY distancia
        LIMIT 1
      `, [latitude, longitude, viagem_id]);

      let paradaProxima = null;
      if (paradasResult.rows.length > 0) {
        const parada = paradasResult.rows[0];
        // Se estiver a menos de 100 metros da parada
        if (parada.distancia <= 100) {
          paradaProxima = parada;
          
          // Registrar evento de aproximação da parada
          await db.query(`
            INSERT INTO eventos_viagem (viagem_id, tipo_evento, descricao, latitude, longitude, criado_em)
            VALUES ($1, 'aproximacao_parada', $2, $3, $4, NOW())
          `, [viagem_id, `Aproximação da parada: ${parada.nome}`, latitude, longitude]);
        }
      }

      ctx.body = apiResponse.success({
        posicao,
        parada_proxima: paradaProxima
      }, 'Posição GPS registrada com sucesso');
    } catch (error) {
      logger.error('Erro ao registrar posição GPS:', error);
      ctx.body = apiResponse.error('Erro interno do servidor', 500);
    }
  }
);

// Obter posição atual de uma viagem (responsável)
router.get('/viagem/:viagemId/posicao-atual', authenticateToken, async (ctx) => {
  try {
    const { viagemId } = ctx.params;
    const usuarioId = ctx.user.id;
    const tipoUsuario = ctx.user.tipo;

    let whereClause = '';
    let params = [viagemId];

    // Verificar permissões baseadas no tipo de usuário
    if (tipoUsuario === 'responsavel') {
      // Responsável só pode ver viagens de suas crianças
      whereClause = `
        AND EXISTS (
          SELECT 1 FROM conferencia_criancas cc
          JOIN criancas c ON cc.crianca_id = c.id
          WHERE cc.viagem_id = va.id AND c.responsavel_id = $2
        )
      `;
      params.push(usuarioId);
    } else if (tipoUsuario === 'motorista_escolar') {
      // Motorista só pode ver suas próprias viagens
      whereClause = `AND re.usuario_id = $2`;
      params.push(usuarioId);
    } else {
      return ctx.body = apiResponse.error('Tipo de usuário não autorizado', 403);
    }

    // Buscar informações da viagem e posição atual
    const result = await db.query(`
      SELECT 
        va.id as viagem_id,
        va.tipo_viagem,
        va.status,
        re.nome_rota,
        re.escola_destino,
        u.nome_completo as motorista_nome,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        rg.latitude,
        rg.longitude,
        rg.velocidade,
        rg.direcao,
        rg.timestamp_gps,
        rg.precisao
      FROM viagens_ativas va
      JOIN rotas_escolares re ON va.rota_id = re.id
      JOIN usuarios u ON re.usuario_id = u.id
      LEFT JOIN veiculos v ON re.usuario_id = v.usuario_id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, velocidade, direcao, timestamp_gps, precisao
        FROM rastreamento_gps 
        WHERE viagem_id = va.id 
        ORDER BY timestamp_gps DESC 
        LIMIT 1
      ) rg ON true
      WHERE va.id = $1 ${whereClause}
    `, params);

    if (result.rows.length === 0) {
      return ctx.body = apiResponse.error('Viagem não encontrada ou sem permissão de acesso', 404);
    }

    const viagem = result.rows[0];

    // Se não há posição GPS, retornar apenas informações da viagem
    if (!viagem.latitude) {
      ctx.body = apiResponse.success({
        viagem: {
          viagem_id: viagem.viagem_id,
          tipo_viagem: viagem.tipo_viagem,
          status: viagem.status,
          nome_rota: viagem.nome_rota,
          escola_destino: viagem.escola_destino,
          motorista_nome: viagem.motorista_nome,
          veiculo_placa: viagem.veiculo_placa,
          veiculo_modelo: viagem.veiculo_modelo
        },
        posicao: null
      }, 'Informações da viagem obtidas (sem posição GPS disponível)');
      return;
    }

    ctx.body = apiResponse.success({
      viagem: {
        viagem_id: viagem.viagem_id,
        tipo_viagem: viagem.tipo_viagem,
        status: viagem.status,
        nome_rota: viagem.nome_rota,
        escola_destino: viagem.escola_destino,
        motorista_nome: viagem.motorista_nome,
        veiculo_placa: viagem.veiculo_placa,
        veiculo_modelo: viagem.veiculo_modelo
      },
      posicao: {
        latitude: viagem.latitude,
        longitude: viagem.longitude,
        velocidade: viagem.velocidade,
        direcao: viagem.direcao,
        timestamp: viagem.timestamp_gps,
        precisao: viagem.precisao
      }
    }, 'Posição atual obtida com sucesso');
  } catch (error) {
    logger.error('Erro ao obter posição atual:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Obter histórico de posições de uma viagem
router.get('/viagem/:viagemId/historico', authenticateToken, async (ctx) => {
  try {
    const { viagemId } = ctx.params;
    const usuarioId = ctx.user.id;
    const tipoUsuario = ctx.user.tipo;

    // Parâmetros de paginação
    const page = parseInt(ctx.query.page) || 1;
    const limit = Math.min(parseInt(ctx.query.limit) || 50, 100);
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [viagemId, limit, offset];

    // Verificar permissões baseadas no tipo de usuário
    if (tipoUsuario === 'responsavel') {
      whereClause = `
        AND EXISTS (
          SELECT 1 FROM conferencia_criancas cc
          JOIN criancas c ON cc.crianca_id = c.id
          WHERE cc.viagem_id = va.id AND c.responsavel_id = $4
        )
      `;
      params.push(usuarioId);
    } else if (tipoUsuario === 'motorista_escolar') {
      whereClause = `AND re.usuario_id = $4`;
      params.push(usuarioId);
    } else {
      return ctx.body = apiResponse.error('Tipo de usuário não autorizado', 403);
    }

    // Buscar histórico de posições
    const result = await db.query(`
      SELECT 
        rg.id,
        rg.latitude,
        rg.longitude,
        rg.velocidade,
        rg.direcao,
        rg.timestamp_gps,
        rg.precisao
      FROM rastreamento_gps rg
      JOIN viagens_ativas va ON rg.viagem_id = va.id
      JOIN rotas_escolares re ON va.rota_id = re.id
      WHERE rg.viagem_id = $1 ${whereClause}
      ORDER BY rg.timestamp_gps DESC
      LIMIT $2 OFFSET $3
    `, params);

    // Contar total de registros
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM rastreamento_gps rg
      JOIN viagens_ativas va ON rg.viagem_id = va.id
      JOIN rotas_escolares re ON va.rota_id = re.id
      WHERE rg.viagem_id = $1 ${whereClause}
    `, [viagemId, ...(params.length > 3 ? [params[3]] : [])]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    ctx.body = apiResponse.success({
      posicoes: result.rows,
      paginacao: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Histórico de posições obtido com sucesso');
  } catch (error) {
    logger.error('Erro ao obter histórico de posições:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Listar viagens ativas para responsável
router.get('/minhas-viagens', authenticateToken, verificarResponsavel, async (ctx) => {
  try {
    const responsavelId = ctx.user.id;

    const result = await db.query(`
      SELECT DISTINCT
        va.id as viagem_id,
        va.tipo_viagem,
        va.status,
        va.data_inicio,
        re.nome_rota,
        re.escola_destino,
        u.nome_completo as motorista_nome,
        u.celular as motorista_celular,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        COUNT(cc.id) as total_criancas_minhas
      FROM viagens_ativas va
      JOIN rotas_escolares re ON va.rota_id = re.id
      JOIN usuarios u ON re.usuario_id = u.id
      LEFT JOIN veiculos v ON re.usuario_id = v.usuario_id
      JOIN conferencia_criancas cc ON va.id = cc.viagem_id
      JOIN criancas c ON cc.crianca_id = c.id
      WHERE c.responsavel_id = $1 
        AND va.status IN ('iniciada', 'em_andamento')
      GROUP BY va.id, va.tipo_viagem, va.status, va.data_inicio, 
               re.nome_rota, re.escola_destino, u.nome_completo, 
               u.celular, v.placa, v.modelo
      ORDER BY va.data_inicio DESC
    `, [responsavelId]);

    ctx.body = apiResponse.success(result.rows, 'Viagens ativas encontradas');
  } catch (error) {
    logger.error('Erro ao buscar viagens do responsável:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Obter paradas da rota
router.get('/rota/:rotaId/paradas', authenticateToken, async (ctx) => {
  try {
    const { rotaId } = ctx.params;
    const usuarioId = ctx.user.id;
    const tipoUsuario = ctx.user.tipo;

    let whereClause = '';
    let params = [rotaId];

    // Verificar permissões
    if (tipoUsuario === 'responsavel') {
      whereClause = `
        AND EXISTS (
          SELECT 1 FROM criancas_rotas cr
          JOIN criancas c ON cr.crianca_id = c.id
          WHERE cr.rota_id = re.id AND c.responsavel_id = $2
        )
      `;
      params.push(usuarioId);
    } else if (tipoUsuario === 'motorista_escolar') {
      whereClause = `AND re.usuario_id = $2`;
      params.push(usuarioId);
    } else {
      return ctx.body = apiResponse.error('Tipo de usuário não autorizado', 403);
    }

    // Buscar paradas da rota
    const result = await db.query(`
      SELECT 
        pr.id,
        pr.nome,
        pr.endereco,
        pr.latitude,
        pr.longitude,
        pr.ordem,
        pr.tempo_estimado_parada,
        pr.observacoes
      FROM paradas_rota pr
      JOIN rotas_escolares re ON pr.rota_id = re.id
      WHERE pr.rota_id = $1 AND pr.ativa = true ${whereClause}
      ORDER BY pr.ordem
    `, params);

    ctx.body = apiResponse.success(result.rows, 'Paradas da rota obtidas com sucesso');
  } catch (error) {
    logger.error('Erro ao obter paradas da rota:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

module.exports = router;