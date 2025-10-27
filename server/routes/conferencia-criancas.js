const Router = require('koa-router');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth-utils');
const { validate } = require('../middleware/validation');
const apiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

// Integração com sistema de notificações em tempo real
let trackingIntegration = null;

// Função para definir a integração (será chamada pelo servidor principal)
function setTrackingIntegration(integration) {
    trackingIntegration = integration;
    logger.info('[CONFERENCIA] Integração de notificações em tempo real configurada');
}

const router = new Router({
  prefix: '/api/conferencia'
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

// ==========================================
// ROTAS DE CONFERÊNCIA DE CRIANÇAS
// ==========================================

// Listar viagens ativas do motorista
router.get('/viagens-ativas', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const motoristaId = ctx.user.id;
    
    const result = await db.query(`
      SELECT 
        va.id,
        va.rota_id,
        re.nome_rota,
        re.escola_destino,
        va.tipo_viagem,
        va.data_inicio,
        va.status,
        va.total_criancas_esperadas,
        va.total_criancas_embarcadas,
        va.total_criancas_desembarcadas,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo
      FROM viagens_ativas va
      JOIN rotas_escolares re ON va.rota_id = re.id
      LEFT JOIN veiculos v ON re.usuario_id = v.usuario_id
      WHERE re.usuario_id = $1 
        AND va.status IN ('iniciada', 'em_andamento')
      ORDER BY va.data_inicio DESC
    `, [motoristaId]);

    ctx.body = apiResponse.success(result.rows, 'Viagens ativas encontradas');
  } catch (error) {
    logger.error('Erro ao buscar viagens ativas:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Iniciar nova viagem
router.post('/viagens/iniciar', 
  authenticateToken, 
  verificarMotoristaEscolar,
  validate({
    rota_id: { required: true, type: 'number' },
    tipo_viagem: { required: true, type: 'string', enum: ['ida', 'volta'] }
  }),
  async (ctx) => {
    try {
      const motoristaId = ctx.user.id;
      const { rota_id, tipo_viagem } = ctx.request.body;

      // Verificar se a rota pertence ao motorista
      const rotaResult = await db.query(`
        SELECT id, nome_rota, capacidade_maxima 
        FROM rotas_escolares 
        WHERE id = $1 AND usuario_id = $2 AND ativa = true
      `, [rota_id, motoristaId]);

      if (rotaResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Rota não encontrada ou não pertence ao motorista', 404);
      }

      // Verificar se já existe viagem ativa para esta rota
      const viagemAtivaResult = await db.query(`
        SELECT id FROM viagens_ativas 
        WHERE rota_id = $1 AND status IN ('iniciada', 'em_andamento')
      `, [rota_id]);

      if (viagemAtivaResult.rows.length > 0) {
        return ctx.body = apiResponse.error('Já existe uma viagem ativa para esta rota', 400);
      }

      // Contar crianças esperadas para esta viagem
      const criancasResult = await db.query(`
        SELECT COUNT(*) as total
        FROM criancas_rotas cr
        JOIN criancas c ON cr.crianca_id = c.id
        WHERE cr.rota_id = $1 AND cr.ativa = true AND c.ativa = true
      `, [rota_id]);

      const totalCriancasEsperadas = parseInt(criancasResult.rows[0].total);

      // Criar nova viagem ativa
      const novaViagemResult = await db.query(`
        INSERT INTO viagens_ativas (
          rota_id, tipo_viagem, status, total_criancas_esperadas,
          data_inicio, criado_em, atualizado_em
        ) VALUES ($1, $2, 'iniciada', $3, NOW(), NOW(), NOW())
        RETURNING *
      `, [rota_id, tipo_viagem, totalCriancasEsperadas]);

      const novaViagem = novaViagemResult.rows[0];

      // Criar registros de conferência para cada criança
      await db.query(`
        INSERT INTO conferencia_criancas (
          viagem_id, crianca_id, status_conferencia, criado_em, atualizado_em
        )
        SELECT $1, cr.crianca_id, 'aguardando', NOW(), NOW()
        FROM criancas_rotas cr
        JOIN criancas c ON cr.crianca_id = c.id
        WHERE cr.rota_id = $2 AND cr.ativa = true AND c.ativa = true
      `, [novaViagem.id, rota_id]);

      ctx.body = apiResponse.success(novaViagem, 'Viagem iniciada com sucesso');
    } catch (error) {
      logger.error('Erro ao iniciar viagem:', error);
      ctx.body = apiResponse.error('Erro interno do servidor', 500);
    }
  }
);

// Listar crianças para conferência em uma viagem
router.get('/viagens/:viagemId/criancas', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const { viagemId } = ctx.params;
    const motoristaId = ctx.user.id;

    // Verificar se a viagem pertence ao motorista
    const viagemResult = await db.query(`
      SELECT va.id, va.rota_id, va.tipo_viagem, va.status
      FROM viagens_ativas va
      JOIN rotas_escolares re ON va.rota_id = re.id
      WHERE va.id = $1 AND re.usuario_id = $2
    `, [viagemId, motoristaId]);

    if (viagemResult.rows.length === 0) {
      return ctx.body = apiResponse.error('Viagem não encontrada ou não pertence ao motorista', 404);
    }

    // Buscar crianças e status de conferência
    const criancasResult = await db.query(`
      SELECT 
        cc.id as conferencia_id,
        cc.crianca_id,
        c.nome_completo,
        c.idade,
        c.escola,
        c.serie_ano,
        cc.status_conferencia,
        cc.horario_embarque,
        cc.horario_desembarque,
        cc.observacoes,
        cr.endereco_embarque,
        cr.endereco_desembarque,
        cr.horario_embarque as horario_previsto_embarque,
        cr.horario_desembarque as horario_previsto_desembarque,
        r.nome_completo as responsavel_nome,
        r.celular as responsavel_celular
      FROM conferencia_criancas cc
      JOIN criancas c ON cc.crianca_id = c.id
      JOIN criancas_rotas cr ON cc.crianca_id = cr.crianca_id AND cr.rota_id = (
        SELECT rota_id FROM viagens_ativas WHERE id = $1
      )
      LEFT JOIN usuarios r ON c.responsavel_id = r.id
      WHERE cc.viagem_id = $1
      ORDER BY cr.horario_embarque, c.nome_completo
    `, [viagemId]);

    ctx.body = apiResponse.success(criancasResult.rows, 'Crianças para conferência encontradas');
  } catch (error) {
    logger.error('Erro ao buscar crianças para conferência:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Registrar embarque de criança
router.post('/embarque', 
  authenticateToken, 
  verificarMotoristaEscolar,
  validate({
    conferencia_id: { required: true, type: 'number' },
    latitude: { required: false, type: 'number' },
    longitude: { required: false, type: 'number' },
    observacoes: { required: false, type: 'string', maxLength: 500 }
  }),
  async (ctx) => {
    try {
      const motoristaId = ctx.user.id;
      const { conferencia_id, latitude, longitude, observacoes } = ctx.request.body;

      // Verificar se a conferência pertence ao motorista
      const conferenciaResult = await db.query(`
        SELECT cc.id, cc.viagem_id, cc.crianca_id, cc.status_conferencia,
               c.nome_completo, va.rota_id
        FROM conferencia_criancas cc
        JOIN viagens_ativas va ON cc.viagem_id = va.id
        JOIN rotas_escolares re ON va.rota_id = re.id
        JOIN criancas c ON cc.crianca_id = c.id
        WHERE cc.id = $1 AND re.usuario_id = $2
      `, [conferencia_id, motoristaId]);

      if (conferenciaResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Conferência não encontrada ou não pertence ao motorista', 404);
      }

      const conferencia = conferenciaResult.rows[0];

      if (conferencia.status_conferencia === 'embarcada') {
        return ctx.body = apiResponse.error('Criança já foi embarcada', 400);
      }

      // Registrar embarque
      await db.query(`
        UPDATE conferencia_criancas 
        SET status_conferencia = 'embarcada',
            horario_embarque = NOW(),
            latitude_embarque = $2,
            longitude_embarque = $3,
            observacoes = $4,
            atualizado_em = NOW()
        WHERE id = $1
      `, [conferencia_id, latitude, longitude, observacoes]);

      // Atualizar estatísticas da viagem
      await db.query(`
        UPDATE viagens_ativas 
        SET total_criancas_embarcadas = (
          SELECT COUNT(*) FROM conferencia_criancas 
          WHERE viagem_id = $1 AND status_conferencia = 'embarcada'
        ),
        atualizado_em = NOW()
        WHERE id = $1
      `, [conferencia.viagem_id]);

      // Registrar evento
      await db.query(`
        INSERT INTO eventos_viagem (viagem_id, tipo_evento, descricao, criado_em)
        VALUES ($1, 'embarque', $2, NOW())
      `, [conferencia.viagem_id, `Embarque de ${conferencia.nome_completo}`]);

      // Enviar notificação em tempo real para responsáveis
      if (trackingIntegration) {
        try {
          await trackingIntegration.processarEmbarque({
            viagem_id: conferencia.viagem_id,
            crianca_id: conferencia.crianca_id,
            timestamp: new Date(),
            latitude,
            longitude
          });
          logger.info(`[CONFERENCIA] Notificação de embarque enviada para criança ${conferencia.crianca_id}`);
        } catch (notificationError) {
          logger.error('[CONFERENCIA] Erro ao enviar notificação de embarque:', notificationError);
          // Não falhar a operação por erro de notificação
        }
      }

      ctx.body = apiResponse.success(null, 'Embarque registrado com sucesso');
    } catch (error) {
      logger.error('Erro ao registrar embarque:', error);
      ctx.body = apiResponse.error('Erro interno do servidor', 500);
    }
  }
);

// Registrar desembarque de criança
router.post('/desembarque', 
  authenticateToken, 
  verificarMotoristaEscolar,
  validate({
    conferencia_id: { required: true, type: 'number' },
    latitude: { required: false, type: 'number' },
    longitude: { required: false, type: 'number' },
    observacoes: { required: false, type: 'string', maxLength: 500 }
  }),
  async (ctx) => {
    try {
      const motoristaId = ctx.user.id;
      const { conferencia_id, latitude, longitude, observacoes } = ctx.request.body;

      // Verificar se a conferência pertence ao motorista
      const conferenciaResult = await db.query(`
        SELECT cc.id, cc.viagem_id, cc.crianca_id, cc.status_conferencia,
               c.nome_completo, va.rota_id
        FROM conferencia_criancas cc
        JOIN viagens_ativas va ON cc.viagem_id = va.id
        JOIN rotas_escolares re ON va.rota_id = re.id
        JOIN criancas c ON cc.crianca_id = c.id
        WHERE cc.id = $1 AND re.usuario_id = $2
      `, [conferencia_id, motoristaId]);

      if (conferenciaResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Conferência não encontrada ou não pertence ao motorista', 404);
      }

      const conferencia = conferenciaResult.rows[0];

      if (conferencia.status_conferencia !== 'embarcada') {
        return ctx.body = apiResponse.error('Criança deve estar embarcada para ser desembarcada', 400);
      }

      // Registrar desembarque
      await db.query(`
        UPDATE conferencia_criancas 
        SET status_conferencia = 'desembarcada',
            horario_desembarque = NOW(),
            latitude_desembarque = $2,
            longitude_desembarque = $3,
            observacoes = COALESCE(observacoes, '') || CASE WHEN observacoes IS NOT NULL THEN ' | ' ELSE '' END || $4,
            atualizado_em = NOW()
        WHERE id = $1
      `, [conferencia_id, latitude, longitude, observacoes || '']);

      // Atualizar estatísticas da viagem
      await db.query(`
        UPDATE viagens_ativas 
        SET total_criancas_desembarcadas = (
          SELECT COUNT(*) FROM conferencia_criancas 
          WHERE viagem_id = $1 AND status_conferencia = 'desembarcada'
        ),
        atualizado_em = NOW()
        WHERE id = $1
      `, [conferencia.viagem_id]);

      // Registrar evento
      await db.query(`
        INSERT INTO eventos_viagem (viagem_id, tipo_evento, descricao, criado_em)
        VALUES ($1, 'desembarque', $2, NOW())
      `, [conferencia.viagem_id, `Desembarque de ${conferencia.nome_completo}`]);

      // Enviar notificação em tempo real para responsáveis
      if (trackingIntegration) {
        try {
          await trackingIntegration.processarDesembarque({
            viagem_id: conferencia.viagem_id,
            crianca_id: conferencia.crianca_id,
            timestamp: new Date(),
            latitude,
            longitude
          });
          logger.info(`[CONFERENCIA] Notificação de desembarque enviada para criança ${conferencia.crianca_id}`);
        } catch (notificationError) {
          logger.error('[CONFERENCIA] Erro ao enviar notificação de desembarque:', notificationError);
          // Não falhar a operação por erro de notificação
        }
      }

      ctx.body = apiResponse.success(null, 'Desembarque registrado com sucesso');
    } catch (error) {
      logger.error('Erro ao registrar desembarque:', error);
      ctx.body = apiResponse.error('Erro interno do servidor', 500);
    }
  }
);

// Finalizar viagem
router.put('/viagens/:viagemId/finalizar', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const { viagemId } = ctx.params;
    const motoristaId = ctx.user.id;

    // Verificar se a viagem pertence ao motorista
    const viagemResult = await db.query(`
      SELECT va.id, va.rota_id, va.status, va.total_criancas_esperadas,
             va.total_criancas_embarcadas, va.total_criancas_desembarcadas
      FROM viagens_ativas va
      JOIN rotas_escolares re ON va.rota_id = re.id
      WHERE va.id = $1 AND re.usuario_id = $2
    `, [viagemId, motoristaId]);

    if (viagemResult.rows.length === 0) {
      return ctx.body = apiResponse.error('Viagem não encontrada ou não pertence ao motorista', 404);
    }

    const viagem = viagemResult.rows[0];

    if (viagem.status === 'finalizada') {
      return ctx.body = apiResponse.error('Viagem já foi finalizada', 400);
    }

    // Finalizar viagem
    await db.query(`
      UPDATE viagens_ativas 
      SET status = 'finalizada',
          data_fim = NOW(),
          atualizado_em = NOW()
      WHERE id = $1
    `, [viagemId]);

    // Registrar evento
    await db.query(`
      INSERT INTO eventos_viagem (viagem_id, tipo_evento, descricao, criado_em)
      VALUES ($1, 'finalizacao', 'Viagem finalizada pelo motorista', NOW())
    `, [viagemId]);

    ctx.body = apiResponse.success(null, 'Viagem finalizada com sucesso');
  } catch (error) {
    logger.error('Erro ao finalizar viagem:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Obter estatísticas da viagem
router.get('/viagens/:viagemId/estatisticas', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const { viagemId } = ctx.params;
    const motoristaId = ctx.user.id;

    // Verificar se a viagem pertence ao motorista
    const viagemResult = await db.query(`
      SELECT va.*, re.nome_rota, re.escola_destino
      FROM viagens_ativas va
      JOIN rotas_escolares re ON va.rota_id = re.id
      WHERE va.id = $1 AND re.usuario_id = $2
    `, [viagemId, motoristaId]);

    if (viagemResult.rows.length === 0) {
      return ctx.body = apiResponse.error('Viagem não encontrada ou não pertence ao motorista', 404);
    }

    const viagem = viagemResult.rows[0];

    // Buscar estatísticas detalhadas
    const estatisticasResult = await db.query(`
      SELECT 
        COUNT(*) as total_criancas,
        COUNT(CASE WHEN status_conferencia = 'embarcada' THEN 1 END) as embarcadas,
        COUNT(CASE WHEN status_conferencia = 'desembarcada' THEN 1 END) as desembarcadas,
        COUNT(CASE WHEN status_conferencia = 'aguardando' THEN 1 END) as aguardando,
        COUNT(CASE WHEN status_conferencia = 'ausente' THEN 1 END) as ausentes
      FROM conferencia_criancas
      WHERE viagem_id = $1
    `, [viagemId]);

    const estatisticas = estatisticasResult.rows[0];

    ctx.body = apiResponse.success({
      viagem,
      estatisticas
    }, 'Estatísticas da viagem obtidas com sucesso');
  } catch (error) {
    logger.error('Erro ao obter estatísticas da viagem:', error);
    ctx.body = apiResponse.error('Erro interno do servidor', 500);
  }
});

// Exportar função para configuração da integração
router.setTrackingIntegration = setTrackingIntegration;

module.exports = router;