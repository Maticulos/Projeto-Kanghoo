/**
 * Configurações do Google Maps
 * 
 * Este arquivo contém todas as configurações necessárias para integração
 * com as APIs do Google Maps (Directions, Geocoding, Places, etc.)
 */

require('dotenv').config();

const config = {
    // Chave da API do Google Maps
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    
    // Configurações regionais
    region: process.env.GOOGLE_MAPS_REGION || 'BR',
    language: process.env.GOOGLE_MAPS_LANGUAGE || 'pt-BR',
    
    // Configurações de cache
    cache: {
        enabled: true,
        ttl: 300000, // 5 minutos
        maxSize: 1000
    },
    
    // Configurações de rate limiting
    rateLimit: {
        requestsPerSecond: 10,
        requestsPerDay: 2500
    },
    
    // Configurações padrão para diferentes serviços
    defaults: {
        directions: {
            mode: 'driving',
            avoid: ['tolls'],
            units: 'metric',
            region: 'BR'
        },
        geocoding: {
            region: 'BR',
            language: 'pt-BR'
        },
        places: {
            radius: 5000, // 5km
            language: 'pt-BR'
        }
    },
    
    // URLs das APIs
    endpoints: {
        directions: 'https://maps.googleapis.com/maps/api/directions/json',
        geocoding: 'https://maps.googleapis.com/maps/api/geocode/json',
        places: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        distanceMatrix: 'https://maps.googleapis.com/maps/api/distancematrix/json'
    }
};

// Validação da configuração
function validateConfig() {
    if (!config.apiKey) {
        console.warn('[GOOGLE-MAPS] ⚠️  Chave da API não configurada. Defina GOOGLE_MAPS_API_KEY no arquivo .env');
        return false;
    }
    
    if (config.apiKey === 'sua_chave_google_maps_aqui') {
        console.warn('[GOOGLE-MAPS] ⚠️  Usando chave de exemplo. Configure uma chave válida do Google Maps');
        return false;
    }
    
    return true;
}

// Verificar se a configuração é válida
config.isValid = validateConfig();

module.exports = config;