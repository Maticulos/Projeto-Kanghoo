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
<<<<<<< HEAD
  const publicTransportesRoutes = require('./public-transportes');
    const viagensRoutes = require('./viagens');
    const veiculosRoutes = require('./veiculos');
  
    // Rota de informações da API
    router.get('/api', async (ctx) => {
      ctx.body = {
        success: true,
        message: 'API do Sistema de Transporte Escolar',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth/login',
          publicTransportes: '/api/public/transportes',
          docs: 'Consulte a documentação da API'
        },
        timestamp: new Date().toISOString()
      };
    });
  
    [
      viagensRoutes,
      veiculosRoutes,
      publicTransportesRoutes, // API pública - deve vir antes para não ser interceptada
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
      contactRoutes
    ].forEach((sub) => {    if (sub && sub.routes) {
=======
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
>>>>>>> 7e3033439b6ddb76a0413d080f32ee1cb52d2502
      router.use(sub.routes());
    }
  });

  return router;
};
