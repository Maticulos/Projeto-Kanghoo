/**
 * API Routes para Google Maps
 * 
 * Endpoints para:
 * - Geocodificação
 * - Cálculo de rotas
 * - Estimativas de tempo e distância
 * - Busca de lugares
 */

const Router = require('koa-router');
const googleMapsService = require('../utils/google-maps-service');
const { authenticateToken } = require('../middleware/auth-utils');
const { validateRequest } = require('../middleware/validation');

const router = new Router({
    prefix: '/api/maps'
});

/**
 * GET /api/maps/status
 * Verifica o status do serviço Google Maps
 */
router.get('/status', async (ctx) => {
    try {
        const isAvailable = googleMapsService.isAvailable();
        const cacheStats = googleMapsService.getCacheStats();
        
        ctx.body = {
            success: true,
            data: {
                available: isAvailable,
                cache: cacheStats,
                message: isAvailable ? 'Serviço Google Maps disponível' : 'Serviço Google Maps não configurado'
            }
        };
    } catch (error) {
        console.error('[MAPS-API] Erro ao verificar status:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor'
        };
    }
});

/**
 * POST /api/maps/geocode
 * Converte endereço em coordenadas
 */
router.post('/geocode', authenticateToken, async (ctx) => {
    try {
        const { address } = ctx.request.body;
        
        if (!address) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Endereço é obrigatório'
            };
            return;
        }

        const result = await googleMapsService.geocode(address);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro na geocodificação:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao geocodificar endereço'
        };
    }
});

/**
 * POST /api/maps/reverse-geocode
 * Converte coordenadas em endereço
 */
router.post('/reverse-geocode', authenticateToken, async (ctx) => {
    try {
        const { latitude, longitude } = ctx.request.body;
        
        if (!latitude || !longitude) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Latitude e longitude são obrigatórias'
            };
            return;
        }

        const result = await googleMapsService.reverseGeocode(latitude, longitude);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro na geocodificação reversa:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao converter coordenadas'
        };
    }
});

/**
 * POST /api/maps/route
 * Calcula rota entre dois pontos
 */
router.post('/route', authenticateToken, async (ctx) => {
    try {
        const { origin, destination, options = {} } = ctx.request.body;
        
        if (!origin || !destination) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Origem e destino são obrigatórios'
            };
            return;
        }

        const result = await googleMapsService.calculateRoute(origin, destination, options);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro no cálculo de rota:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao calcular rota'
        };
    }
});

/**
 * POST /api/maps/distance-matrix
 * Calcula matriz de distâncias entre múltiplos pontos
 */
router.post('/distance-matrix', authenticateToken, async (ctx) => {
    try {
        const { origins, destinations, options = {} } = ctx.request.body;
        
        if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Origins e destinations devem ser arrays'
            };
            return;
        }

        if (origins.length === 0 || destinations.length === 0) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Origins e destinations não podem estar vazios'
            };
            return;
        }

        const result = await googleMapsService.calculateDistanceMatrix(origins, destinations, options);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro no cálculo da matriz de distâncias:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao calcular matriz de distâncias'
        };
    }
});

/**
 * POST /api/maps/nearby-places
 * Busca lugares próximos
 */
router.post('/nearby-places', authenticateToken, async (ctx) => {
    try {
        const { location, type, radius = 5000 } = ctx.request.body;
        
        if (!location || !type) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Localização e tipo são obrigatórios'
            };
            return;
        }

        const result = await googleMapsService.findNearbyPlaces(location, type, radius);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro na busca de lugares próximos:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao buscar lugares próximos'
        };
    }
});

/**
 * POST /api/maps/optimize-route
 * Otimiza rota para múltiplos pontos (problema do caixeiro viajante simplificado)
 */
router.post('/optimize-route', authenticateToken, async (ctx) => {
    try {
        const { origin, destination, waypoints, options = {} } = ctx.request.body;
        
        if (!origin || !destination) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Origem e destino são obrigatórios'
            };
            return;
        }

        if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
            // Se não há waypoints, calcular rota simples
            const result = await googleMapsService.calculateRoute(origin, destination, options);
            ctx.body = {
                success: true,
                data: result
            };
            return;
        }

        // Calcular rota com waypoints otimizados
        const optimizedOptions = {
            ...options,
            waypoints: waypoints,
            optimize: true
        };

        const result = await googleMapsService.calculateRoute(origin, destination, optimizedOptions);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro na otimização de rota:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao otimizar rota'
        };
    }
});

/**
 * POST /api/maps/school-route
 * Calcula rota escolar otimizada com múltiplas paradas
 */
router.post('/school-route', authenticateToken, async (ctx) => {
    try {
        const { 
            school_address, 
            student_addresses, 
            return_trip = false,
            options = {} 
        } = ctx.request.body;
        
        if (!school_address || !student_addresses || !Array.isArray(student_addresses)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Endereço da escola e endereços dos alunos são obrigatórios'
            };
            return;
        }

        if (student_addresses.length === 0) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'Pelo menos um endereço de aluno é necessário'
            };
            return;
        }

        // Para rota escolar, vamos calcular:
        // 1. Ida: primeiro aluno -> outros alunos -> escola
        // 2. Volta: escola -> alunos (ordem reversa)
        
        let routes = {};
        
        // Rota de ida
        const outboundRoute = await googleMapsService.calculateRoute(
            student_addresses[0], 
            school_address, 
            {
                ...options,
                waypoints: student_addresses.slice(1),
                optimize: true
            }
        );
        
        routes.outbound = {
            ...outboundRoute,
            description: 'Rota de ida (casa -> escola)',
            stops: [student_addresses[0], ...student_addresses.slice(1), school_address]
        };

        // Rota de volta (se solicitada)
        if (return_trip) {
            const returnRoute = await googleMapsService.calculateRoute(
                school_address,
                student_addresses[student_addresses.length - 1],
                {
                    ...options,
                    waypoints: student_addresses.slice(0, -1).reverse(),
                    optimize: true
                }
            );
            
            routes.return = {
                ...returnRoute,
                description: 'Rota de volta (escola -> casa)',
                stops: [school_address, ...student_addresses.slice(0, -1).reverse(), student_addresses[student_addresses.length - 1]]
            };
        }

        // Calcular estatísticas totais
        const totalDistance = routes.outbound.distance.value + (routes.return ? routes.return.distance.value : 0);
        const totalDuration = routes.outbound.duration.value + (routes.return ? routes.return.duration.value : 0);
        
        ctx.body = {
            success: true,
            data: {
                routes,
                summary: {
                    total_distance: {
                        text: `${(totalDistance / 1000).toFixed(1)} km`,
                        value: totalDistance
                    },
                    total_duration: {
                        text: `${Math.round(totalDuration / 60)} min`,
                        value: totalDuration
                    },
                    student_count: student_addresses.length,
                    has_return_trip: return_trip
                }
            }
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro no cálculo de rota escolar:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao calcular rota escolar'
        };
    }
});

/**
 * DELETE /api/maps/cache
 * Limpa o cache do Google Maps
 */
router.delete('/cache', authenticateToken, async (ctx) => {
    try {
        googleMapsService.clearCache();
        
        ctx.body = {
            success: true,
            message: 'Cache limpo com sucesso'
        };
        
    } catch (error) {
        console.error('[MAPS-API] Erro ao limpar cache:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro ao limpar cache'
        };
    }
});

module.exports = router;