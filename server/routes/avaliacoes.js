const Router = require('koa-router');
const db = require('../config/db');
const logger = require('../utils/logger');
const { success, error } = require('../utils/api-response');
const { authenticateToken } = require('../middleware/auth-utils');

const router = new Router({ prefix: '/avaliacoes' });

/**
 * GET /api/avaliacoes/pendentes
 * Verifica se o usuário logado tem avaliações pendentes de excursões concluídas
 */
router.get('/pendentes', authenticateToken, async (ctx) => {
  try {
    const userId = ctx.state.user.id;

    // Busca excursões que:
    // 1. O usuário está inscrito
    // 2. O status é 'concluida' OU a data de fim já passou
    // 3. O usuário AINDA NÃO avaliou
    const query = `
      SELECT 
        pe.id as pacote_id,
        pe.nome_pacote,
        pe.destino,
        pe.data_fim,
        u_motorista.id as motorista_id,
        u_motorista.nome_completo as motorista_nome,
        emp.nome_fantasia as motorista_empresa
      FROM inscricoes_excursao ie
      JOIN pacotes_excursao pe ON ie.pacote_id = pe.id
      JOIN usuarios u_motorista ON pe.usuario_id = u_motorista.id
      LEFT JOIN empresas emp ON u_motorista.id = emp.usuario_id
      LEFT JOIN avaliacoes a ON a.avaliador_id = $1 AND a.avaliado_id = u_motorista.id 
           AND a.comentario LIKE CONCAT('%Referente à excursão: ', pe.nome_pacote, '%') -- Link fraco, ideal seria ter pacote_id na avaliacao, mas vamos usar metadados no comentário por enquanto ou apenas verificar se avaliou o motorista recentemente? 
           -- Melhor abordagem: Vamos verificar se existe avaliação para este motorista criada APÓS a data de fim da excursão? Não, impreciso.
           -- Vamos assumir que a tabela avaliacoes é genérica. Para este fluxo específico, o ideal seria uma coluna 'referencia_id' e 'tipo_referencia' na tabela avaliacoes, mas não vamos alterar o schema core agora.
           -- Vamos verificar se o usuário já avaliou este motorista *neste contexto*.
           -- Simplificação: Se não houver avaliação do usuário para o motorista com data posterior ao fim da excursão.
      WHERE ie.usuario_id = $1
      AND (pe.status = 'concluida' OR pe.data_fim < CURRENT_DATE)
      AND ie.status_inscricao = 'confirmada'
      AND NOT EXISTS (
        SELECT 1 FROM avaliacoes av 
        WHERE av.avaliador_id = $1 
        AND av.avaliado_id = u_motorista.id
        AND av.created_at >= pe.data_fim
      )
      LIMIT 1
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length > 0) {
      return ctx.body = success(result.rows[0], 'Avaliação pendente encontrada');
    }

    return ctx.body = success(null, 'Nenhuma avaliação pendente');

  } catch (err) {
    logger.error('Erro ao buscar avaliações pendentes:', err);
    return ctx.body = error('Erro ao verificar avaliações', 500);
  }
});

/**
 * POST /api/avaliacoes
 * Envia uma nova avaliação
 */
router.post('/', authenticateToken, async (ctx) => {
  try {
    const { avaliado_id, nota, comentario, pacote_id } = ctx.request.body;
    const avaliador_id = ctx.state.user.id;

    if (!avaliado_id || !nota) {
      return ctx.body = error('Motorista e nota são obrigatórios', 400);
    }

    // Validar nota
    if (nota < 1 || nota > 5) {
      return ctx.body = error('Nota deve ser entre 1 e 5', 400);
    }

    // Buscar informações do pacote para enriquecer o comentário (se fornecido)
    let comentarioFinal = comentario || '';
    if (pacote_id) {
      const pacoteRes = await db.query('SELECT nome_pacote FROM pacotes_excursao WHERE id = $1', [pacote_id]);
      if (pacoteRes.rows.length > 0) {
        comentarioFinal += `\n(Referente à excursão: ${pacoteRes.rows[0].nome_pacote})`;
      }
    }

    // Inserir avaliação
    const insertQuery = `
      INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
      VALUES ($1, $2, $3, $4, true) -- Auto-aprovado por enquanto
      RETURNING id
    `;

    await db.query(insertQuery, [avaliador_id, avaliado_id, nota, comentarioFinal]);

    return ctx.body = success(null, 'Avaliação enviada com sucesso');

  } catch (err) {
    logger.error('Erro ao salvar avaliação:', err);
    return ctx.body = error('Erro ao salvar avaliação', 500);
  }
});

/**
 * GET /api/avaliacoes/motorista/:id
 * Lista avaliações de um motorista (público)
 */
router.get('/motorista/:id', async (ctx) => {
  try {
    const motoristaId = ctx.params.id;
    const { limit = 5, page = 1 } = ctx.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        a.id,
        a.nota,
        a.comentario,
        a.created_at,
        u.nome as avaliador_nome
      FROM avaliacoes a
      JOIN usuarios u ON a.avaliador_id = u.id
      WHERE a.avaliado_id = $1 AND a.aprovado = true
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [motoristaId, limit, offset]);
    
    // Calcular média
    const mediaQuery = `
      SELECT AVG(nota)::numeric(10,1) as media, COUNT(*) as total
      FROM avaliacoes
      WHERE avaliado_id = $1 AND aprovado = true
    `;
    const mediaResult = await db.query(mediaQuery, [motoristaId]);

    return ctx.body = success({
      avaliacoes: result.rows,
      estatisticas: mediaResult.rows[0]
    }, 'Avaliações recuperadas');

  } catch (err) {
    logger.error('Erro ao listar avaliações:', err);
    return ctx.body = error('Erro ao buscar avaliações', 500);
  }
});

module.exports = router;
