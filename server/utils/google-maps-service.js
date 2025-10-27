/**
 * Serviço de Integração com Google Maps
 * 
 * Este serviço fornece funcionalidades para:
 * - Geocodificação (endereço -> coordenadas)
 * - Geocodificação reversa (coordenadas -> endereço)
 * - Cálculo de rotas e direções
 * - Estimativas de tempo e distância
 * - Busca de lugares próximos
 */

const { Client } = require('@googlemaps/google-maps-services-js');
const config = require('../config/google-maps-config');

class GoogleMapsService {
    constructor() {
        this.client = new Client({});
        this.config = config;
        this.cache = new Map();
        
        // Verificar se a configuração é válida
        if (!this.config.isValid) {
            console.warn('[GOOGLE-MAPS] ⚠️  Serviço inicializado sem chave válida da API');
        } else {
            console.log('[GOOGLE-MAPS] ✅ Serviço inicializado com sucesso');
        }
    }

    /**
     * Verifica se o serviço está disponível
     */
    isAvailable() {
        return this.config.isValid;
    }

    /**
     * Geocodificação: Converte endereço em coordenadas
     */
    async geocode(address) {
        try {
            if (!this.isAvailable()) {
                throw new Error('Serviço Google Maps não disponível');
            }

            // Verificar cache
            const cacheKey = `geocode_${address}`;
            if (this.cache.has(cacheKey)) {
                console.log('[GOOGLE-MAPS] 📋 Resultado do cache para geocodificação');
                return this.cache.get(cacheKey);
            }

            console.log(`[GOOGLE-MAPS] 🔍 Geocodificando endereço: ${address}`);

            const response = await this.client.geocode({
                params: {
                    address: address,
                    key: this.config.apiKey,
                    region: this.config.region,
                    language: this.config.language
                }
            });

            if (response.data.status !== 'OK' || response.data.results.length === 0) {
                throw new Error(`Endereço não encontrado: ${address}`);
            }

            const result = response.data.results[0];
            const coordinates = {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
                formatted_address: result.formatted_address,
                place_id: result.place_id,
                types: result.types
            };

            // Salvar no cache
            this.cache.set(cacheKey, coordinates);
            
            console.log(`[GOOGLE-MAPS] ✅ Endereço geocodificado: ${coordinates.formatted_address}`);
            return coordinates;

        } catch (error) {
            console.error('[GOOGLE-MAPS] ❌ Erro na geocodificação:', error.message);
            throw error;
        }
    }

    /**
     * Geocodificação reversa: Converte coordenadas em endereço
     */
    async reverseGeocode(latitude, longitude) {
        try {
            if (!this.isAvailable()) {
                throw new Error('Serviço Google Maps não disponível');
            }

            // Verificar cache
            const cacheKey = `reverse_${latitude}_${longitude}`;
            if (this.cache.has(cacheKey)) {
                console.log('[GOOGLE-MAPS] 📋 Resultado do cache para geocodificação reversa');
                return this.cache.get(cacheKey);
            }

            console.log(`[GOOGLE-MAPS] 🔍 Geocodificação reversa: ${latitude}, ${longitude}`);

            const response = await this.client.reverseGeocode({
                params: {
                    latlng: `${latitude},${longitude}`,
                    key: this.config.apiKey,
                    language: this.config.language
                }
            });

            if (response.data.status !== 'OK' || response.data.results.length === 0) {
                throw new Error(`Coordenadas não encontradas: ${latitude}, ${longitude}`);
            }

            const result = response.data.results[0];
            const address = {
                formatted_address: result.formatted_address,
                place_id: result.place_id,
                types: result.types,
                address_components: result.address_components
            };

            // Salvar no cache
            this.cache.set(cacheKey, address);
            
            console.log(`[GOOGLE-MAPS] ✅ Coordenadas convertidas: ${address.formatted_address}`);
            return address;

        } catch (error) {
            console.error('[GOOGLE-MAPS] ❌ Erro na geocodificação reversa:', error.message);
            throw error;
        }
    }

    /**
     * Calcula rota entre dois pontos
     */
    async calculateRoute(origin, destination, options = {}) {
        try {
            if (!this.isAvailable()) {
                throw new Error('Serviço Google Maps não disponível');
            }

            // Verificar cache
            const cacheKey = `route_${JSON.stringify(origin)}_${JSON.stringify(destination)}_${JSON.stringify(options)}`;
            if (this.cache.has(cacheKey)) {
                console.log('[GOOGLE-MAPS] 📋 Resultado do cache para cálculo de rota');
                return this.cache.get(cacheKey);
            }

            console.log(`[GOOGLE-MAPS] 🗺️  Calculando rota de ${JSON.stringify(origin)} para ${JSON.stringify(destination)}`);

            const params = {
                origin: typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`,
                destination: typeof destination === 'string' ? destination : `${destination.latitude},${destination.longitude}`,
                key: this.config.apiKey,
                mode: options.mode || this.config.defaults.directions.mode,
                avoid: options.avoid || this.config.defaults.directions.avoid,
                units: this.config.defaults.directions.units,
                region: this.config.defaults.directions.region,
                language: this.config.language
            };

            // Adicionar waypoints se fornecidos
            if (options.waypoints && options.waypoints.length > 0) {
                params.waypoints = options.waypoints.map(wp => 
                    typeof wp === 'string' ? wp : `${wp.latitude},${wp.longitude}`
                ).join('|');
            }

            const response = await this.client.directions({ params });

            if (response.data.status !== 'OK' || response.data.routes.length === 0) {
                throw new Error(`Rota não encontrada entre ${params.origin} e ${params.destination}`);
            }

            const route = response.data.routes[0];
            const leg = route.legs[0];

            const routeData = {
                distance: {
                    text: leg.distance.text,
                    value: leg.distance.value // metros
                },
                duration: {
                    text: leg.duration.text,
                    value: leg.duration.value // segundos
                },
                start_address: leg.start_address,
                end_address: leg.end_address,
                start_location: leg.start_location,
                end_location: leg.end_location,
                polyline: route.overview_polyline.points,
                steps: leg.steps.map(step => ({
                    distance: step.distance,
                    duration: step.duration,
                    instructions: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
                    start_location: step.start_location,
                    end_location: step.end_location
                })),
                bounds: route.bounds,
                warnings: route.warnings,
                waypoint_order: route.waypoint_order
            };

            // Salvar no cache
            this.cache.set(cacheKey, routeData);
            
            console.log(`[GOOGLE-MAPS] ✅ Rota calculada: ${routeData.distance.text}, ${routeData.duration.text}`);
            return routeData;

        } catch (error) {
            console.error('[GOOGLE-MAPS] ❌ Erro no cálculo de rota:', error.message);
            throw error;
        }
    }

    /**
     * Calcula matriz de distâncias entre múltiplos pontos
     */
    async calculateDistanceMatrix(origins, destinations, options = {}) {
        try {
            if (!this.isAvailable()) {
                throw new Error('Serviço Google Maps não disponível');
            }

            console.log(`[GOOGLE-MAPS] 📊 Calculando matriz de distâncias`);

            const formatLocations = (locations) => {
                return locations.map(loc => 
                    typeof loc === 'string' ? loc : `${loc.latitude},${loc.longitude}`
                );
            };

            const response = await this.client.distancematrix({
                params: {
                    origins: formatLocations(origins),
                    destinations: formatLocations(destinations),
                    key: this.config.apiKey,
                    mode: options.mode || this.config.defaults.directions.mode,
                    units: this.config.defaults.directions.units,
                    language: this.config.language
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error('Erro ao calcular matriz de distâncias');
            }

            const matrix = {
                origin_addresses: response.data.origin_addresses,
                destination_addresses: response.data.destination_addresses,
                rows: response.data.rows.map(row => ({
                    elements: row.elements.map(element => ({
                        distance: element.distance,
                        duration: element.duration,
                        status: element.status
                    }))
                }))
            };

            console.log(`[GOOGLE-MAPS] ✅ Matriz de distâncias calculada`);
            return matrix;

        } catch (error) {
            console.error('[GOOGLE-MAPS] ❌ Erro no cálculo da matriz de distâncias:', error.message);
            throw error;
        }
    }

    /**
     * Busca lugares próximos
     */
    async findNearbyPlaces(location, type, radius = 5000) {
        try {
            if (!this.isAvailable()) {
                throw new Error('Serviço Google Maps não disponível');
            }

            console.log(`[GOOGLE-MAPS] 🔍 Buscando lugares próximos: ${type}`);

            const response = await this.client.placesNearby({
                params: {
                    location: typeof location === 'string' ? location : `${location.latitude},${location.longitude}`,
                    radius: radius,
                    type: type,
                    key: this.config.apiKey,
                    language: this.config.language
                }
            });

            if (response.data.status !== 'OK') {
                throw new Error(`Erro ao buscar lugares próximos: ${response.data.status}`);
            }

            const places = response.data.results.map(place => ({
                place_id: place.place_id,
                name: place.name,
                vicinity: place.vicinity,
                location: place.geometry.location,
                rating: place.rating,
                types: place.types,
                price_level: place.price_level,
                photos: place.photos ? place.photos.map(photo => photo.photo_reference) : []
            }));

            console.log(`[GOOGLE-MAPS] ✅ Encontrados ${places.length} lugares próximos`);
            return places;

        } catch (error) {
            console.error('[GOOGLE-MAPS] ❌ Erro na busca de lugares próximos:', error.message);
            throw error;
        }
    }

    /**
     * Limpa o cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[GOOGLE-MAPS] 🧹 Cache limpo');
    }

    /**
     * Obtém estatísticas do cache
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.config.cache.maxSize
        };
    }
}

// Exportar instância singleton
module.exports = new GoogleMapsService();