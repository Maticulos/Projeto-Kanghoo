/**
 * ========================================
 * API PÃšBLICA DE TRANSPORTES
 * Endpoint pÃºblico para busca de transportes sem autenticaÃ§Ã£o
 * ========================================
 * 
 * SEGURANÃ‡A:
 * - NÃ£o requer autenticaÃ§Ã£o
 * - Filtra dados sensÃ­veis (email, telefone completo, endereÃ§o completo)
 * - Rate limiting especÃ­fico para API pÃºblica
 * - ValidaÃ§Ã£o rigorosa de inputs
 * - Cache recomendado (implementar futuramente)
 */

const Router = require('koa-router');
const db = require('../config/db');
const logger = require('../utils/logger');
const { success, error } = require('../utils/api-response');
let securityMiddleware = null;
try {
  securityMiddleware = require('../middleware/security-middleware');
} catch (e) {
  securityMiddleware = null;
}

const router = new Router({ prefix: '/api/public' });

/**
 * FunÃ§Ã£o para sanitizar dados sensÃ­veis de um transporte
 * Remove informaÃ§Ãµes pessoais que nÃ£o devem ser expostas publicamente
 */
function sanitizeTransporteData(transporte) {
  // Criar ID pÃºblico (hash do ID real para nÃ£o expor IDs sequenciais)
  const crypto = require('crypto');
  const publicId = crypto.createHash('sha256')
    .update(`transporte_${transporte.id}_${process.env.JWT_SECRET || 'default'}`)
    .digest('hex')
    .substring(0, 16);

  // Sanitizar endereÃ§o - mostrar apenas bairro/cidade, nÃ£o endereÃ§o completo
  const sanitizeEndereco = (endereco) => {
    if (!endereco) return null;
    // Extrair apenas bairro e cidade se possÃ­vel
    const parts = endereco.split(',');
    if (parts.length >= 2) {
      // Retornar apenas as Ãºltimas partes (bairro, cidade)
      return parts.slice(-2).join(',').trim();
    }
    // Se nÃ£o conseguir extrair, retornar apenas cidade genÃ©rica
    return 'SÃ£o Paulo, SP';
  };

  // Sanitizar telefone - mostrar apenas Ãºltimos 4 dÃ­gitos
  const sanitizeTelefone = (telefone) => {
    if (!telefone) return null;
    const digits = telefone.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `(XX) XXXXX-${digits.slice(-4)}`;
    }
    return '(XX) XXXXX-XXXX';
  };

  // Sanitizar email - mostrar apenas domÃ­nio
  const sanitizeEmail = (email) => {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length === 2) {
      return `***@${parts[1]}`;
    }
    return '***@***';
  };

  return {
    id: publicId, // ID público hashado
    nome: transporte.nome || 'Transporte',
    tipo: transporte.tipo_servico || transporte.tipo || 'Transporte',
    tipo_rota: transporte.tipo_servico || transporte.tipo || 'Transporte',
    nome_rota: transporte.nome_rota || transporte.nome || 'Transporte',
    valor_mensal: transporte.preco_mensal ? parseFloat(transporte.preco_mensal) : null,
    preco: transporte.preco_por_pessoa ? parseFloat(transporte.preco_por_pessoa) : null,
    turno: transporte.turno,
    escola_destino: transporte.escola_destino,
    caracteristicas: [
      transporte.ar_condicionado ? 'ar-condicionado' : null,
      transporte.wifi ? 'wifi' : null,
      transporte.acessibilidade_pcd ? 'acessibilidade' : null,
      transporte.gps_rastreamento ? 'gps' : null
    ].filter(Boolean),
    avaliacao: parseFloat(transporte.avaliacao) || 0,
    totalAvaliacoes: parseInt(transporte.total_avaliacoes) || 0,
    // Dados sanitizados
    contato: {
      telefone: sanitizeTelefone(transporte.celular),
      email: sanitizeEmail(transporte.email),
      // Não expor endereço completo
      localizacao: sanitizeEndereco(transporte.endereco_completo)
    },
    veiculo: {
      capacidade: transporte.lotacao_maxima || transporte.capacidade || null,
      ano: transporte.ano_fabricacao || transporte.ano || null,
      cor: transporte.cor || null,
      caracteristicas: {
        arCondicionado: Boolean(transporte.ar_condicionado),
        wifi: Boolean(transporte.wifi),
        acessibilidade: Boolean(transporte.acessibilidade_pcd),
        gps: Boolean(transporte.gps_rastreamento)
      }
    },
    // Dados específicos do tipo (sem informações sensíveis)
    ...(transporte.nome_rota && {
      rota: {
        nome: transporte.nome_rota,
        escola: transporte.escola_destino,
        turno: transporte.turno,
        horarioIda: transporte.horario_ida,
        horarioVolta: transporte.horario_volta,
        precoMensal: transporte.preco_mensal ? `R$ ${parseFloat(transporte.preco_mensal).toFixed(2)}/mês` : null,
        vagas: transporte.vagas_escolar || null
      }
    }),
    ...(transporte.nome_pacote && {
      pacote: {
        nome: transporte.nome_pacote,
        destino: transporte.destino,
        duracao: transporte.duracao_dias,
        precoPorPessoa: transporte.preco_por_pessoa ? `R$ ${parseFloat(transporte.preco_por_pessoa).toFixed(2)}` : null,
        vagas: transporte.vagas_excursao,
        dataInicio: transporte.data_inicio,
        dataFim: transporte.data_fim
      }
    }),
    // Coordenadas e distância para o mapa interativo
    distancia: transporte.distancia_km ? parseFloat(transporte.distancia_km.toFixed(2)) : null,
    localizacao: {
      latitude: transporte.latitude ? parseFloat(transporte.latitude) : null,
      longitude: transporte.longitude ? parseFloat(transporte.longitude) : null
    }
  };
}

/**
 * GET /api/public/transportes
 * Busca pÃºblica de transportes (sem autenticaÃ§Ã£o)
 * 
 * ParÃ¢metros de query:
 * - tipo: 'escolar'|'excursao'|'todos' (padrÃ£o: 'todos')
 * - endereco: busca textual
 * - cidade: filtrar por cidade
 * - bairro: filtrar por bairro
 * - capacidade: capacidade mÃ­nima do veÃ­culo
 * - faixaPreco: faixa de preÃ§o
 * - turno: turno (para escolar)
 * - arCondicionado: boolean
 * - wifi: boolean
 * - acessibilidade: boolean
 * - latitude: latitude para busca por proximidade
 * - longitude: longitude para busca por proximidade
 * - raio: raio em km (padrÃ£o: 10)
 * - ordenacao: 'relevancia'|'preco'|'avaliacao'|'distancia'
 * - pagina: nÃºmero da pÃ¡gina (padrÃ£o: 1)
 * - limite: resultados por pÃ¡gina (padrÃ£o: 20, mÃ¡ximo: 50)
 */
router.get('/transportes', async (ctx) => {
  try {
    // Rate limiting especÃ­fico para API pÃºblica (se disponÃ­vel)
    if (securityMiddleware && securityMiddleware.apiRateLimit) {
      const publicRateLimit = securityMiddleware.apiRateLimit();
      await publicRateLimit(ctx, async () => {});
    }

    // Extrair e validar parÃ¢metros
    const queryParams = ctx.query || {};
    const tipo = (queryParams.tipo_rota || queryParams.tipo || 'todos').toLowerCase();
    const {
      endereco,
      cidade,
      bairro,
      capacidade,
      faixaPreco,
      turno,
      arCondicionado,
      wifi,
      acessibilidade,
      latitude,
      longitude,
      raio = queryParams.raio_km || 10,
      ordenacao = 'relevancia',
      pagina = 1,
      limite = 20,
      valor_max,
      escola
    } = queryParams;
    const caracteristicasList = (queryParams.caracteristicas || '').split(',').map(s => s.trim()).filter(Boolean);
    const valorMax = valor_max ? parseFloat(valor_max) : null;

    // ValidaÃ§Ã£o de limites
    const page = Math.max(1, parseInt(pagina) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limite) || 20)); // MÃ¡ximo 50 por pÃ¡gina
    const raioKm = Math.min(50, Math.max(1, parseFloat(raio) || 10)); // MÃ¡ximo 50km

    // ValidaÃ§Ã£o de coordenadas se fornecidas
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return ctx.body = error('Coordenadas invÃ¡lidas', 400);
      }
    }

    // Construir query base (reutilizando lógica do endpoint existente)
    const latExpr = 'COALESCE(r.latitude_origem, u.latitude)';
    const lonExpr = 'COALESCE(r.longitude_origem, u.longitude)';
    let query = `
      SELECT DISTINCT
        u.id,
        u.nome_completo as nome,
        u.email,
        u.celular,
        u.tipo_usuario,
        u.endereco_completo,
        ${latExpr} as latitude,
        ${lonExpr} as longitude,
        v.placa,
        COALESCE(v.capacidade, 1) as lotacao_maxima,
        v.ano as ano_fabricacao,
        NULL as cor,  -- Coluna cor não existe na estrutura atual
        COALESCE(cv.ar_condicionado, false) as ar_condicionado,
        COALESCE(cv.wifi, false) as wifi,
        COALESCE(cv.acessibilidade_pcd, false) as acessibilidade_pcd,
        COALESCE(cv.gps_rastreamento, false) as gps_rastreamento,
        COALESCE(avg_aval.media_avaliacao, 0) as avaliacao,
        COALESCE(avg_aval.total_avaliacoes, 0) as total_avaliacoes,
        CASE 
          WHEN u.tipo_usuario = 'motorista_escolar' THEN 'Transporte Escolar'
          WHEN u.tipo_usuario = 'motorista_excursao' THEN 'Excursão & Fretamento'
          ELSE 'Transporte'
        END as tipo_servico
    `;


    // Condicionalmente adicionar cÃ¡lculo de distÃ¢ncia
    if (latitude && longitude) {
      query += `,
        (
          6371 * acos(
            cos(radians(${parseFloat(latitude)})) * cos(radians(${latExpr})) * 
            cos(radians(${lonExpr}) - radians(${parseFloat(longitude)})) + 
            sin(radians(${parseFloat(latitude)})) * sin(radians(${latExpr}))
          )
        ) AS distancia_km
      `;
    }

    // Adicionar campos especÃ­ficos por tipo
    // NOTA: Usar apenas campos que existem na estrutura atual
    if (tipo === 'escolar' || tipo === 'todos') {
      query += `,
        r.nome_rota,
        r.escola_destino,
        r.turno,
        r.horario_ida,
        r.horario_volta,
        COALESCE(r.valor_mensal, r.preco_mensal) as preco_mensal,
        r.vagas_disponiveis as vagas_escolar
      `;
    }

    if (tipo === 'excursao' || tipo === 'todos') {
      query += `,
        p.nome_pacote,
        p.destino,
        p.duracao_dias,
        p.preco_por_pessoa,
        p.vagas_disponiveis as vagas_excursao,
        p.data_inicio,
        p.data_fim
      `;
    }

    // FROM e JOINs
    // Usar LEFT JOIN para permitir usuÃ¡rios sem veÃ­culos
    // NOTA: A tabela veiculos usa 'motorista_id' em vez de 'usuario_id'
    query += `
      FROM usuarios u
      LEFT JOIN veiculos v ON u.id = v.motorista_id
      LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
      LEFT JOIN (
        SELECT 
          avaliado_id,
          ROUND(AVG(nota::numeric), 1) as media_avaliacao,
          COUNT(*) as total_avaliacoes
        FROM avaliacoes 
        WHERE aprovado = true OR aprovado IS NULL
        GROUP BY avaliado_id
      ) avg_aval ON u.id = avg_aval.avaliado_id
    `;
    
    // Verificar se tabela caracteristicas_veiculos existe (pode nÃ£o existir)
    // Se nÃ£o existir, os valores serÃ£o NULL e serÃ£o tratados com COALESCE

    // JOINs condicionais
    // NOTA: Tabela rotas_escolares nÃ£o tem 'status_rota', apenas 'ativa'
    if (tipo === 'escolar' || tipo === 'todos') {
      query += `
        LEFT JOIN rotas_escolares r ON u.id = r.usuario_id AND r.ativa = true
      `;
    }

    if (tipo === 'excursao' || tipo === 'todos') {
      query += `
        LEFT JOIN pacotes_excursao p ON u.id = p.usuario_id AND p.ativo = true
      `;
    }

    // WHERE clause
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    // Filtro de tipo de usuÃ¡rio
    if (tipo === 'escolar') {
      whereConditions.push(`u.tipo_usuario IN ('motorista_escolar', 'motorista_escolar_excursao')`);
    } else if (tipo === 'excursao') {
      whereConditions.push(`u.tipo_usuario IN ('motorista_excursao', 'motorista_escolar_excursao')`);
    } else {
      whereConditions.push(`u.tipo_usuario IN ('motorista_escolar', 'motorista_excursao', 'motorista_escolar_excursao')`);
    }

    // Filtro de endereÃ§o
    // NOTA: Tabela rotas_escolares nÃ£o tem endereco_origem/endereco_destino
    if (endereco) {
      paramCount++;
      whereConditions.push(`LOWER(u.endereco_completo) LIKE LOWER($${paramCount})`);
      params.push(`%${endereco}%`);
    }

    // Filtro de cidade
    if (cidade) {
      paramCount++;
      whereConditions.push(`LOWER(u.endereco_completo) LIKE LOWER($${paramCount})`);
      params.push(`%${cidade}%`);
    }

    // Filtro de bairro
    // NOTA: Tabela rotas_escolares nÃ£o tem endereco_origem
    if (bairro) {
      paramCount++;
      whereConditions.push(`LOWER(u.endereco_completo) LIKE LOWER($${paramCount})`);
      params.push(`%${bairro}%`);
    }

    // Filtro de escola (rota escolar)
    if (escola) {
      paramCount++;
      whereConditions.push(`LOWER(r.escola_destino) LIKE LOWER($${paramCount})`);
      params.push(`%${escola}%`);
    }

    // Filtro de capacidade
    // NOTA: Tabela veiculos tem apenas 'capacidade', nÃ£o 'lotacao_maxima' ou 'capacidade_passageiros'
    if (capacidade) {
      paramCount++;
      whereConditions.push(`v.capacidade >= $${paramCount}`);
      params.push(parseInt(capacidade));
    }

    // Filtro de valor máximo (mensal ou por pessoa)
    if (valorMax) {
      paramCount++;
      whereConditions.push(`COALESCE(r.valor_mensal, r.preco_mensal, p.preco_por_pessoa) <= $${paramCount}`);
      params.push(valorMax);
    }

    // Filtro de turno (escolar)
    if (turno && (tipo === 'escolar' || tipo === 'todos')) {
      paramCount++;
      whereConditions.push(`r.turno = $${paramCount}`);
      params.push(turno);
    }

    // Filtros de caracteristicas (apenas se tabela existir)
    const wantedCaracts = new Set(caracteristicasList.map(c => c.toLowerCase()));
    if (arCondicionado === 'true') {
      whereConditions.push(`COALESCE(cv.ar_condicionado, false) = true`);
      wantedCaracts.add('ar-condicionado');
    }
    if (wifi === 'true') {
      whereConditions.push(`COALESCE(cv.wifi, false) = true`);
      wantedCaracts.add('wifi');
    }
    if (acessibilidade === 'true') {
      whereConditions.push(`COALESCE(cv.acessibilidade_pcd, false) = true`);
      wantedCaracts.add('acessibilidade');
    }
    if (wantedCaracts.size) {
      if (wantedCaracts.has('ar-condicionado')) whereConditions.push(`COALESCE(cv.ar_condicionado, false) = true`);
      if (wantedCaracts.has('wifi') || wantedCaracts.has('wi-fi')) whereConditions.push(`COALESCE(cv.wifi, false) = true`);
      if (wantedCaracts.has('acessibilidade')) whereConditions.push(`COALESCE(cv.acessibilidade_pcd, false) = true`);
    }
    // Filtro por proximidade geogrÃ¡fica
    // NOTA: Campos de coordenadas nÃ£o existem ainda - desabilitado temporariamente
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Validar coordenadas (para uso futuro)
      if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) {
        return error(ctx, 400, 'Coordenadas invÃ¡lidas');
      }
      
      // Filtro de proximidade geogrÃ¡fica
      if (latitude && longitude) {
        whereConditions.push(`
          (
            6371 * acos(
              cos(radians(${parseFloat(latitude)})) * cos(radians(${latExpr})) * 
              cos(radians(${lonExpr}) - radians(${parseFloat(longitude)})) + 
              sin(radians(${parseFloat(latitude)})) * sin(radians(${latExpr}))
            )
          ) <= ${raioKm}
        `);
      }
    }

    // Construir WHERE final
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // ORDER BY
    if (ordenacao === 'preco') {
      // Ordenar por preÃ§o baseado no tipo
      if (tipo === 'escolar') {
        query += ` ORDER BY r.valor_mensal ASC NULLS LAST, u.id DESC`;
      } else if (tipo === 'excursao') {
        query += ` ORDER BY p.preco_por_pessoa ASC NULLS LAST, u.id DESC`;
      } else {
        // Tipo 'todos' - ordenar por preÃ§o unificado
        query += ` ORDER BY COALESCE(r.valor_mensal, r.preco_mensal, p.preco_por_pessoa) ASC NULLS LAST, u.id DESC`;
      }
    } else if (ordenacao === 'avaliacao') {
      query += ` ORDER BY avaliacao DESC, total_avaliacoes DESC, u.id DESC`;
    } else if (ordenacao === 'distancia' && latitude && longitude) {
      query += ` ORDER BY distancia_km ASC NULLS LAST, avaliacao DESC, u.id DESC`;
    } else {
      // OrdenaÃ§Ã£o padrÃ£o: relevÃ¢ncia (avaliaÃ§Ã£o + total de avaliaÃ§Ãµes)
      query += ` ORDER BY avaliacao DESC, total_avaliacoes DESC, u.id DESC`;
    }

    // PaginaÃ§Ã£o
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    paramCount++; // Incrementar apÃ³s adicionar offset

    // Executar query
    const result = await db.query(query, params);

    // Contar total (query simplificada)
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM usuarios u
      LEFT JOIN veiculos v ON u.id = v.motorista_id
      LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
    `;

    if (tipo === 'escolar' || tipo === 'todos') {
      countQuery += ` LEFT JOIN rotas_escolares r ON u.id = r.usuario_id AND r.ativa = true`;
    }
    if (tipo === 'excursao' || tipo === 'todos') {
      countQuery += ` LEFT JOIN pacotes_excursao p ON u.id = p.usuario_id AND p.ativo = true`;
    }

    const countWhereConditions = whereConditions.filter(c => !c.includes('distancia_km'));
    if (countWhereConditions.length > 0) {
      countQuery += ` WHERE ${countWhereConditions.join(' AND ')}`;
    }

    const countParams = params.slice(0, -2); // Remover limit e offset
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Sanitizar dados antes de retornar
    const transportesSanitizados = result.rows.map(row => sanitizeTransporteData(row));

    // Log de acesso (sem dados sensÃ­veis)
    logger.info('API pÃºblica acessada', {
      ip: ctx.ip,
      tipo,
      totalResultados: total,
      pagina: page
    });

    return ctx.body = success({
      transportes: transportesSanitizados,
      rotas: transportesSanitizados,
      paginacao: {
        paginaAtual: page,
        totalPaginas: Math.ceil(total / limit),
        totalResultados: total,
        resultadosPorPagina: limit
      },
      filtros: {
        tipo,
        endereco: endereco || null,
        cidade: cidade || null,
        bairro: bairro || null,
        raio: latitude && longitude ? raioKm : null,
        ordenacao
      }
    }, 'Busca realizada com sucesso');

  } catch (err) {
    logger.error('Erro na API pÃºblica de transportes:', {
      error: err.message,
      stack: err.stack,
      ip: ctx.ip
    });
    return ctx.body = error('Erro ao buscar transportes. Tente novamente mais tarde.', 500);
  }
});

module.exports = router;




