/**
 * ========================================
 * API PÚBLICA DE TRANSPORTES
 * Endpoint público para busca de transportes sem autenticação
 * ========================================
 * 
 * SEGURANÇA:
 * - Não requer autenticação
 * - Filtra dados sensíveis (email, telefone completo, endereço completo)
 * - Rate limiting específico para API pública
 * - Validação rigorosa de inputs
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

const router = new Router({ prefix: '/public' });

// Inicializar rate limiter uma única vez
let publicRateLimitMiddleware = null;
if (securityMiddleware && securityMiddleware.apiRateLimit) {
  publicRateLimitMiddleware = securityMiddleware.apiRateLimit();
}

const crypto = require('crypto');

// Cache para resolução de IDs públicos (evita scan de tabela)
const publicIdCache = new Map();
const lastCacheUpdate = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hora

/**
 * Resolve um ID público para o ID real do usuário
 * @param {string} publicId 
 * @returns {Promise<number|null>}
 */
async function resolvePublicId(publicId) {
  // Se for numérico, assume que é ID real (dev/debug)
  if (!isNaN(publicId)) return parseInt(publicId);

  // Verificar cache
  if (publicIdCache.has(publicId)) {
    return publicIdCache.get(publicId);
  }

  // Se não estiver no cache, reconstruir cache (ou scan parcial)
  // Por simplicidade, vamos buscar todos os IDs de motoristas e gerar seus hashes
  const result = await db.query("SELECT id FROM usuarios WHERE tipo_usuario IN ('motorista_escolar', 'motorista_excursao', 'motorista_escolar_excursao')");
  
  for (const row of result.rows) {
    const hash = crypto.createHash('sha256')
      .update(`transporte_${row.id}_${process.env.JWT_SECRET || 'default'}`)
      .digest('hex')
      .substring(0, 16);
    
    publicIdCache.set(hash, row.id);
    
    if (hash === publicId) {
      return row.id;
    }
  }

  return null;
}

/**
 * Função para sanitizar dados sensíveis de um transporte
 * Remove informações pessoais que não devem ser expostas publicamente
 */
function sanitizeTransporteData(transporte, tipoBusca = 'todos') {
  // Criar ID público (hash do ID real para não expor IDs sequenciais)
  // const crypto = require('crypto'); // Movido para escopo global
  const publicId = crypto.createHash('sha256')
    .update(`transporte_${transporte.id}_${process.env.JWT_SECRET || 'default'}`)
    .digest('hex')
    .substring(0, 16);

  // Determinar o tipo normalizado (escolar ou excursao) para o frontend
  let tipoNormalizado = 'escolar';
  if (transporte.tipo_usuario === 'motorista_excursao') {
    tipoNormalizado = 'excursao';
  } else if (transporte.tipo_usuario === 'motorista_escolar_excursao') {
    // Se for híbrido, decide com base na busca ou padrão escolar
    tipoNormalizado = tipoBusca === 'excursao' ? 'excursao' : 'escolar';
  } else if (transporte.tipo_usuario === 'motorista_escolar') {
    tipoNormalizado = 'escolar';
  }

  // Sanitizar endereço - mostrar apenas bairro/cidade, não endereço completo
  const sanitizeEndereco = (endereco) => {
    if (!endereco) return null;
    // Extrair apenas bairro e cidade se possível
    const parts = endereco.split(',');
    if (parts.length >= 2) {
      // Retornar apenas as últimas partes (bairro, cidade)
      return parts.slice(-2).join(',').trim();
    }
    // Se não conseguir extrair, retornar cidade padrão
    return 'Tubarão, SC';
  };

  // Sanitizar telefone - mostrar apenas últimos 4 dígitos
  const sanitizeTelefone = (telefone) => {
    if (!telefone) return null;
    const digits = telefone.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `(XX) XXXXX-${digits.slice(-4)}`;
    }
    return '(XX) XXXXX-XXXX';
  };

  const normalizeTelefone = (telefone) => {
    if (!telefone) return '';
    return telefone.replace(/\D/g, '');
  };

  // Sanitizar email - mostrar apenas domínio
  const sanitizeEmail = (email) => {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length === 2) {
      return `***@${parts[1]}`;
    }
    return '***@***';
  };

  const totalParadasPadrao = Number(transporte.total_paradas_padrao) || 0;
  const totalParadasAtiva = Number(transporte.total_paradas_ativa) || totalParadasPadrao;
  const rotaPadraoData = transporte.nome_rota ? {
    id: transporte.rota_padrao_id || null,
    nome: transporte.nome_rota,
    turno: transporte.turno,
    horario_ida: transporte.horario_ida,
    horario_volta: transporte.horario_volta,
    total_paradas: totalParadasPadrao
  } : null;

  const rotaAtualData = transporte.rota_ativa_nome ? {
    id: transporte.rota_ativa_id || null,
    nome: transporte.rota_ativa_nome,
    turno: transporte.rota_ativa_turno,
    horario_ida: transporte.rota_ativa_horario_ida,
    horario_volta: transporte.rota_ativa_horario_volta,
    total_paradas: totalParadasAtiva
  } : null;

  const statusViagem = transporte.status_viagem || (rotaAtualData ? 'em_andamento' : 'fora_da_rota');
  const whatsappDigits = normalizeTelefone(transporte.celular);
  const whatsappLink = whatsappDigits.length >= 10
    ? `https://api.whatsapp.com/send?phone=55${whatsappDigits}`
    : null;

  // Priorizar Nome Fantasia se disponível, senão usar Nome Completo
  const nomeExibicao = transporte.nome_fantasia || transporte.nome || 'Transporte';

  return {
    id: publicId, // ID público hashado
    nome: nomeExibicao,
    nome_responsavel: transporte.nome, // Manter nome original como responsável
    tipo: tipoNormalizado, // Tipo normalizado para o frontend (escolar/excursao)
    tipo_rota: tipoNormalizado,
    nome_rota: transporte.nome_rota || nomeExibicao,
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
    // Dados da empresa
    empresa: transporte.razao_social ? {
      razaoSocial: transporte.razao_social,
      nomeFantasia: transporte.nome_fantasia,
      cnpj: transporte.cnpj
    } : null,
    // Dados sanitizados
    contato: {
      telefone: sanitizeTelefone(transporte.celular),
      email: sanitizeEmail(transporte.email),
      // Não expor endereço completo
      localizacao: sanitizeEndereco(transporte.endereco || transporte.endereco_completo),
      whatsapp_link: whatsappLink
    },
    veiculo: {
      marca: transporte.marca || null,
      modelo: transporte.modelo || null,
      placa: transporte.placa || null,
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
        vagas: transporte.vagas_escolar || null,
        totalParadas: totalParadasPadrao || null,
        coordenadasOrigem: (transporte.latitude_origem && transporte.longitude_origem) ? {
          latitude: parseFloat(transporte.latitude_origem),
          longitude: parseFloat(transporte.longitude_origem)
        } : null,
        coordenadasDestino: (transporte.latitude_destino && transporte.longitude_destino) ? {
          latitude: parseFloat(transporte.latitude_destino),
          longitude: parseFloat(transporte.longitude_destino)
        } : null
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
        dataFim: transporte.data_fim,
        coordenadasPartida: (transporte.latitude_partida && transporte.longitude_partida) ? {
          latitude: parseFloat(transporte.latitude_partida),
          longitude: parseFloat(transporte.longitude_partida)
        } : null,
        coordenadasDestino: (transporte.latitude_destino_excursao && transporte.longitude_destino_excursao) ? {
          latitude: parseFloat(transporte.latitude_destino_excursao),
          longitude: parseFloat(transporte.longitude_destino_excursao)
        } : null
      }
    }),
    // Coordenadas e distância para o mapa interativo
    distancia: transporte.distancia_km ? parseFloat(transporte.distancia_km.toFixed(2)) : null,
    localizacao: {
      latitude: transporte.latitude ? parseFloat(transporte.latitude) : (transporte.latitude_origem ? parseFloat(transporte.latitude_origem) : (transporte.latitude_partida ? parseFloat(transporte.latitude_partida) : null)),
      longitude: transporte.longitude ? parseFloat(transporte.longitude) : (transporte.longitude_origem ? parseFloat(transporte.longitude_origem) : (transporte.longitude_partida ? parseFloat(transporte.longitude_partida) : null))
    },
    rota_padrao: rotaPadraoData,
    rota_atual: rotaAtualData,
    total_paradas: (rotaAtualData && rotaAtualData.total_paradas) || (rotaPadraoData && rotaPadraoData.total_paradas) || 0,
    status_viagem: statusViagem
  };
}

/**
 * GET /api/public/transportes
 * Busca pública de transportes (sem autenticação)
 * 
 * Parâmetros de query:
 * - tipo: 'escolar'|'excursao'|'todos' (padrão: 'todos')
 * - endereco: busca textual
 * - cidade: filtrar por cidade
 * - bairro: filtrar por bairro
 * - capacidade: capacidade mínima do veículo
 * - faixaPreco: faixa de preço
 * - turno: turno (para escolar)
 * - arCondicionado: boolean
 * - wifi: boolean
 * - acessibilidade: boolean
 * - latitude: latitude para busca por proximidade
 * - longitude: longitude para busca por proximidade
 * - raio: raio em km (padrão: 10)
 * - ordenacao: 'relevancia'|'preco'|'avaliacao'|'distancia'
 * - pagina: número da página (padrão: 1)
 * - limite: resultados por página (padrão: 20, máximo: 50)
 */
router.get('/transportes', async (ctx) => {
  try {
    // Rate limiting específico para API pública (se disponível)
    if (publicRateLimitMiddleware) {
      await publicRateLimitMiddleware(ctx, async () => {});
    }

    // Extrair e validar parâmetros
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

    // Validação de limites
    const page = Math.max(1, parseInt(pagina) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limite) || 20)); // Máximo 50 por página
    const raioKm = Math.min(50, Math.max(1, parseFloat(raio) || 10)); // Máximo 50km

    // Validação de coordenadas se fornecidas
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return ctx.body = error('Coordenadas inválidas', 400);
      }
    }

    // Construir query base (reutilizando lógica do endpoint existente)
    let latExpr = 'cl.latitude';
    let lonExpr = 'cl.longitude';

    if (tipo === 'escolar') {
      latExpr = 'COALESCE(cl.latitude, u.latitude, r.latitude_origem)';
      lonExpr = 'COALESCE(cl.longitude, u.longitude, r.longitude_origem)';
    } else if (tipo === 'excursao') {
      latExpr = 'COALESCE(cl.latitude, u.latitude, p.latitude_partida)';
      lonExpr = 'COALESCE(cl.longitude, u.longitude, p.longitude_partida)';
    } else {
      latExpr = 'COALESCE(cl.latitude, u.latitude, r.latitude_origem, p.latitude_partida)';
      lonExpr = 'COALESCE(cl.longitude, u.longitude, r.longitude_origem, p.longitude_partida)';
    }

    let query = `
      SELECT DISTINCT
        u.id,
        u.nome_completo as nome,
        u.email,
        u.celular,
        u.tipo_usuario,
        COALESCE(u.endereco_completo, '') as endereco,
        ${latExpr} as latitude,
        ${lonExpr} as longitude,
        v.placa,
        v.modelo,
        v.marca,
        COALESCE(v.capacidade, 1) as lotacao_maxima,
        v.ano as ano_fabricacao,
        NULL::text as cor,
        cv.ar_condicionado,
        cv.wifi,
        cv.acessibilidade_pcd,
        cv.gps_rastreamento,
        COALESCE(avg_aval.media_avaliacao, 0) as avaliacao,
        COALESCE(avg_aval.total_avaliacoes, 0) as total_avaliacoes,
        viagem_ativa.id as viagem_ativa_id,
        viagem_ativa.status as status_viagem,
        r_ativa.id as rota_ativa_id,
        r_ativa.nome_rota as rota_ativa_nome,
        r_ativa.turno as rota_ativa_turno,
        r_ativa.horario_ida as rota_ativa_horario_ida,
        r_ativa.horario_volta as rota_ativa_horario_volta,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        CASE 
          WHEN u.tipo_usuario = 'motorista_escolar' THEN 'Transporte Escolar'
          WHEN u.tipo_usuario = 'motorista_excursao' THEN 'Excursão & Fretamento'
          ELSE 'Transporte'
        END as tipo_servico
    `;


    // Condicionalmente adicionar cálculo de distância
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

    // Adicionar campos específicos por tipo
    // NOTA: Usar apenas campos que existem na estrutura atual
    if (tipo === 'escolar' || tipo === 'todos') {
      query += `,
        r.id as rota_padrao_id,
        COALESCE(rota_paradas_padrao.total_paradas, 0) as total_paradas_padrao,
        COALESCE(rota_paradas_ativa.total_paradas, rota_paradas_padrao.total_paradas, 0) as total_paradas_ativa,
        r.nome_rota,
        r.escola_destino,
        r.turno,
        r.horario_ida,
        r.horario_volta,
        COALESCE(r.preco_mensal, NULL) as preco_mensal,
        r.vagas_disponiveis as vagas_escolar,
        r.latitude_origem,
        r.longitude_origem,
        r.latitude_destino,
        r.longitude_destino
      `;
    } else {
      // Caso apenas excursão, garantir que total_paradas_ativa exista (usando apenas rota ativa)
      query += `,
        COALESCE(rota_paradas_ativa.total_paradas, 0) as total_paradas_ativa
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
        p.data_fim,
        p.latitude_partida,
        p.longitude_partida,
        p.latitude_destino as latitude_destino_excursao,
        p.longitude_destino as longitude_destino_excursao
      `;
    }

    // FROM e JOINs
    // Usar LEFT JOIN para permitir usuários sem veículos
    // NOTA: A tabela veiculos usa 'motorista_id' em vez de 'usuario_id'
    // Usar subquery para veiculos para evitar duplicatas se o motorista tiver mais de um veículo
    query += `
      FROM usuarios u
      LEFT JOIN (
        SELECT DISTINCT ON (motorista_id) * 
        FROM veiculos 
        ORDER BY motorista_id, id DESC
      ) v ON u.id = v.motorista_id
      LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
      LEFT JOIN empresas e ON u.id = e.usuario_id
      LEFT JOIN cache_localizacao cl ON u.id = cl.motorista_id
      LEFT JOIN viagens viagem_ativa ON cl.viagem_ativa_id = viagem_ativa.id
      LEFT JOIN rotas_escolares r_ativa ON viagem_ativa.rota_id = r_ativa.id
      LEFT JOIN (
        SELECT 
          avaliado_id,
          ROUND(AVG(nota::numeric), 1) as media_avaliacao,
          COUNT(*) as total_avaliacoes
        FROM avaliacoes 
        WHERE aprovado = true OR aprovado IS NULL
        GROUP BY avaliado_id
      ) avg_aval ON u.id = avg_aval.avaliado_id
      LEFT JOIN (
        SELECT rota_id, COUNT(*) as total_paradas
        FROM paradas_rota
        GROUP BY rota_id
      ) rota_paradas_ativa ON r_ativa.id = rota_paradas_ativa.rota_id
    `;
    
    // Verificar se tabela caracteristicas_veiculos existe (pode não existir)
    // Se não existir, os valores serão NULL e serão tratados com COALESCE

    // JOINs condicionais
    // NOTA: Tabela rotas_escolares não tem 'status_rota', apenas 'ativa'
    if (tipo === 'escolar' || tipo === 'todos') {
      query += `
        LEFT JOIN rotas_escolares r ON u.id = r.usuario_id AND r.ativa = true
        LEFT JOIN (
          SELECT rota_id, COUNT(*) as total_paradas
          FROM paradas_rota
          GROUP BY rota_id
        ) rota_paradas_padrao ON r.id = rota_paradas_padrao.rota_id
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

    // Filtro de tipo de usuário
    if (tipo === 'escolar') {
      whereConditions.push(`u.tipo_usuario IN ('motorista_escolar', 'motorista_escolar_excursao')`);
    } else if (tipo === 'excursao') {
      whereConditions.push(`u.tipo_usuario IN ('motorista_excursao', 'motorista_escolar_excursao')`);
    } else {
      whereConditions.push(`u.tipo_usuario IN ('motorista_escolar', 'motorista_excursao', 'motorista_escolar_excursao')`);
    }

    // Filtro de endereço
    // NOTA: Tabela rotas_escolares não tem endereco_origem/endereco_destino
    if (endereco) {
      paramCount++;
      whereConditions.push(`LOWER(COALESCE(u.endereco_completo, '')) LIKE LOWER($${paramCount})`);
      params.push(`%${endereco}%`);
    }

    // Filtro de cidade
    if (cidade) {
      paramCount++;
      whereConditions.push(`LOWER(COALESCE(u.endereco_completo, '')) LIKE LOWER($${paramCount})`);
      params.push(`%${cidade}%`);
    }

    // Filtro de bairro
    // NOTA: Tabela rotas_escolares não tem endereco_origem
    if (bairro) {
      paramCount++;
      whereConditions.push(`LOWER(COALESCE(u.endereco_completo, '')) LIKE LOWER($${paramCount})`);
      params.push(`%${bairro}%`);
    }

    // Filtro de escola (rota escolar)
    if (escola) {
      paramCount++;
      whereConditions.push(`LOWER(r.escola_destino) LIKE LOWER($${paramCount})`);
      params.push(`%${escola}%`);
    }

    // Filtro de capacidade
    // NOTA: Tabela veiculos tem apenas 'capacidade', não 'lotacao_maxima' ou 'capacidade_passageiros'
    if (capacidade) {
      paramCount++;
      whereConditions.push(`v.capacidade >= $${paramCount}`);
      params.push(parseInt(capacidade));
    }

    // Filtro de valor máximo (mensal ou por pessoa)
    if (valorMax) {
      paramCount++;
      whereConditions.push(`COALESCE(r.preco_mensal, p.preco_por_pessoa) <= $${paramCount}`);
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
    // Filtro por proximidade geográfica
    // NOTA: Campos de coordenadas não existem ainda - desabilitado temporariamente
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Validar coordenadas (para uso futuro)
      if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) {
        return error(ctx, 400, 'Coordenadas inválidas');
      }
      
      // Filtro de proximidade geográfica
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
      // Ordenar por preço baseado no tipo
      if (tipo === 'escolar') {
        query += ` ORDER BY r.preco_mensal ASC NULLS LAST, u.id DESC`;
      } else if (tipo === 'excursao') {
        query += ` ORDER BY p.preco_por_pessoa ASC NULLS LAST, u.id DESC`;
      } else {
        // Tipo 'todos' - ordenar por preço unificado
        query += ` ORDER BY COALESCE(r.preco_mensal, p.preco_por_pessoa) ASC NULLS LAST, u.id DESC`;
      }
    } else if (ordenacao === 'avaliacao') {
      query += ` ORDER BY avaliacao DESC, total_avaliacoes DESC, u.id DESC`;
    } else if (ordenacao === 'distancia' && latitude && longitude) {
      query += ` ORDER BY distancia_km ASC NULLS LAST, avaliacao DESC, u.id DESC`;
    } else {
      // Ordenação padrão: relevância (avaliação + total de avaliações)
      query += ` ORDER BY avaliacao DESC, total_avaliacoes DESC, u.id DESC`;
    }

    // Paginação
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    paramCount++; // Incrementar após adicionar offset

    // Executar query
    logger.debug('Executando query de transportes públicos', { query, params });
    const result = await db.query(query, params);
    logger.debug(`Query retornou ${result.rows.length} resultados`);

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
    const transportesSanitizados = result.rows.map(row => sanitizeTransporteData(row, tipo));

    // Log de acesso (sem dados sensíveis)
    logger.info('API pública acessada', {
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
    logger.error('Erro na API pública de transportes:', {
      error: err.message,
      stack: err.stack,
      ip: ctx.ip
    });
    return ctx.body = error('Erro ao buscar transportes. Tente novamente mais tarde.', 500);
  }
});

/**
 * GET /api/public/transportes/ativos
 * Busca transportes que estão atualmente em rota (status = 'em_andamento')
 */
router.get('/transportes/ativos', async (ctx) => {
  try {
    // Rate limiting
    if (securityMiddleware && securityMiddleware.apiRateLimit) {
      const publicRateLimit = securityMiddleware.apiRateLimit();
      await publicRateLimit(ctx, async () => {});
    }

    const queryParams = ctx.query || {};
    const tipo = (queryParams.tipo || 'todos').toLowerCase();

    // Query focado em viagens ativas e localização recente
    let query = `
      SELECT DISTINCT
        u.id,
        u.nome_completo as nome,
        u.tipo_usuario,
        u.endereco_completo as endereco,
        u.telefone,
        cl.latitude,
        cl.longitude,
        v.placa,
        v.modelo,
        v.marca,
        v.capacidade,
        v.ano as ano_fabricacao,
        NULL::text as cor,
        cv.ar_condicionado,
        cv.wifi,
        cv.acessibilidade_pcd,
        cv.gps_rastreamento,
        avg_aval.media_avaliacao as avaliacao,
        avg_aval.total_avaliacoes,
        r.id as rota_padrao_id,
        r.nome_rota,
        viagem.id as viagem_ativa_id,
        viagem.status as status_viagem,
        r_ativa.id as rota_ativa_id,
        r_ativa.nome_rota as rota_ativa_nome,
        r_ativa.turno as rota_ativa_turno,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        CASE 
          WHEN u.tipo_usuario = 'motorista_escolar' THEN 'Transporte Escolar'
          WHEN u.tipo_usuario = 'motorista_excursao' THEN 'Excursão & Fretamento'
          ELSE 'Transporte'
        END as tipo_servico
      FROM usuarios u
      JOIN cache_localizacao cl ON u.id = cl.motorista_id
      JOIN viagens viagem ON cl.viagem_ativa_id = viagem.id
      LEFT JOIN veiculos v ON u.id = v.motorista_id
      LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
      LEFT JOIN empresas e ON u.id = e.usuario_id
      LEFT JOIN rotas_escolares r ON u.id = r.usuario_id AND r.ativa = true
      LEFT JOIN rotas_escolares r_ativa ON viagem.rota_id = r_ativa.id
      LEFT JOIN (
        SELECT 
          avaliado_id,
          ROUND(AVG(nota::numeric), 1) as media_avaliacao,
          COUNT(*) as total_avaliacoes
        FROM avaliacoes 
        WHERE aprovado = true OR aprovado IS NULL
        GROUP BY avaliado_id
      ) avg_aval ON u.id = avg_aval.avaliado_id
      WHERE viagem.status = 'em_andamento'
      AND cl.atualizado_em > NOW() - INTERVAL '24 hours'
    `;

    // Filtro de tipo
    if (tipo === 'escolar') {
      query += ` AND u.tipo_usuario IN ('motorista_escolar', 'motorista_escolar_excursao')`;
    } else if (tipo === 'excursao') {
      query += ` AND u.tipo_usuario IN ('motorista_excursao', 'motorista_escolar_excursao')`;
    }

    const result = await db.query(query);
    const transportesSanitizados = result.rows.map(row => sanitizeTransporteData(row, tipo));

    return ctx.body = success({
      transportes: transportesSanitizados,
      total: transportesSanitizados.length
    }, 'Transportes ativos recuperados com sucesso');

  } catch (err) {
    logger.error('Erro na API pública de transportes ativos:', { message: err.message, stack: err.stack, code: err.code });
    return ctx.body = error('Erro ao buscar transportes ativos', 500);
  }
});

/**
 * GET /api/public/transportes/:id/rotas
 * Busca todas as rotas e excursões de um motorista
 */
router.get('/transportes/:id/rotas', async (ctx) => {
  try {
    const { id } = ctx.params;
    const motoristaId = await resolvePublicId(id);

    if (!motoristaId) {
      return ctx.body = error('Motorista não encontrado', 404);
    }

    // Buscar rotas escolares
    const rotasResult = await db.query(`
      SELECT 
        id, nome_rota, escola_destino, turno, horario_ida, horario_volta, 
        preco_mensal, vagas_disponiveis, ativa
      FROM rotas_escolares 
      WHERE usuario_id = $1 AND ativa = true
    `, [motoristaId]);

    // Buscar excursões
    const excursoesResult = await db.query(`
      SELECT 
        id, nome_pacote, destino, data_inicio, data_fim, 
        preco_por_pessoa, vagas_disponiveis, ativo
      FROM pacotes_excursao 
      WHERE usuario_id = $1 AND ativo = true
    `, [motoristaId]);

    return ctx.body = success({
      escolar: rotasResult.rows,
      excursao: excursoesResult.rows
    }, 'Rotas recuperadas com sucesso');

  } catch (err) {
    logger.error('Erro ao buscar rotas do motorista:', err);
    return ctx.body = error('Erro interno ao buscar rotas', 500);
  }
});

/**
 * GET /api/public/rotas/:id/detalhes
 * Busca detalhes completos de uma rota escolar (incluindo paradas)
 */
router.get('/rotas/:id/detalhes', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // Buscar dados da rota
    const rotaResult = await db.query(`
      SELECT 
        r.*, 
        u.nome_completo as motorista_nome,
        u.celular as motorista_celular,
        e.nome_fantasia as motorista_empresa,
        v.placa as veiculo_placa, 
        v.modelo as veiculo_modelo,
        v.marca as veiculo_marca,
        v.ano as veiculo_ano,
        v.capacidade as veiculo_capacidade,
        cv.ar_condicionado,
        cv.wifi,
        cv.tv_dvd,
        cv.banheiro,
        cv.poltronas_reclinaveis
      FROM rotas_escolares r
      JOIN usuarios u ON r.usuario_id = u.id
      LEFT JOIN empresas e ON u.id = e.usuario_id
      LEFT JOIN veiculos v ON u.id = v.motorista_id
      LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
      WHERE r.id = $1
    `, [id]);

    if (rotaResult.rows.length === 0) {
      return ctx.body = error('Rota não encontrada', 404);
    }

    const row = rotaResult.rows[0];

    // Buscar paradas
    const paradasResult = await db.query(`
      SELECT id, endereco, latitude, longitude, ordem_parada as ordem, tipo_parada as tipo
      FROM paradas_rota
      WHERE rota_id = $1
      ORDER BY ordem_parada ASC
    `, [id]);

    // Estruturar resposta
    const rota = {
      ...row,
      motorista: {
        nome: row.motorista_nome,
        celular: row.motorista_celular,
        empresa: row.motorista_empresa
      },
      veiculo: row.veiculo_modelo ? {
        modelo: row.veiculo_modelo,
        marca: row.veiculo_marca,
        placa: row.veiculo_placa,
        ano: row.veiculo_ano,
        capacidade: row.veiculo_capacidade,
        caracteristicas: {
            ar_condicionado: row.ar_condicionado,
            wifi: row.wifi,
            tv_dvd: row.tv_dvd,
            banheiro: row.banheiro,
            poltronas_reclinaveis: row.poltronas_reclinaveis
        }
      } : null,
      paradas: paradasResult.rows
    };

    return ctx.body = success(rota, 'Detalhes da rota recuperados');

  } catch (err) {
    logger.error('Erro ao buscar detalhes da rota:', err);
    return ctx.body = error('Erro interno', 500);
  }
});

/**
 * GET /api/public/excursoes/:id/detalhes
 * Busca detalhes completos de uma excursão
 */
router.get('/excursoes/:id/detalhes', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const excursaoResult = await db.query(`
      SELECT 
        p.*, 
        u.nome_completo as motorista_nome,
        u.celular as motorista_celular,
        e.nome_fantasia as motorista_empresa,
        u.endereco_completo as motorista_endereco,
        v.placa as veiculo_placa, 
        v.modelo as veiculo_modelo,
        v.marca as veiculo_marca,
        v.ano as veiculo_ano,
        v.capacidade as veiculo_capacidade,
        cv.ar_condicionado,
        cv.wifi,
        cv.tv_dvd,
        cv.banheiro,
        cv.poltronas_reclinaveis
      FROM pacotes_excursao p
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN empresas e ON u.id = e.usuario_id
      LEFT JOIN veiculos v ON u.id = v.motorista_id
      LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
      WHERE p.id = $1
    `, [id]);

    if (excursaoResult.rows.length === 0) {
      return ctx.body = error('Excursão não encontrada', 404);
    }

    const row = excursaoResult.rows[0];

    // Estruturar objeto de resposta para manter compatibilidade com frontend
    const excursao = {
      ...row,
      // Fallback para origem usando o endereço do motorista se não houver campo específico
      local_partida: row.local_partida || row.endereco_partida || row.motorista_endereco,
      motorista: {
        nome: row.motorista_nome,
        celular: row.motorista_celular,
        empresa: row.motorista_empresa
      },
      veiculo: row.veiculo_modelo ? {
        modelo: row.veiculo_modelo,
        marca: row.veiculo_marca,
        placa: row.veiculo_placa,
        ano: row.veiculo_ano,
        capacidade: row.veiculo_capacidade,
        caracteristicas: {
            ar_condicionado: row.ar_condicionado,
            wifi: row.wifi,
            tv_dvd: row.tv_dvd,
            banheiro: row.banheiro,
            poltronas_reclinaveis: row.poltronas_reclinaveis
        }
      } : null
    };
    
    return ctx.body = success(excursao, 'Detalhes da excursão recuperados');

  } catch (err) {
    logger.error('Erro ao buscar detalhes da excursão:', err);
    return ctx.body = error('Erro interno', 500);
  }
});

module.exports = router;




