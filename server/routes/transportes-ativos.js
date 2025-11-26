const Router = require('koa-router');
const db = require('../config/db');
const { DEMO_MODE } = require('../config/app-config');
const logger = require('../utils/logger');

const router = new Router({ prefix: '' });

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const toRad = (deg) => deg * (Math.PI / 180);
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildDemoTransportes(tipo = 'todos') {
  const base = [-23.5505, -46.6333];
  const demo = [
    {
      id: 'demo-esc-1',
      tipo: 'escolar',
      nome: 'Van Azul - Zona Norte',
      latitude: base[0] + 0.01,
      longitude: base[1] + 0.01,
      preco: 480,
      avaliacao: 4.8,
      capacidade: 20,
      status: 'embarque'
    },
    {
      id: 'demo-esc-2',
      tipo: 'escolar',
      nome: 'Circuito Leste',
      latitude: base[0] - 0.012,
      longitude: base[1] + 0.006,
      preco: 420,
      avaliacao: 4.6,
      capacidade: 18,
      status: 'em_rota'
    },
    {
      id: 'demo-exc-1',
      tipo: 'excursao',
      nome: 'Excursão Campos do Jordão',
      latitude: base[0] + 0.02,
      longitude: base[1] - 0.008,
      preco: 150,
      avaliacao: 4.9,
      capacidade: 40,
      status: 'embarque'
    }
  ];

  return demo.filter((t) => tipo === 'todos' ? true : t.tipo === tipo);
}

async function listAtivos(ctx) {
  const tipo = (ctx.query.tipo || ctx.query.tipo_rota || 'todos').toLowerCase();
  const lat = ctx.query.latitude ? parseFloat(ctx.query.latitude) : null;
  const lng = ctx.query.longitude ? parseFloat(ctx.query.longitude) : null;
  const raioKm = Math.min(50, Math.max(1, parseFloat(ctx.query.raio_km || ctx.query.raio || 50) || 50));

  const filterByDistance = (lista) => {
    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return lista;
    return lista.filter((item) => {
      if (item.latitude == null || item.longitude == null) return true;
      const dist = haversineDistance([lat, lng], [item.latitude, item.longitude]);
      return dist <= raioKm;
    });
  };

  if (DEMO_MODE) {
    const demoList = filterByDistance(buildDemoTransportes(tipo));
    ctx.body = { success: true, transportes: demoList };
    return;
  }

  try {
    const whereParts = ['r.latitude IS NOT NULL', 'r.longitude IS NOT NULL'];
    const params = [];
    let paramCount = 0;

    if (tipo === 'escolar') {
      whereParts.push(`u.tipo_usuario IN ('motorista_escolar', 'motorista_escolar_excursao')`);
    } else if (tipo === 'excursao') {
      whereParts.push(`u.tipo_usuario IN ('motorista_excursao', 'motorista_escolar_excursao')`);
    } else {
      whereParts.push(`u.tipo_usuario IN ('motorista_escolar', 'motorista_excursao', 'motorista_escolar_excursao')`);
    }

    if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      whereParts.push(`
        (
          6371 * acos(
            cos(radians(${lat})) * cos(radians(r.latitude)) * 
            cos(radians(r.longitude) - radians(${lng})) + 
            sin(radians(${lat})) * sin(radians(r.latitude))
          )
        ) <= ${raioKm}
      `);
    }

    const query = `
      SELECT
        r.motorista_id AS id,
        r.latitude,
        r.longitude,
        r.timestamp_localizacao,
        u.tipo_usuario AS tipo,
        u.nome_completo AS nome,
        COALESCE(v.preco_base, r.preco_mensal, 0) AS preco,
        COALESCE(v.capacidade, 0) AS capacidade
      FROM rastreamento r
      JOIN usuarios u ON u.id = r.motorista_id
      LEFT JOIN veiculos v ON v.motorista_id = u.id
      ${whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : ''}
      ORDER BY r.timestamp_localizacao DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);
    const transportes = filterByDistance(res.rows.map((row, idx) => ({
      id: row.id || `real-${idx}`,
      tipo: row.tipo || 'escolar',
      nome: row.nome || 'Transporte ativo',
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      timestamp: row.timestamp_localizacao,
      preco: row.preco ? parseFloat(row.preco) : null,
      capacidade: row.capacidade ? parseInt(row.capacidade) : null,
      status: 'em_rota'
    })));

    ctx.body = { success: true, transportes };
  } catch (err) {
    logger.error('[transportes-ativos] Erro ao buscar transportes ativos:', err);
    ctx.status = 500;
    ctx.body = { success: false, message: 'Erro ao buscar transportes ativos' };
  }
}

router.get('/transportes-ativos', listAtivos);
router.get('/public/transportes/ativos', listAtivos);

module.exports = router;
