const Router = require('koa-router');

module.exports = function mountRoutes() {
  const router = new Router({ prefix: '/api' });

  // Importar e montar todos os sub-routers existentes
  const motoristaEscolarRoutes = require('./motorista-escolar');
  const responsavelRoutes = require('./responsavel');
  const trackingApiRoutes = require('./tracking-api');
  const rastreamentoRoutes = require('./rastreamento');
  const transportesRoutes = require('./transportes');
  const notificationPreferencesRoutes = require('./notification-preferences');
  const rotasEscolaresRoutes = require('./rotas-escolares');
  const planosAssinaturaRoutes = require('./planos-assinatura');
  const buscarRotasRoutes = require('./buscar-rotas');
  const conferenciaCriancasRoutes = require('./conferencia-criancas');
  const rastreamentoGpsRoutes = require('./rastreamento-gps');
  const googleMapsApiRoutes = require('./google-maps-api');
  const gpsTrackingApiRoutes = require('./gps-tracking-api');
  const mapsConfigRoutes = require('./maps-config');
  const motoristaExcursaoRoutes = require('./motorista-excursao');
  const posicaoCriancasRoutes = require('./posicao-criancas');
  const atualizacaoPosicaoRoutes = require('./atualizacao-posicao');
  const devToolsRoutes = require('./dev-tools');
  const authRoutes = require('./auth');
  const validateTokenRoutes = require('./validate-token');
  const contactRoutes = require('./contact');
  const configRoutes = require('./config');
  const transportesAtivosRoutes = require('./transportes-ativos');

  [
    motoristaEscolarRoutes,
    responsavelRoutes,
    trackingApiRoutes,
    rastreamentoRoutes,
    transportesRoutes,
    notificationPreferencesRoutes,
    rotasEscolaresRoutes,
    planosAssinaturaRoutes,
    buscarRotasRoutes,
    conferenciaCriancasRoutes,
    rastreamentoGpsRoutes,
    googleMapsApiRoutes,
    gpsTrackingApiRoutes,
    mapsConfigRoutes,
    motoristaExcursaoRoutes,
    posicaoCriancasRoutes,
    atualizacaoPosicaoRoutes,
    devToolsRoutes,
    authRoutes,
    validateTokenRoutes,
    contactRoutes,
    configRoutes,
    transportesAtivosRoutes
  ].forEach((sub) => {
    if (sub && sub.routes) {
      router.use(sub.routes());
    }
  });

  return router;
};
