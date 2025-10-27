const Router = require('koa-router');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth-utils');
const { validate } = require('../middleware/validation');
const apiResponse = require('../utils/api-response');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/planos-assinatura'
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
// ENDPOINTS DE PLANOS DE ASSINATURA
// ==========================================

// GET /api/planos-assinatura/tipos - Listar tipos de planos disponíveis
router.get('/tipos', async (ctx) => {
  try {
    const tiposPlanos = [
      {
        tipo: 'basico',
        nome: 'Plano Básico',
        descricao: 'Ideal para motoristas iniciantes',
        limite_rotas: 3,
        limite_usuarios: 15,
        preco_mensal: 0,
        recursos: [
          'Até 3 rotas ativas',
          'Até 15 crianças cadastradas',
          'Gestão básica de rotas',
          'Suporte por email'
        ],
        popular: false
      },
      {
        tipo: 'premium',
        nome: 'Plano Premium',
        descricao: 'Para motoristas profissionais',
        limite_rotas: 10,
        limite_usuarios: 50,
        preco_mensal: 29.90,
        recursos: [
          'Até 10 rotas ativas',
          'Até 50 crianças cadastradas',
          'Gestão avançada de rotas',
          'Relatórios detalhados',
          'Suporte prioritário',
          'Notificações em tempo real'
        ],
        popular: true
      },
      {
        tipo: 'empresarial',
        nome: 'Plano Empresarial',
        descricao: 'Para empresas de transporte escolar',
        limite_rotas: -1, // Ilimitado
        limite_usuarios: -1, // Ilimitado
        preco_mensal: 99.90,
        recursos: [
          'Rotas ilimitadas',
          'Usuários ilimitados',
          'Gestão multi-motorista',
          'Dashboard executivo',
          'API personalizada',
          'Suporte 24/7',
          'Treinamento incluído'
        ],
        popular: false
      }
    ];
    
    ctx.body = apiResponse.success(tiposPlanos);
    
  } catch (error) {
    logger.error('Erro ao buscar tipos de planos:', error);
    ctx.body = apiResponse.error('Erro ao buscar tipos de planos', 500);
  }
});

// GET /api/planos-assinatura/meu-plano - Buscar plano atual do usuário
router.get('/meu-plano', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const usuarioId = ctx.user.id;
    
    const result = await db.query(`
      SELECT 
        id,
        tipo_plano,
        limite_rotas,
        limite_usuarios,
        preco_mensal,
        data_inicio,
        data_fim,
        ativo,
        criado_em,
        atualizado_em
      FROM planos_assinatura 
      WHERE usuario_id = $1 AND ativo = true
      ORDER BY criado_em DESC 
      LIMIT 1
    `, [usuarioId]);
    
    if (result.rows.length === 0) {
      return ctx.body = apiResponse.error('Nenhum plano ativo encontrado', 404);
    }
    
    const plano = result.rows[0];
    
    // Buscar estatísticas de uso
    const usoResult = await db.query(`
      SELECT 
        COUNT(CASE WHEN ativa = true THEN 1 END) as rotas_ativas,
        COUNT(*) as total_rotas
      FROM rotas_escolares 
      WHERE usuario_id = $1
    `, [usuarioId]);
    
    const criancasResult = await db.query(`
      SELECT COUNT(DISTINCT cr.crianca_id) as total_criancas
      FROM criancas_rotas cr
      JOIN rotas_escolares r ON r.id = cr.rota_id
      WHERE r.usuario_id = $1 AND cr.ativo = true
    `, [usuarioId]);
    
    const uso = usoResult.rows[0];
    const totalCriancas = parseInt(criancasResult.rows[0].total_criancas);
    
    // Calcular percentuais de uso
    const percentualRotas = plano.limite_rotas > 0 
      ? Math.round((uso.rotas_ativas / plano.limite_rotas) * 100)
      : 0;
      
    const percentualUsuarios = plano.limite_usuarios > 0 
      ? Math.round((totalCriancas / plano.limite_usuarios) * 100)
      : 0;
    
    ctx.body = apiResponse.success({
      plano,
      uso_atual: {
        rotas_ativas: parseInt(uso.rotas_ativas),
        total_rotas: parseInt(uso.total_rotas),
        total_criancas: totalCriancas,
        percentual_rotas: percentualRotas,
        percentual_usuarios: percentualUsuarios
      },
      limites: {
        pode_criar_rota: plano.limite_rotas === -1 || uso.rotas_ativas < plano.limite_rotas,
        pode_adicionar_crianca: plano.limite_usuarios === -1 || totalCriancas < plano.limite_usuarios
      }
    });
    
  } catch (error) {
    logger.error('Erro ao buscar plano atual:', error);
    ctx.body = apiResponse.error('Erro ao buscar plano atual', 500);
  }
});

// POST /api/planos-assinatura/ativar - Ativar novo plano
router.post('/ativar', 
  authenticateToken, 
  verificarMotoristaEscolar,
  async (ctx) => {
    try {
      const usuarioId = ctx.user.id;
      const { tipo_plano, preco_mensal } = ctx.request.body;
      
      // Definir limites baseados no tipo de plano
      let limite_rotas, limite_usuarios, preco_padrao;
      
      switch (tipo_plano) {
        case 'basico':
          limite_rotas = 3;
          limite_usuarios = 15;
          preco_padrao = 0;
          break;
        case 'premium':
          limite_rotas = 10;
          limite_usuarios = 50;
          preco_padrao = 29.90;
          break;
        case 'empresarial':
          limite_rotas = -1; // Ilimitado
          limite_usuarios = -1; // Ilimitado
          preco_padrao = 99.90;
          break;
        default:
          return ctx.body = apiResponse.error('Tipo de plano inválido', 400);
      }
      
      const precoFinal = preco_mensal !== undefined ? preco_mensal : preco_padrao;
      
      // Iniciar transação
      await db.query('BEGIN');
      
      try {
        // Desativar plano atual (se houver)
        await db.query(`
          UPDATE planos_assinatura 
          SET ativo = false, data_fim = NOW(), atualizado_em = NOW()
          WHERE usuario_id = $1 AND ativo = true
        `, [usuarioId]);
        
        // Criar novo plano
        const result = await db.query(`
          INSERT INTO planos_assinatura (
            usuario_id, tipo_plano, limite_rotas, limite_usuarios, 
            preco_mensal, data_inicio, ativo
          ) VALUES (
            $1, $2, $3, $4, $5, NOW(), true
          ) RETURNING id
        `, [usuarioId, tipo_plano, limite_rotas, limite_usuarios, precoFinal]);
        
        const planoId = result.rows[0].id;
        
        // Confirmar transação
        await db.query('COMMIT');
        
        logger.info(`Novo plano ${tipo_plano} ativado para usuário ${usuarioId}`);
        
        ctx.body = apiResponse.success({
          id: planoId,
          tipo_plano,
          message: `Plano ${tipo_plano} ativado com sucesso!`
        }, 201);
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      logger.error('Erro ao ativar plano:', error);
      ctx.body = apiResponse.error('Erro ao ativar plano', 500);
    }
  }
);

// PUT /api/planos-assinatura/upgrade - Fazer upgrade do plano
router.put('/upgrade', 
  authenticateToken, 
  verificarMotoristaEscolar,
  async (ctx) => {
    try {
      const usuarioId = ctx.user.id;
      const { novo_tipo_plano } = ctx.request.body;
      
      // Buscar plano atual
      const planoAtualResult = await db.query(`
        SELECT tipo_plano, limite_rotas, limite_usuarios 
        FROM planos_assinatura 
        WHERE usuario_id = $1 AND ativo = true
        ORDER BY criado_em DESC 
        LIMIT 1
      `, [usuarioId]);
      
      if (planoAtualResult.rows.length === 0) {
        return ctx.body = apiResponse.error('Nenhum plano ativo encontrado', 404);
      }
      
      const planoAtual = planoAtualResult.rows[0];
      
      // Verificar se é realmente um upgrade
      const hierarquiaPlanos = { 'basico': 1, 'premium': 2, 'empresarial': 3 };
      
      if (hierarquiaPlanos[novo_tipo_plano] <= hierarquiaPlanos[planoAtual.tipo_plano]) {
        return ctx.body = apiResponse.error('O novo plano deve ser superior ao plano atual', 400);
      }
      
      // Verificar se o usuário não excede os limites atuais
      const usoResult = await db.query(`
        SELECT 
          COUNT(CASE WHEN ativa = true THEN 1 END) as rotas_ativas
        FROM rotas_escolares 
        WHERE usuario_id = $1
      `, [usuarioId]);
      
      const criancasResult = await db.query(`
        SELECT COUNT(DISTINCT cr.crianca_id) as total_criancas
        FROM criancas_rotas cr
        JOIN rotas_escolares r ON r.id = cr.rota_id
        WHERE r.usuario_id = $1 AND cr.ativo = true
      `, [usuarioId]);
      
      const rotasAtivas = parseInt(usoResult.rows[0].rotas_ativas);
      const totalCriancas = parseInt(criancasResult.rows[0].total_criancas);
      
      // Definir novos limites
      let novos_limite_rotas, novos_limite_usuarios, novo_preco;
      
      switch (novo_tipo_plano) {
        case 'premium':
          novos_limite_rotas = 10;
          novos_limite_usuarios = 50;
          novo_preco = 29.90;
          break;
        case 'empresarial':
          novos_limite_rotas = -1;
          novos_limite_usuarios = -1;
          novo_preco = 99.90;
          break;
      }
      
      // Verificar se o uso atual é compatível com o novo plano
      if (novos_limite_rotas !== -1 && rotasAtivas > novos_limite_rotas) {
        return ctx.body = apiResponse.error(
          `Você possui ${rotasAtivas} rotas ativas, mas o plano ${novo_tipo_plano} permite apenas ${novos_limite_rotas}. Desative algumas rotas antes do upgrade.`, 
          400
        );
      }
      
      if (novos_limite_usuarios !== -1 && totalCriancas > novos_limite_usuarios) {
        return ctx.body = apiResponse.error(
          `Você possui ${totalCriancas} crianças cadastradas, mas o plano ${novo_tipo_plano} permite apenas ${novos_limite_usuarios}. Remova algumas crianças antes do upgrade.`, 
          400
        );
      }
      
      // Realizar upgrade
      await db.query('BEGIN');
      
      try {
        // Desativar plano atual
        await db.query(`
          UPDATE planos_assinatura 
          SET ativo = false, data_fim = NOW(), atualizado_em = NOW()
          WHERE usuario_id = $1 AND ativo = true
        `, [usuarioId]);
        
        // Criar novo plano
        const result = await db.query(`
          INSERT INTO planos_assinatura (
            usuario_id, tipo_plano, limite_rotas, limite_usuarios, 
            preco_mensal, data_inicio, ativo
          ) VALUES (
            $1, $2, $3, $4, $5, NOW(), true
          ) RETURNING id
        `, [usuarioId, novo_tipo_plano, novos_limite_rotas, novos_limite_usuarios, novo_preco]);
        
        const novoPlanoId = result.rows[0].id;
        
        await db.query('COMMIT');
        
        logger.info(`Upgrade de plano realizado: ${planoAtual.tipo_plano} -> ${novo_tipo_plano} para usuário ${usuarioId}`);
        
        ctx.body = apiResponse.success({
          id: novoPlanoId,
          plano_anterior: planoAtual.tipo_plano,
          plano_atual: novo_tipo_plano,
          message: `Upgrade para plano ${novo_tipo_plano} realizado com sucesso!`
        });
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      logger.error('Erro ao fazer upgrade do plano:', error);
      ctx.body = apiResponse.error('Erro ao fazer upgrade do plano', 500);
    }
  }
);

// GET /api/planos-assinatura/historico - Histórico de planos do usuário
router.get('/historico', authenticateToken, verificarMotoristaEscolar, async (ctx) => {
  try {
    const usuarioId = ctx.user.id;
    const { page = 1, limit = 10 } = ctx.query;
    
    const offset = (page - 1) * limit;
    
    const result = await db.query(`
      SELECT 
        id,
        tipo_plano,
        limite_rotas,
        limite_usuarios,
        preco_mensal,
        data_inicio,
        data_fim,
        ativo,
        criado_em
      FROM planos_assinatura 
      WHERE usuario_id = $1
      ORDER BY criado_em DESC
      LIMIT $2 OFFSET $3
    `, [usuarioId, limit, offset]);
    
    const countResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM planos_assinatura 
      WHERE usuario_id = $1
    `, [usuarioId]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    ctx.body = apiResponse.success({
      historico: result.rows,
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
    logger.error('Erro ao buscar histórico de planos:', error);
    ctx.body = apiResponse.error('Erro ao buscar histórico de planos', 500);
  }
});

module.exports = router;