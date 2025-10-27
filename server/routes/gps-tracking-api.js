/**
 * API Routes para Rastreamento GPS
 * 
 * Endpoints para:
 * - Iniciar/parar rastreamento
 * - Atualizar posição GPS
 * - Obter dados de rastreamento
 * - Histórico de rotas
 * - Estatísticas
 */

const Router = require('koa-router');
const gpsTrackingService = require('../utils/gps-tracking-service');
const { authenticateToken } = require('../middleware/auth-utils');

const router = new Router({
    prefix: '/api/gps'
});

/**
 * GET /api/gps/status
 * Verifica o status do serviço de rastreamento GPS
 */
router.get('/status', async (ctx) => {
    try {
        const stats = gpsTrackingService.getStats();
        
        ctx.body = {
            success: true,
            data: {
                service_status: 'active',
                ...stats,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('[GPS-API] Erro ao verificar status:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor'
        };
    }
});

/**
 * POST /api/gps/start-tracking
 * Inicia o rastreamento de um veículo
 */
router.post('/start-tracking', authenticateToken, async (ctx) => {
    try {
        const { vehicleId, driverData, routeData } = ctx.request.body;
        
        if (!vehicleId || !driverData) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'vehicleId e driverData são obrigatórios'
            };
            return;
        }

        const result = await gpsTrackingService.startTracking(vehicleId, driverData, routeData);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro ao iniciar rastreamento:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao iniciar rastreamento'
        };
    }
});

/**
 * POST /api/gps/update-position
 * Atualiza a posição GPS de um veículo
 */
router.post('/update-position', authenticateToken, async (ctx) => {
    try {
        const { vehicleId, latitude, longitude, speed, heading, timestamp } = ctx.request.body;
        
        if (!vehicleId || !latitude || !longitude) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'vehicleId, latitude e longitude são obrigatórios'
            };
            return;
        }

        const positionData = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            speed: speed ? parseFloat(speed) : 0,
            heading: heading ? parseFloat(heading) : 0,
            timestamp: timestamp || new Date().toISOString()
        };

        const result = await gpsTrackingService.updatePosition(vehicleId, positionData);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro ao atualizar posição:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao atualizar posição'
        };
    }
});

/**
 * POST /api/gps/stop-tracking
 * Para o rastreamento de um veículo
 */
router.post('/stop-tracking', authenticateToken, async (ctx) => {
    try {
        const { vehicleId } = ctx.request.body;
        
        if (!vehicleId) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'vehicleId é obrigatório'
            };
            return;
        }

        const result = await gpsTrackingService.stopTracking(vehicleId);
        
        ctx.body = {
            success: true,
            data: result
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro ao parar rastreamento:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao parar rastreamento'
        };
    }
});

/**
 * GET /api/gps/tracking/:vehicleId
 * Obtém dados de rastreamento de um veículo específico
 */
router.get('/tracking/:vehicleId', authenticateToken, async (ctx) => {
    try {
        const { vehicleId } = ctx.params;
        
        const trackingData = gpsTrackingService.getTrackingData(vehicleId);
        
        if (!trackingData) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: 'Rastreamento não encontrado para este veículo'
            };
            return;
        }

        ctx.body = {
            success: true,
            data: trackingData
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro ao obter dados de rastreamento:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor'
        };
    }
});

/**
 * GET /api/gps/history/:vehicleId
 * Obtém histórico de rota de um veículo
 */
router.get('/history/:vehicleId', authenticateToken, async (ctx) => {
    try {
        const { vehicleId } = ctx.params;
        const { limit } = ctx.query;
        
        const limitNumber = limit ? parseInt(limit) : 100;
        const history = gpsTrackingService.getRouteHistory(vehicleId, limitNumber);
        
        ctx.body = {
            success: true,
            data: {
                vehicleId,
                history,
                count: history.length,
                limit: limitNumber
            }
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro ao obter histórico:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor'
        };
    }
});

/**
 * GET /api/gps/active-vehicles
 * Lista todos os veículos com rastreamento ativo
 */
router.get('/active-vehicles', authenticateToken, async (ctx) => {
    try {
        const activeVehicles = [];
        
        // Obter dados de todos os veículos ativos
        for (const [vehicleId] of gpsTrackingService.activeTracking) {
            const trackingData = gpsTrackingService.getTrackingData(vehicleId);
            if (trackingData && trackingData.isActive) {
                activeVehicles.push(trackingData);
            }
        }
        
        ctx.body = {
            success: true,
            data: {
                vehicles: activeVehicles,
                count: activeVehicles.length
            }
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro ao listar veículos ativos:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro interno do servidor'
        };
    }
});

/**
 * POST /api/gps/simulate-position
 * Simula atualização de posição GPS (para testes)
 * Endpoint público para facilitar testes
 */
router.post('/simulate-position', async (ctx) => {
    try {
        const { vehicleId, route, speed = 50 } = ctx.request.body;
        
        if (!vehicleId || !route || !Array.isArray(route) || route.length < 2) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'vehicleId e route (array com pelo menos 2 pontos) são obrigatórios'
            };
            return;
        }

        // Simular movimento ao longo da rota
        let currentIndex = 0;
        const simulationInterval = setInterval(async () => {
            try {
                if (currentIndex >= route.length) {
                    clearInterval(simulationInterval);
                    return;
                }

                const point = route[currentIndex];
                const positionData = {
                    latitude: point.lat || point.latitude,
                    longitude: point.lng || point.longitude,
                    speed: speed + (Math.random() * 10 - 5), // Variação na velocidade
                    heading: currentIndex < route.length - 1 ? 
                        calculateBearing(point, route[currentIndex + 1]) : 0,
                    timestamp: new Date().toISOString()
                };

                await gpsTrackingService.updatePosition(vehicleId, positionData);
                currentIndex++;

            } catch (error) {
                console.error('[GPS-API] Erro na simulação:', error);
                clearInterval(simulationInterval);
            }
        }, 5000); // Atualizar a cada 5 segundos

        ctx.body = {
            success: true,
            data: {
                message: 'Simulação iniciada',
                vehicleId,
                route_points: route.length,
                update_interval: '5 segundos'
            }
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro ao iniciar simulação:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao iniciar simulação'
        };
    }
});

/**
 * POST /api/gps/batch-update
 * Atualiza posições de múltiplos veículos em lote
 */
router.post('/batch-update', authenticateToken, async (ctx) => {
    try {
        const { updates } = ctx.request.body;
        
        if (!updates || !Array.isArray(updates)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: 'updates deve ser um array'
            };
            return;
        }

        const results = [];
        
        for (const update of updates) {
            try {
                const { vehicleId, latitude, longitude, speed, heading, timestamp } = update;
                
                if (!vehicleId || !latitude || !longitude) {
                    results.push({
                        vehicleId,
                        success: false,
                        error: 'vehicleId, latitude e longitude são obrigatórios'
                    });
                    continue;
                }

                const positionData = {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    speed: speed ? parseFloat(speed) : 0,
                    heading: heading ? parseFloat(heading) : 0,
                    timestamp: timestamp || new Date().toISOString()
                };

                const result = await gpsTrackingService.updatePosition(vehicleId, positionData);
                results.push({
                    vehicleId,
                    success: true,
                    data: result
                });

            } catch (error) {
                results.push({
                    vehicleId: update.vehicleId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        ctx.body = {
            success: true,
            data: {
                results,
                total: updates.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            }
        };
        
    } catch (error) {
        console.error('[GPS-API] Erro na atualização em lote:', error);
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: error.message || 'Erro na atualização em lote'
        };
    }
});

/**
 * Calcula o bearing (direção) entre dois pontos
 */
function calculateBearing(point1, point2) {
    const lat1 = point1.lat || point1.latitude;
    const lng1 = point1.lng || point1.longitude;
    const lat2 = point2.lat || point2.latitude;
    const lng2 = point2.lng || point2.longitude;

    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

module.exports = router;