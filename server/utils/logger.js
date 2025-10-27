/**
 * SISTEMA DE LOGGING CONFIGURÁVEL E ROBUSTO
 * 
 * Sistema de logging avançado que suporta:
 * - Múltiplos níveis de log (DEBUG, INFO, WARN, ERROR)
 * - Formatação consistente com timestamps
 * - Configuração baseada em variáveis de ambiente
 * - Filtragem por nível de log
 * - Logs estruturados para facilitar análise
 * - Sanitização de dados sensíveis
 * 
 * Configuração via .env:
 * - LOG_LEVEL: Nível mínimo de log (DEBUG, INFO, WARN, ERROR)
 * - LOG_FORMAT: Formato do log (JSON, TEXT)
 * - LOG_TIMESTAMP: Se deve incluir timestamp (true/false)
 * 
 * @author Sistema de Transporte Escolar
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');

// === CONFIGURAÇÕES DO LOGGER ===

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const LOG_COLORS = {
    DEBUG: '\x1b[36m',    // Cyan
    INFO: '\x1b[32m',     // Green
    WARN: '\x1b[33m',     // Yellow
    ERROR: '\x1b[31m',    // Red
    RESET: '\x1b[0m'      // Reset
};

const LOG_ICONS = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    SUCCESS: '✅',
    SECURITY: '🔒',
    DATABASE: '🗄️',
    API: '🌐',
    WEBSOCKET: '🔌'
};

// Configurações baseadas em variáveis de ambiente
const config = {
    level: LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? 
           (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG),
    format: process.env.LOG_FORMAT?.toUpperCase() || 'TEXT',
    timestamp: process.env.LOG_TIMESTAMP !== 'false',
    colors: process.env.LOG_COLORS !== 'false' && process.env.NODE_ENV !== 'production',
    file: process.env.LOG_FILE || null
};

// === UTILITÁRIOS INTERNOS ===

/**
 * Formata timestamp para logs
 * @returns {string} Timestamp formatado
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Sanitiza dados sensíveis antes do log
 * @param {any} data - Dados para sanitizar
 * @returns {any} Dados sanitizados
 */
function sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
        return data;
    }
    
    const sensitiveFields = ['password', 'senha', 'token', 'jwt', 'secret', 'key', 'cpf', 'email'];
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const key in sanitized) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeData(sanitized[key]);
        }
    }
    
    return sanitized;
}

/**
 * Formata mensagem de log
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem principal
 * @param {any[]} args - Argumentos adicionais
 * @returns {string} Mensagem formatada
 */
function formatMessage(level, message, args = []) {
    const timestamp = config.timestamp ? `[${getTimestamp()}]` : '';
    const icon = LOG_ICONS[level] || '';
    const color = config.colors ? LOG_COLORS[level] : '';
    const reset = config.colors ? LOG_COLORS.RESET : '';
    
    if (config.format === 'JSON') {
        return JSON.stringify({
            timestamp: getTimestamp(),
            level,
            message,
            data: args.length > 0 ? sanitizeData(args) : undefined
        });
    }
    
    const formattedArgs = args.length > 0 ? 
        ' | ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(sanitizeData(arg)) : String(arg)
        ).join(' ') : '';
    
    return `${color}${timestamp} ${icon} [${level}] ${message}${formattedArgs}${reset}`;
}

/**
 * Escreve log em arquivo se configurado
 * @param {string} formattedMessage - Mensagem formatada
 */
function writeToFile(formattedMessage) {
    if (!config.file) return;
    
    try {
        const logDir = path.dirname(config.file);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Remove cores ANSI para arquivo
        const cleanMessage = formattedMessage.replace(/\x1b\[[0-9;]*m/g, '');
        fs.appendFileSync(config.file, cleanMessage + '\n');
    } catch (error) {
        console.error('Erro ao escrever log em arquivo:', error.message);
    }
}

/**
 * Função base para logging
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem principal
 * @param {...any} args - Argumentos adicionais
 */
function log(level, message, ...args) {
    if (LOG_LEVELS[level] < config.level) {
        return; // Filtrar logs abaixo do nível configurado
    }
    
    const formattedMessage = formatMessage(level, message, args);
    
    // Output para console
    switch (level) {
        case 'ERROR':
            console.error(formattedMessage);
            break;
        case 'WARN':
            console.warn(formattedMessage);
            break;
        default:
            console.log(formattedMessage);
    }
    
    // Output para arquivo se configurado
    writeToFile(formattedMessage);
}

// === LOGGER PRINCIPAL ===

const logger = {
    /**
     * Log de debug - informações detalhadas para desenvolvimento
     * @param {string} message - Mensagem do log
     * @param {...any} args - Argumentos adicionais
     */
    debug(message, ...args) {
        log('DEBUG', message, ...args);
    },
    
    /**
     * Log de informação - eventos importantes da aplicação
     * @param {string} message - Mensagem do log
     * @param {...any} args - Argumentos adicionais
     */
    info(message, ...args) {
        log('INFO', message, ...args);
    },
    
    /**
     * Log de aviso - situações que merecem atenção
     * @param {string} message - Mensagem do log
     * @param {...any} args - Argumentos adicionais
     */
    warn(message, ...args) {
        log('WARN', message, ...args);
    },
    
    /**
     * Log de erro - erros e exceções
     * @param {string} message - Mensagem do log
     * @param {...any} args - Argumentos adicionais
     */
    error(message, ...args) {
        log('ERROR', message, ...args);
    },
    
    // === LOGS ESPECIALIZADOS ===
    
    /**
     * Log de sucesso para operações importantes
     * @param {string} message - Mensagem de sucesso
     * @param {...any} args - Argumentos adicionais
     */
    success(message, ...args) {
        const formattedMessage = formatMessage('SUCCESS', message, args);
        console.log(formattedMessage);
        writeToFile(formattedMessage);
    },
    
    /**
     * Log de segurança para eventos relacionados à autenticação/autorização
     * @param {string} message - Mensagem de segurança
     * @param {...any} args - Argumentos adicionais
     */
    security(message, ...args) {
        const formattedMessage = formatMessage('SECURITY', message, args);
        console.log(formattedMessage);
        writeToFile(formattedMessage);
    },
    
    /**
     * Log de banco de dados para operações SQL
     * @param {string} message - Mensagem de database
     * @param {...any} args - Argumentos adicionais
     */
    database(message, ...args) {
        if (config.level <= LOG_LEVELS.DEBUG) {
            const formattedMessage = formatMessage('DATABASE', message, args);
            console.log(formattedMessage);
            writeToFile(formattedMessage);
        }
    },
    
    /**
     * Log de API para requisições HTTP
     * @param {string} message - Mensagem de API
     * @param {...any} args - Argumentos adicionais
     */
    api(message, ...args) {
        if (config.level <= LOG_LEVELS.INFO) {
            const formattedMessage = formatMessage('API', message, args);
            console.log(formattedMessage);
            writeToFile(formattedMessage);
        }
    },
    
    /**
     * Log de WebSocket para conexões em tempo real
     * @param {string} message - Mensagem de WebSocket
     * @param {...any} args - Argumentos adicionais
     */
    websocket(message, ...args) {
        if (config.level <= LOG_LEVELS.DEBUG) {
            const formattedMessage = formatMessage('WEBSOCKET', message, args);
            console.log(formattedMessage);
            writeToFile(formattedMessage);
        }
    },
    
    // === UTILITÁRIOS ===
    
    /**
     * Middleware para logging de requisições HTTP
     * @returns {Function} Middleware do Koa
     */
    requestMiddleware() {
        return async (ctx, next) => {
            const start = Date.now();
            const { method, url, ip } = ctx.request;
            
            logger.api(`${method} ${url}`, { ip, userAgent: ctx.get('User-Agent') });
            
            try {
                await next();
                const duration = Date.now() - start;
                logger.api(`${method} ${url} - ${ctx.status}`, { duration: `${duration}ms`, ip });
            } catch (error) {
                const duration = Date.now() - start;
                logger.error(`${method} ${url} - ERROR`, { 
                    error: error.message, 
                    duration: `${duration}ms`, 
                    ip 
                });
                throw error;
            }
        };
    },
    
    /**
     * Obtém configurações atuais do logger
     * @returns {object} Configurações do logger
     */
    getConfig() {
        return { ...config };
    },
    
    /**
     * Atualiza nível de log em tempo de execução
     * @param {string} level - Novo nível de log
     */
    setLevel(level) {
        if (LOG_LEVELS[level.toUpperCase()] !== undefined) {
            config.level = LOG_LEVELS[level.toUpperCase()];
            logger.info(`Nível de log alterado para: ${level.toUpperCase()}`);
        }
    }
};

module.exports = logger;