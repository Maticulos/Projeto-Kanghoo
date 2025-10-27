const Router = require('koa-router');
const googleMapsConfig = require('../config/google-maps-config');

const router = new Router();

/**
 * Endpoint para obter configurações do Google Maps para o frontend
 * GET /api/maps/config
 */
router.get('/api/maps/config', async (ctx) => {
    try {
        // Retornar apenas configurações seguras para o frontend
        const config = {
            apiKey: googleMapsConfig.apiKey,
            region: googleMapsConfig.region,
            language: googleMapsConfig.language,
            libraries: ['geometry', 'places'],
            mapDefaults: {
                zoom: 12,
                center: { lat: -23.5505, lng: -46.6333 }, // São Paulo
                mapTypeId: 'roadmap'
            },
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'labels',
                    stylers: [{ visibility: 'simplified' }]
                }
            ]
        };

        ctx.body = {
            success: true,
            data: config,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Erro ao obter configurações do Google Maps:', error);
        
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        };
    }
});

/**
 * Endpoint para verificar se a API do Google Maps está configurada
 * GET /api/maps/status
 */
router.get('/api/maps/status', async (ctx) => {
    try {
        const isConfigured = !!googleMapsConfig.apiKey && googleMapsConfig.apiKey !== 'your_google_maps_api_key_here';
        
        ctx.body = {
            success: true,
            data: {
                configured: isConfigured,
                region: googleMapsConfig.region,
                language: googleMapsConfig.language,
                servicesEnabled: {
                    directions: isConfigured,
                    geocoding: isConfigured,
                    places: isConfigured,
                    distanceMatrix: isConfigured
                }
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Erro ao verificar status do Google Maps:', error);
        
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        };
    }
});

module.exports = router;