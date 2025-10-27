/**
 * Gerenciador de Cache Simples em Memória
 * 
 * Sistema de cache otimizado para dados estáticos e resultados
 * de busca frequentes, melhorando a performance da aplicação.
 * 
 * @author Sistema de Transporte Escolar
 * @version 1.0.0
 */

const { CACHE_CONFIG } = require('../config/constants');
const logger = require('./logger');

/**
 * Classe para gerenciamento de cache em memória
 */
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            clears: 0
        };
        
        // Inicia limpeza automática
        this.startCleanupInterval();
    }

    /**
     * Armazena um valor no cache
     * @param {string} key - Chave do cache
     * @param {any} value - Valor a ser armazenado
     * @param {number} ttl - Time to live em milissegundos (opcional)
     * @returns {boolean} True se armazenado com sucesso
     */
    set(key, value, ttl = CACHE_CONFIG.TTL.MEDIUM) {
        try {
            // Remove timer anterior se existir
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }

            // Armazena o valor com timestamp
            const cacheItem = {
                value,
                timestamp: Date.now(),
                ttl,
                expiresAt: Date.now() + ttl
            };

            this.cache.set(key, cacheItem);
            this.stats.sets++;

            // Define timer para expiração automática
            if (ttl > 0) {
                const timer = setTimeout(() => {
                    this.delete(key);
                }, ttl);
                this.timers.set(key, timer);
            }

            return true;
        } catch (error) {
            logger.error('Erro ao armazenar no cache:', error);
            return false;
        }
    }

    /**
     * Recupera um valor do cache
     * @param {string} key - Chave do cache
     * @returns {any|null} Valor armazenado ou null se não encontrado/expirado
     */
    get(key) {
        try {
            const cacheItem = this.cache.get(key);

            if (!cacheItem) {
                this.stats.misses++;
                return null;
            }

            // Verifica se expirou
            if (Date.now() > cacheItem.expiresAt) {
                this.delete(key);
                this.stats.misses++;
                return null;
            }

            this.stats.hits++;
            return cacheItem.value;
        } catch (error) {
            logger.error('Erro ao recuperar do cache:', error);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Remove um item do cache
     * @param {string} key - Chave do cache
     * @returns {boolean} True se removido com sucesso
     */
    delete(key) {
        try {
            // Remove timer se existir
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }

            const deleted = this.cache.delete(key);
            if (deleted) {
                this.stats.deletes++;
            }
            return deleted;
        } catch (error) {
            logger.error('Erro ao remover do cache:', error);
            return false;
        }
    }

    /**
     * Verifica se uma chave existe no cache
     * @param {string} key - Chave do cache
     * @returns {boolean} True se existe e não expirou
     */
    has(key) {
        const cacheItem = this.cache.get(key);
        if (!cacheItem) return false;

        // Verifica se expirou
        if (Date.now() > cacheItem.expiresAt) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Limpa todo o cache
     * @returns {boolean} True se limpo com sucesso
     */
    clear() {
        try {
            // Limpa todos os timers
            for (const timer of this.timers.values()) {
                clearTimeout(timer);
            }
            this.timers.clear();
            this.cache.clear();
            this.stats.clears++;
            return true;
        } catch (error) {
            logger.error('Erro ao limpar cache:', error);
            return false;
        }
    }

    /**
     * Remove itens expirados do cache
     * @returns {number} Número de itens removidos
     */
    cleanup() {
        let removed = 0;
        const now = Date.now();

        for (const [key, cacheItem] of this.cache.entries()) {
            if (now > cacheItem.expiresAt) {
                this.delete(key);
                removed++;
            }
        }

        return removed;
    }

    /**
     * Obtém estatísticas do cache
     * @returns {Object} Estatísticas de uso
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            totalRequests,
            hitRate: `${hitRate}%`,
            cacheSize: this.cache.size,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Estima o uso de memória do cache
     * @returns {string} Uso estimado de memória
     */
    getMemoryUsage() {
        let size = 0;
        for (const [key, value] of this.cache.entries()) {
            size += JSON.stringify(key).length + JSON.stringify(value).length;
        }
        return `${(size / 1024).toFixed(2)} KB`;
    }

    /**
     * Inicia intervalo de limpeza automática
     * @private
     */
    startCleanupInterval() {
        setInterval(() => {
            const removed = this.cleanup();
            if (removed > 0) {
                logger.info(`Cache cleanup: ${removed} itens expirados removidos`);
            }
        }, CACHE_CONFIG.TTL.LONG); // Executa a cada hora
    }

    /**
     * Obtém ou define um valor no cache (pattern get-or-set)
     * @param {string} key - Chave do cache
     * @param {Function} factory - Função para gerar o valor se não existir
     * @param {number} ttl - Time to live em milissegundos
     * @returns {Promise<any>} Valor do cache ou gerado pela factory
     */
    async getOrSet(key, factory, ttl = CACHE_CONFIG.TTL.MEDIUM) {
        let value = this.get(key);
        
        if (value === null) {
            value = await factory();
            if (value !== null && value !== undefined) {
                this.set(key, value, ttl);
            }
        }
        
        return value;
    }
}

// Instância singleton do cache
const cacheManager = new CacheManager();

/**
 * Middleware para cache de respostas HTTP
 * @param {number} ttl - Time to live em milissegundos
 * @returns {Function} Middleware do Koa
 */
const cacheMiddleware = (ttl = CACHE_CONFIG.TTL.SHORT) => {
    return async (ctx, next) => {
        // Gera chave baseada na URL e query parameters
        const cacheKey = `http:${ctx.method}:${ctx.url}`;
        
        // Tenta recuperar do cache
        const cachedResponse = cacheManager.get(cacheKey);
        if (cachedResponse) {
            ctx.body = cachedResponse.body;
            ctx.status = cachedResponse.status;
            ctx.set('X-Cache', 'HIT');
            return;
        }

        // Executa a rota
        await next();

        // Armazena no cache apenas respostas de sucesso
        if (ctx.status >= 200 && ctx.status < 300) {
            cacheManager.set(cacheKey, {
                body: ctx.body,
                status: ctx.status
            }, ttl);
            ctx.set('X-Cache', 'MISS');
        }
    };
};

/**
 * Cache específico para resultados de busca de transportes
 */
const transportSearchCache = {
    /**
     * Gera chave de cache para busca de transportes
     * @param {Object} filters - Filtros de busca
     * @returns {string} Chave de cache
     */
    generateKey(filters) {
        const sortedFilters = Object.keys(filters)
            .sort()
            .reduce((result, key) => {
                result[key] = filters[key];
                return result;
            }, {});
        return `transport_search:${JSON.stringify(sortedFilters)}`;
    },

    /**
     * Armazena resultado de busca
     * @param {Object} filters - Filtros de busca
     * @param {Object} result - Resultado da busca
     */
    set(filters, result) {
        const key = this.generateKey(filters);
        cacheManager.set(key, result, CACHE_CONFIG.TTL.SHORT);
    },

    /**
     * Recupera resultado de busca
     * @param {Object} filters - Filtros de busca
     * @returns {Object|null} Resultado da busca ou null
     */
    get(filters) {
        const key = this.generateKey(filters);
        return cacheManager.get(key);
    },

    /**
     * Remove cache de busca específica
     * @param {Object} filters - Filtros de busca
     */
    delete(filters) {
        const key = this.generateKey(filters);
        cacheManager.delete(key);
    },

    /**
     * Limpa todo o cache de busca de transportes
     */
    clear() {
        // Remove todas as chaves que começam com 'transport_search:'
        for (const key of cacheManager.cache.keys()) {
            if (key.startsWith('transport_search:')) {
                cacheManager.delete(key);
            }
        }
    }
};

module.exports = {
    cacheManager,
    cacheMiddleware,
    transportSearchCache
};