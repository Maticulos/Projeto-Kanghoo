const Router = require('koa-router');

module.exports = function mountRoutes() {
  const router = new Router();

  // Importar e montar todos os sub-routers existentes
  const motoristaEscolarRoutes = require('./motorista-escolar');
  const responsavelRoutes = require('./responsavel');
  const rastreamentoRoutes = require('./rastreamento');
  const trackingApiRoutes = require('./tracking-api');
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
  const authRoutes = require('./auth');
  const contactRoutes = require('./contact');

  [
    motoristaEscolarRoutes,
    responsavelRoutes,
    rastreamentoRoutes,
    trackingApiRoutes,
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
    authRoutes,
    contactRoutes
  ].forEach((sub) => {
    if (sub && sub.routes) {
      router.use(sub.routes());
    }
  });

  return router;
};
