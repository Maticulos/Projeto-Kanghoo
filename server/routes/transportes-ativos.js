const Router = require('koa-router');
const db = require('../config/db');
const { DEMO_MODE } = require('../config/app-config');
const logger = require('../utils/logger');

const router = new Router({ prefix: '/api/transportes-ativos' });

// Retorna transportes ativos (escolar/excursão) com posição atual
router.get('/', async (ctx) => {
  // Mock rápido para demo
  const demoData = [
    {
      id: 'demo-esc-1',
      tipo: 'escolar',
      nome: 'Van Azul - Zona Norte',
      latitude: -23.5505,
      longitude: -46.6333,
      preco: 480,
      avaliacao: 4.8
    },
    {
      id: 'demo-esc-2',
      tipo: 'escolar',
      nome: 'Circuito Leste',
      latitude: -23.56,
      longitude: -46.64,
      preco: 420,
      avaliacao: 4.6
    },
    {
      id: 'demo-exc-1',
      tipo: 'excursao',
      nome: 'Excursão Campos do Jordão',
      latitude: -23.54,
      longitude: -46.62,
      preco: 150,
      avaliacao: 4.9
    }
  ];

  if (DEMO_MODE) {
    ctx.body = { success: true, transportes: demoData };
    return;
  }

  try {
    const res = await db.query(
      `
        SELECT
          r.motorista_id as id,
          r.latitude,
          r.longitude,
          r.timestamp_localizacao,
          u.tipo_usuario as tipo,
          u.nome_completo as nome
        FROM rastreamento r
        JOIN usuarios u ON u.id = r.motorista_id
        WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
        ORDER BY r.timestamp_localizacao DESC
        LIMIT 50
      `
    );

    const transportes = res.rows.map((row, idx) => ({
      id: row.id || `real-${idx}`,
      tipo: row.tipo || 'escolar',
      nome: row.nome || 'Transporte ativo',
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      timestamp: row.timestamp_localizacao
    }));

    ctx.body = { success: true, transportes };
  } catch (err) {
    logger.error('[transportes-ativos] Erro ao buscar transportes ativos:', err);
    ctx.status = 500;
    ctx.body = { success: false, message: 'Erro ao buscar transportes ativos' };
  }
});

module.exports = router;
