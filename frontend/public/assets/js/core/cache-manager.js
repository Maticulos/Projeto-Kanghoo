/**
 * Sistema de Cache Otimizado para Ambiente de Teste
 * Melhora performance através de cache inteligente de recursos e dados
 */

class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.storagePrefix = 'kanghoo_cache_';
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos
        this.maxMemoryItems = 100;
        this.isTestEnvironment = this.detectTestEnvironment();
        
        this.initializeCache();
        this.setupPeriodicCleanup();
    }

    detectTestEnvironment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.port === '5000';
    }

    initializeCache() {
        // Limpar cache expirado no localStorage
        this.cleanExpiredLocalStorage();
        
        // Configurar interceptadores para recursos estáticos
        if (this.isTestEnvironment) {
            this.setupResourceInterceptors();
        }
    }

    setupResourceInterceptors() {
        // Interceptar carregamento de imagens
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            if (tagName.toLowerCase() === 'img') {
                const originalSetSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
                Object.defineProperty(element, 'src', {
                    set: function(value) {
                        // Cache de imagens
                        window.cacheManager.cacheResource(value, 'image');
                        originalSetSrc.call(this, value);
                    },
                    get: function() {
                        return this.getAttribute('src');
                    }
                });
            }
            
            return element;
        };
    }

    // Cache de dados com TTL
    set(key, data, ttl = this.defaultTTL) {
        const cacheItem = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl,
            expires: Date.now() + ttl
        };

        // Cache em memória (mais rápido)
        if (this.memoryCache.size >= this.maxMemoryItems) {
            this.evictOldestMemoryItem();
        }
        this.memoryCache.set(key, cacheItem);

        // Cache persistente para dados importantes
        if (this.shouldPersist(key)) {
            try {
                localStorage.setItem(
                    this.storagePrefix + key, 
                    JSON.stringify(cacheItem)
                );
            } catch (e) {
                console.warn('Cache: Falha ao salvar no localStorage:', e);
            }
        }
    }

    get(key) {
        // Tentar cache em memória primeiro
        let cacheItem = this.memoryCache.get(key);
        
        // Se não encontrou em memória, tentar localStorage
        if (!cacheItem && this.shouldPersist(key)) {
            try {
                const stored = localStorage.getItem(this.storagePrefix + key);
                if (stored) {
                    cacheItem = JSON.parse(stored);
                    // Recarregar em memória
                    this.memoryCache.set(key, cacheItem);
                }
            } catch (e) {
                console.warn('Cache: Falha ao ler do localStorage:', e);
            }
        }

        if (!cacheItem) {
            return null;
        }

        // Verificar expiração
        if (Date.now() > cacheItem.expires) {
            this.delete(key);
            return null;
        }

        // Atualizar timestamp de acesso
        cacheItem.lastAccess = Date.now();
        
        return cacheItem.data;
    }

    delete(key) {
        this.memoryCache.delete(key);
        localStorage.removeItem(this.storagePrefix + key);
    }

    clear() {
        this.memoryCache.clear();
        
        // Limpar apenas itens do cache no localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Cache específico para dados de API
    async cacheApiCall(url, fetchOptions = {}, ttl = this.defaultTTL) {
        const cacheKey = this.generateApiCacheKey(url, fetchOptions);
        
        // Tentar cache primeiro
        const cached = this.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Se não tem cache, fazer requisição
        try {
            const response = await fetch(url, fetchOptions);
            const data = await response.json();
            
            if (response.ok) {
                this.set(cacheKey, data, ttl);
            }
            
            return data;
        } catch (error) {
            console.error('Cache: Erro na requisição API:', error);
            throw error;
        }
    }

    // Cache para recursos estáticos
    cacheResource(url, type = 'unknown') {
        const cacheKey = `resource_${type}_${url}`;
        
        if (!this.get(cacheKey)) {
            this.set(cacheKey, {
                url: url,
                type: type,
                cached: Date.now()
            }, 30 * 60 * 1000); // 30 minutos para recursos
        }
    }

    // Cache para dados de usuário
    cacheUserData(userData, ttl = 60 * 60 * 1000) { // 1 hora
        this.set('user_data', userData, ttl);
    }

    getUserData() {
        return this.get('user_data');
    }

    // Cache para dados de viagem
    cacheViagemData(viagemData, ttl = 2 * 60 * 1000) { // 2 minutos
        this.set('viagem_ativa', viagemData, ttl);
    }

    getViagemData() {
        return this.get('viagem_ativa');
    }

    // Cache para estatísticas
    cacheEstatisticas(stats, ttl = 10 * 60 * 1000) { // 10 minutos
        this.set('estatisticas', stats, ttl);
    }

    getEstatisticas() {
        return this.get('estatisticas');
    }

    // Métodos auxiliares
    generateApiCacheKey(url, options) {
        const method = options.method || 'GET';
        const body = options.body || '';
        return `api_${method}_${url}_${this.hashString(body)}`;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    shouldPersist(key) {
        const persistentKeys = [
            'user_data', 
            'estatisticas', 
            'configuracoes',
            'theme_preference'
        ];
        return persistentKeys.some(persistentKey => key.includes(persistentKey));
    }

    evictOldestMemoryItem() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of this.memoryCache.entries()) {
            const accessTime = item.lastAccess || item.timestamp;
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
        }
    }

    cleanExpiredLocalStorage() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item.expires && Date.now() > item.expires) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    // Item corrompido, remover
                    keysToRemove.push(key);
                }
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    setupPeriodicCleanup() {
        // Limpeza a cada 5 minutos
        setInterval(() => {
            this.cleanExpiredLocalStorage();
            
            // Limpar itens expirados da memória
            for (const [key, item] of this.memoryCache.entries()) {
                if (Date.now() > item.expires) {
                    this.memoryCache.delete(key);
                }
            }
        }, 5 * 60 * 1000);
    }

    // Estatísticas do cache
    getStats() {
        return {
            memoryItems: this.memoryCache.size,
            localStorageItems: this.getLocalStorageItemCount(),
            memorySize: this.estimateMemorySize(),
            lastCleanup: this.lastCleanup || 'Nunca'
        };
    }

    getLocalStorageItemCount() {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                count++;
            }
        }
        return count;
    }

    estimateMemorySize() {
        let size = 0;
        for (const [key, value] of this.memoryCache.entries()) {
            size += key.length + JSON.stringify(value).length;
        }
        return `${(size / 1024).toFixed(2)} KB`;
    }

    // Pré-carregar dados importantes
    async preloadCriticalData() {
        if (!this.isTestEnvironment) return;

        const criticalEndpoints = [
            '/api/rastreamento/viagem-ativa',
            '/api/rastreamento/estatisticas'
        ];

        const preloadPromises = criticalEndpoints.map(endpoint => 
            this.cacheApiCall(endpoint).catch(e => 
                console.warn(`Preload falhou para ${endpoint}:`, e)
            )
        );

        await Promise.allSettled(preloadPromises);
    }
}

// Inicializar automaticamente
window.cacheManager = new CacheManager();

// Pré-carregar dados críticos quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.cacheManager.preloadCriticalData();
});

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}