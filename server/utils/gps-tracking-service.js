/**
 * Serviço de Rastreamento GPS com Google Maps
 * 
 * Integra rastreamento GPS em tempo real com visualização no Google Maps
 * Funcionalidades:
 * - Rastreamento de veículos em tempo real
 * - Cálculo de ETA (Estimated Time of Arrival)
 * - Geofencing para alertas de proximidade
 * - Histórico de rotas
 * - Notificações automáticas
 */

const googleMapsService = require('./google-maps-service');
const NotificationHub = require('../realtime/notification-hub');

class GPSTrackingService {
    constructor() {
        this.activeTracking = new Map(); // vehicleId -> tracking data
        this.geofences = new Map(); // geofenceId -> geofence data
        this.routeHistory = new Map(); // vehicleId -> route history
        this.notificationHub = null;
        
        // Configurações padrão
        this.config = {
            updateInterval: 30000, // 30 segundos
            geofenceRadius: 200, // 200 metros
            etaUpdateThreshold: 300, // 5 minutos
            maxHistoryPoints: 1000,
            speedThreshold: {
                min: 5, // km/h - velocidade mínima para considerar movimento
                max: 80 // km/h - velocidade máxima permitida
            }
        };
    }

    /**
     * Inicializa o serviço com o NotificationHub
     */
    initialize(notificationHub) {
        this.notificationHub = notificationHub;
        console.log('[GPS-TRACKING] Serviço inicializado');
    }

    /**
     * Inicia o rastreamento de um veículo
     */
    async startTracking(vehicleId, driverData, routeData) {
        try {
            const trackingData = {
                vehicleId,
                driverData,
                routeData,
                currentPosition: null,
                lastUpdate: null,
                isActive: true,
                eta: null,
                speed: 0,
                heading: 0,
                status: 'started',
                notifications: {
                    proximityAlerts: new Set(),
                    etaUpdates: new Set()
                }
            };

            this.activeTracking.set(vehicleId, trackingData);
            
            // Inicializar histórico de rota
            if (!this.routeHistory.has(vehicleId)) {
                this.routeHistory.set(vehicleId, []);
            }

            // Configurar geofences para as paradas da rota
            if (routeData && routeData.stops) {
                await this.setupGeofences(vehicleId, routeData.stops);
            }

            console.log(`[GPS-TRACKING] Rastreamento iniciado para veículo ${vehicleId}`);
            
            // Notificar início do rastreamento
            if (this.notificationHub) {
                await this.notificationHub.sendNotification({
                    type: 'tracking_started',
                    vehicleId,
                    message: 'Rastreamento iniciado',
                    data: {
                        driver: driverData.name,
                        route: routeData.name || 'Rota escolar'
                    }
                });
            }

            return {
                success: true,
                trackingId: vehicleId,
                message: 'Rastreamento iniciado com sucesso'
            };

        } catch (error) {
            console.error('[GPS-TRACKING] Erro ao iniciar rastreamento:', error);
            throw new Error('Falha ao iniciar rastreamento: ' + error.message);
        }
    }

    /**
     * Atualiza a posição GPS de um veículo
     */
    async updatePosition(vehicleId, positionData) {
        try {
            const tracking = this.activeTracking.get(vehicleId);
            if (!tracking || !tracking.isActive) {
                throw new Error('Rastreamento não encontrado ou inativo');
            }

            const { latitude, longitude, speed = 0, heading = 0, timestamp } = positionData;
            
            // Validar coordenadas
            if (!this.isValidCoordinate(latitude, longitude)) {
                throw new Error('Coordenadas GPS inválidas');
            }

            const currentPosition = {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                speed: parseFloat(speed),
                heading: parseFloat(heading),
                timestamp: timestamp || new Date().toISOString()
            };

            // Atualizar dados de rastreamento
            tracking.currentPosition = currentPosition;
            tracking.lastUpdate = new Date().toISOString();
            tracking.speed = speed;
            tracking.heading = heading;

            // Adicionar ao histórico
            this.addToHistory(vehicleId, currentPosition);

            // Calcular ETA se há rota definida
            if (tracking.routeData && tracking.routeData.destination) {
                await this.updateETA(vehicleId, currentPosition, tracking.routeData.destination);
            }

            // Verificar geofences
            await this.checkGeofences(vehicleId, currentPosition);

            // Verificar velocidade
            this.checkSpeedLimits(vehicleId, speed);

            // Notificar atualização de posição
            if (this.notificationHub) {
                await this.notificationHub.sendNotification({
                    type: 'position_update',
                    vehicleId,
                    data: {
                        position: currentPosition,
                        eta: tracking.eta,
                        speed: speed,
                        status: tracking.status
                    }
                });
            }

            return {
                success: true,
                position: currentPosition,
                eta: tracking.eta,
                message: 'Posição atualizada com sucesso'
            };

        } catch (error) {
            console.error('[GPS-TRACKING] Erro ao atualizar posição:', error);
            throw new Error('Falha ao atualizar posição: ' + error.message);
        }
    }

    /**
     * Calcula e atualiza o ETA
     */
    async updateETA(vehicleId, currentPosition, destination) {
        try {
            const tracking = this.activeTracking.get(vehicleId);
            if (!tracking) return;

            // Calcular rota atual até o destino
            const routeResult = await googleMapsService.calculateRoute(
                `${currentPosition.latitude},${currentPosition.longitude}`,
                destination,
                {
                    mode: 'driving',
                    traffic_model: 'best_guess',
                    departure_time: 'now'
                }
            );

            if (routeResult && routeResult.duration) {
                const newETA = {
                    duration: routeResult.duration,
                    distance: routeResult.distance,
                    arrival_time: new Date(Date.now() + routeResult.duration.value * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                };

                // Verificar se houve mudança significativa no ETA
                const oldETA = tracking.eta;
                const etaChanged = !oldETA || 
                    Math.abs(newETA.duration.value - oldETA.duration.value) > this.config.etaUpdateThreshold;

                tracking.eta = newETA;

                // Notificar mudança significativa no ETA
                if (etaChanged && this.notificationHub) {
                    await this.notificationHub.sendNotification({
                        type: 'eta_update',
                        vehicleId,
                        message: `ETA atualizado: ${newETA.duration.text}`,
                        data: {
                            eta: newETA,
                            previous_eta: oldETA
                        }
                    });
                }
            }

        } catch (error) {
            console.error('[GPS-TRACKING] Erro ao calcular ETA:', error);
        }
    }

    /**
     * Configura geofences para as paradas da rota
     */
    async setupGeofences(vehicleId, stops) {
        try {
            for (let i = 0; i < stops.length; i++) {
                const stop = stops[i];
                const geofenceId = `${vehicleId}_stop_${i}`;
                
                // Geocodificar endereço se necessário
                let coordinates;
                if (typeof stop === 'string') {
                    const geocodeResult = await googleMapsService.geocode(stop);
                    if (geocodeResult && geocodeResult.location) {
                        coordinates = geocodeResult.location;
                    }
                } else if (stop.latitude && stop.longitude) {
                    coordinates = { lat: stop.latitude, lng: stop.longitude };
                }

                if (coordinates) {
                    this.geofences.set(geofenceId, {
                        vehicleId,
                        stopIndex: i,
                        center: coordinates,
                        radius: this.config.geofenceRadius,
                        address: stop.address || stop,
                        triggered: false
                    });
                }
            }

            console.log(`[GPS-TRACKING] ${this.geofences.size} geofences configurados para veículo ${vehicleId}`);

        } catch (error) {
            console.error('[GPS-TRACKING] Erro ao configurar geofences:', error);
        }
    }

    /**
     * Verifica se o veículo entrou em algum geofence
     */
    async checkGeofences(vehicleId, currentPosition) {
        try {
            for (const [geofenceId, geofence] of this.geofences) {
                if (geofence.vehicleId !== vehicleId || geofence.triggered) {
                    continue;
                }

                const distance = this.calculateDistance(
                    currentPosition.latitude,
                    currentPosition.longitude,
                    geofence.center.lat,
                    geofence.center.lng
                );

                if (distance <= geofence.radius) {
                    geofence.triggered = true;
                    
                    // Notificar proximidade
                    if (this.notificationHub) {
                        await this.notificationHub.sendNotification({
                            type: 'proximity_alert',
                            vehicleId,
                            message: `Veículo próximo à parada: ${geofence.address}`,
                            data: {
                                stop_index: geofence.stopIndex,
                                address: geofence.address,
                                distance: Math.round(distance),
                                position: currentPosition
                            }
                        });
                    }

                    console.log(`[GPS-TRACKING] Geofence ativado: ${geofenceId} - ${geofence.address}`);
                }
            }

        } catch (error) {
            console.error('[GPS-TRACKING] Erro ao verificar geofences:', error);
        }
    }

    /**
     * Verifica limites de velocidade
     */
    checkSpeedLimits(vehicleId, speed) {
        try {
            const tracking = this.activeTracking.get(vehicleId);
            if (!tracking) return;

            if (speed > this.config.speedThreshold.max) {
                tracking.status = 'speeding';
                
                // Notificar excesso de velocidade
                if (this.notificationHub) {
                    this.notificationHub.sendNotification({
                        type: 'speed_alert',
                        vehicleId,
                        message: `Excesso de velocidade detectado: ${speed} km/h`,
                        data: {
                            current_speed: speed,
                            max_speed: this.config.speedThreshold.max,
                            severity: 'high'
                        }
                    });
                }
            } else if (speed < this.config.speedThreshold.min) {
                tracking.status = 'stopped';
            } else {
                tracking.status = 'moving';
            }

        } catch (error) {
            console.error('[GPS-TRACKING] Erro ao verificar velocidade:', error);
        }
    }

    /**
     * Para o rastreamento de um veículo
     */
    async stopTracking(vehicleId) {
        try {
            const tracking = this.activeTracking.get(vehicleId);
            if (!tracking) {
                throw new Error('Rastreamento não encontrado');
            }

            tracking.isActive = false;
            tracking.status = 'stopped';

            // Remover geofences relacionados
            for (const [geofenceId, geofence] of this.geofences) {
                if (geofence.vehicleId === vehicleId) {
                    this.geofences.delete(geofenceId);
                }
            }

            // Notificar fim do rastreamento
            if (this.notificationHub) {
                await this.notificationHub.sendNotification({
                    type: 'tracking_stopped',
                    vehicleId,
                    message: 'Rastreamento finalizado',
                    data: {
                        final_position: tracking.currentPosition,
                        duration: tracking.lastUpdate ? 
                            new Date(tracking.lastUpdate) - new Date(tracking.routeData.start_time) : 0
                    }
                });
            }

            console.log(`[GPS-TRACKING] Rastreamento finalizado para veículo ${vehicleId}`);

            return {
                success: true,
                message: 'Rastreamento finalizado com sucesso'
            };

        } catch (error) {
            console.error('[GPS-TRACKING] Erro ao parar rastreamento:', error);
            throw new Error('Falha ao parar rastreamento: ' + error.message);
        }
    }

    /**
     * Obtém dados de rastreamento de um veículo
     */
    getTrackingData(vehicleId) {
        const tracking = this.activeTracking.get(vehicleId);
        if (!tracking) {
            return null;
        }

        return {
            vehicleId: tracking.vehicleId,
            isActive: tracking.isActive,
            currentPosition: tracking.currentPosition,
            lastUpdate: tracking.lastUpdate,
            eta: tracking.eta,
            speed: tracking.speed,
            heading: tracking.heading,
            status: tracking.status,
            route: tracking.routeData
        };
    }

    /**
     * Obtém histórico de rota de um veículo
     */
    getRouteHistory(vehicleId, limit = 100) {
        const history = this.routeHistory.get(vehicleId) || [];
        return history.slice(-limit);
    }

    /**
     * Adiciona ponto ao histórico de rota
     */
    addToHistory(vehicleId, position) {
        if (!this.routeHistory.has(vehicleId)) {
            this.routeHistory.set(vehicleId, []);
        }

        const history = this.routeHistory.get(vehicleId);
        history.push(position);

        // Limitar tamanho do histórico
        if (history.length > this.config.maxHistoryPoints) {
            history.splice(0, history.length - this.config.maxHistoryPoints);
        }
    }

    /**
     * Calcula distância entre duas coordenadas (fórmula de Haversine)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Raio da Terra em metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distância em metros
    }

    /**
     * Valida coordenadas GPS
     */
    isValidCoordinate(latitude, longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        return !isNaN(lat) && !isNaN(lng) &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180;
    }

    /**
     * Obtém estatísticas do serviço
     */
    getStats() {
        return {
            active_vehicles: this.activeTracking.size,
            total_geofences: this.geofences.size,
            vehicles_with_history: this.routeHistory.size,
            config: this.config
        };
    }

    /**
     * Limpa dados antigos
     */
    cleanup() {
        // Remover rastreamentos inativos há mais de 1 hora
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const [vehicleId, tracking] of this.activeTracking) {
            if (!tracking.isActive && 
                tracking.lastUpdate && 
                new Date(tracking.lastUpdate).getTime() < oneHourAgo) {
                
                this.activeTracking.delete(vehicleId);
                
                // Remover geofences relacionados
                for (const [geofenceId, geofence] of this.geofences) {
                    if (geofence.vehicleId === vehicleId) {
                        this.geofences.delete(geofenceId);
                    }
                }
                
                console.log(`[GPS-TRACKING] Dados antigos removidos para veículo ${vehicleId}`);
            }
        }
    }
}

// Instância singleton
const gpsTrackingService = new GPSTrackingService();

// Limpeza automática a cada hora
setInterval(() => {
    gpsTrackingService.cleanup();
}, 60 * 60 * 1000);

module.exports = gpsTrackingService;