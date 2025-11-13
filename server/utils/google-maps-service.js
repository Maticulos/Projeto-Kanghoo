/**
 * Serviço de Integração com Google Maps
 */

const { Client } = require('@googlemaps/google-maps-services-js');
const config = require('../config/google-maps-config');

class GoogleMapsService {
    constructor() {
        this.client = new Client({});
        this.config = config;
        this.cache = new Map(); // key -> { value, cachedAt }
        this.rateWindow = []; // timestamps (ms) para rate limit por segundo

        if (!this.config.isValid) {
            console.warn('[GOOGLE-MAPS] ⚠️  Serviço inicializado sem chave válida da API');
        } else {
            console.log('[GOOGLE-MAPS] ✔️ Serviço inicializado com sucesso');
        }
    }

    isAvailable() {
        return this.config.isValid;
    }

    // ============ GEOCODING
    async geocode(address) {
        if (!this.isAvailable()) throw new Error('Serviço Google Maps não disponível');

        const cacheKey = `geocode_${address}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        await this.enforceRateLimit();
        const response = await this.client.geocode({
            params: {
                address,
                key: this.config.apiKey,
                region: this.config.region,
                language: this.config.language
            }
        });

        if (response.data.status !== 'OK' || response.data.results.length === 0) {
            throw new Error(`Endereço não encontrado: ${address}`);
        }

        const result = response.data.results[0];
        const value = {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            formatted_address: result.formatted_address,
            place_id: result.place_id,
            types: result.types
        };
        this.setCache(cacheKey, value);
        return value;
    }

    // ============ REVERSE GEOCODING
    async reverseGeocode(latitude, longitude) {
        if (!this.isAvailable()) throw new Error('Serviço Google Maps não disponível');

        const cacheKey = `reverse_${latitude}_${longitude}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        await this.enforceRateLimit();
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
        const value = {
            formatted_address: result.formatted_address,
            place_id: result.place_id,
            types: result.types,
            address_components: result.address_components
        };
        this.setCache(cacheKey, value);
        return value;
    }

    // ============ DIRECTIONS
    async calculateRoute(origin, destination, options = {}) {
        if (!this.isAvailable()) throw new Error('Serviço Google Maps não disponível');

        const cacheKey = `route_${JSON.stringify(origin)}_${JSON.stringify(destination)}_${JSON.stringify(options)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

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

        if (options.waypoints && options.waypoints.length > 0) {
            params.waypoints = options.waypoints.map(wp => (
                typeof wp === 'string' ? wp : `${wp.latitude},${wp.longitude}`
            )).join('|');
        }

        await this.enforceRateLimit();
        const response = await this.client.directions({ params });
        if (response.data.status !== 'OK' || response.data.routes.length === 0) {
            throw new Error('Rota não encontrada');
        }

        const route = response.data.routes[0];
        const leg = route.legs[0];
        const value = {
            distance: { text: leg.distance.text, value: leg.distance.value },
            duration: { text: leg.duration.text, value: leg.duration.value },
            start_address: leg.start_address,
            end_address: leg.end_address,
            start_location: leg.start_location,
            end_location: leg.end_location,
            polyline: route.overview_polyline.points,
            steps: leg.steps.map(step => ({
                distance: step.distance,
                duration: step.duration,
                instructions: step.html_instructions.replace(/<[^>]*>/g, '')
            }))
        };
        this.setCache(cacheKey, value);
        return value;
    }

    // ============ Cache helpers com TTL
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        const ttl = this.config.cache?.ttl || 300000;
        if (Date.now() - entry.cachedAt > ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    setCache(key, value) {
        const maxSize = this.config.cache?.maxSize || 1000;
        if (this.cache.size >= maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, { value, cachedAt: Date.now() });
    }

    getCacheStats() {
        const keys = Array.from(this.cache.keys());
        return { size: this.cache.size, keysSample: keys.slice(0, 5) };
    }

    // ============ Rate limit simples (RPS)
    async enforceRateLimit() {
        const rps = this.config.rateLimit?.requestsPerSecond || 10;
        const now = Date.now();
        const windowStart = now - 1000;
        this.rateWindow = this.rateWindow.filter(ts => ts > windowStart);
        if (this.rateWindow.length >= rps) {
            const waitMs = 1000 - (now - this.rateWindow[0]);
            await new Promise(res => setTimeout(res, waitMs));
        }
        this.rateWindow.push(Date.now());
    }
}

module.exports = new GoogleMapsService();

