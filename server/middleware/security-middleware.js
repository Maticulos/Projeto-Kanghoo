/**
 * ========================================
 * MIDDLEWARE DE SEGURANÇA AVANÇADO
 * Sistema de Transporte Escolar - Produção
 * ========================================
 */

const helmet = require('helmet');
const rateLimit = require('koa-ratelimit');
const Redis = require('ioredis');
const crypto = require('crypto');
const { promisify } = require('util');
const logger = require('../utils/logger');

// Configurações de segurança
const SECURITY_CONFIG = {
    // Rate Limiting
    rateLimit: {
        general: {
            duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
            message: 'Muitas requisições. Tente novamente em alguns minutos.'
        },
        login: {
            duration: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW) || 900000, // 15 minutos
            max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
            message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
        },
        api: {
            duration: 60000, // 1 minuto
            max: parseInt(process.env.API_RATE_LIMIT) || 60,
            message: 'Limite de requisições da API excedido.'
        }
    },
    
    // Content Security Policy
    csp: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Necessário para alguns scripts inline
                "https://maps.googleapis.com",
                "https://maps.gstatic.com",
                "https://cdn.jsdelivr.net"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdn.jsdelivr.net"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "https://maps.googleapis.com",
                "https://maps.gstatic.com"
            ],
            connectSrc: [
                "'self'",
                "https://maps.googleapis.com",
                "wss:"
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"]
        },
        reportUri: process.env.CSP_REPORT_URI || '/api/csp-report'
    },
    
    // Headers de segurança
    securityHeaders: {
        hsts: {
            maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000, // 1 ano
            includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS === 'true',
            preload: process.env.HSTS_PRELOAD === 'true'
        }
    },
    
    // Configurações de upload
    upload: {
        maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
        scanEnabled: process.env.SCAN_UPLOADS === 'true'
    }
};

// Cliente Redis para rate limiting
let redisClient;
if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
    });
    
    redisClient.on('error', (err) => {
        logger.error('Redis connection error:', err);
    });
}

/**
 * Middleware de headers de segurança usando Helmet
 */
function securityHeaders() {
    return helmet({
        contentSecurityPolicy: process.env.CSP_ENABLED === 'true' ? SECURITY_CONFIG.csp : false,
        hsts: {
            maxAge: SECURITY_CONFIG.securityHeaders.hsts.maxAge,
            includeSubDomains: SECURITY_CONFIG.securityHeaders.hsts.includeSubDomains,
            preload: SECURITY_CONFIG.securityHeaders.hsts.preload
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        permittedCrossDomainPolicies: false,
        crossOriginEmbedderPolicy: false, // Pode causar problemas com Google Maps
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    });
}

/**
 * Rate limiting geral
 */
function generalRateLimit() {
    if (!redisClient) {
        logger.warn('Redis não configurado, rate limiting desabilitado');
        return async (ctx, next) => await next();
    }
    
    return rateLimit({
        driver: 'redis',
        db: redisClient,
        duration: SECURITY_CONFIG.rateLimit.general.duration,
        errorMessage: SECURITY_CONFIG.rateLimit.general.message,
        id: (ctx) => ctx.ip,
        headers: {
            remaining: 'Rate-Limit-Remaining',
            reset: 'Rate-Limit-Reset',
            total: 'Rate-Limit-Total'
        },
        max: SECURITY_CONFIG.rateLimit.general.max,
        disableHeader: false,
        whitelist: (ctx) => {
            // Whitelist para IPs locais e de desenvolvimento
            const allowedIPs = (process.env.ALLOWED_IPS || '127.0.0.1').split(',');
            return allowedIPs.includes(ctx.ip);
        }
    });
}

/**
 * Rate limiting para login
 */
function loginRateLimit() {
    if (!redisClient) {
        return async (ctx, next) => await next();
    }
    
    return rateLimit({
        driver: 'redis',
        db: redisClient,
        duration: SECURITY_CONFIG.rateLimit.login.duration,
        errorMessage: SECURITY_CONFIG.rateLimit.login.message,
        id: (ctx) => `login:${ctx.ip}`,
        max: SECURITY_CONFIG.rateLimit.login.max,
        disableHeader: false
    });
}

/**
 * Rate limiting para API
 */
function apiRateLimit() {
    if (!redisClient) {
        return async (ctx, next) => await next();
    }
    
    return rateLimit({
        driver: 'redis',
        db: redisClient,
        duration: SECURITY_CONFIG.rateLimit.api.duration,
        errorMessage: SECURITY_CONFIG.rateLimit.api.message,
        id: (ctx) => `api:${ctx.ip}`,
        max: SECURITY_CONFIG.rateLimit.api.max,
        disableHeader: false
    });
}

/**
 * Middleware de validação de input
 */
function inputValidation() {
    return async (ctx, next) => {
        try {
            // Validar tamanho do body
            if (ctx.request.body && JSON.stringify(ctx.request.body).length > 1048576) { // 1MB
                ctx.status = 413;
                ctx.body = { error: 'Payload muito grande' };
                return;
            }
            
            // Sanitizar inputs básicos
            if (ctx.request.body && typeof ctx.request.body === 'object') {
                sanitizeObject(ctx.request.body);
            }
            
            // Validar query parameters
            if (ctx.query) {
                sanitizeObject(ctx.query);
            }
            
            await next();
        } catch (error) {
            logger.error('Erro na validação de input:', error);
            ctx.status = 400;
            ctx.body = { error: 'Dados inválidos' };
        }
    };
}

/**
 * Sanitizar objeto recursivamente
 */
function sanitizeObject(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            // Remover caracteres perigosos
            obj[key] = obj[key]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}

/**
 * Middleware de auditoria de segurança
 */
function securityAudit() {
    return async (ctx, next) => {
        const startTime = Date.now();
        const requestId = crypto.randomUUID();
        
        // Log da requisição
        const auditData = {
            requestId,
            timestamp: new Date().toISOString(),
            method: ctx.method,
            url: ctx.url,
            ip: ctx.ip,
            userAgent: ctx.get('User-Agent'),
            referer: ctx.get('Referer'),
            userId: ctx.user ? ctx.user.id : null,
            userEmail: ctx.user ? ctx.user.email : null
        };
        
        // Detectar tentativas suspeitas
        const suspiciousPatterns = [
            /\.\.\//,  // Path traversal
            /<script/i, // XSS
            /union\s+select/i, // SQL injection
            /exec\s*\(/i, // Command injection
            /eval\s*\(/i  // Code injection
        ];
        
        const isSuspicious = suspiciousPatterns.some(pattern => 
            pattern.test(ctx.url) || 
            (ctx.request.body && pattern.test(JSON.stringify(ctx.request.body)))
        );
        
        if (isSuspicious) {
            auditData.suspicious = true;
            logger.warn('Requisição suspeita detectada:', auditData);
        }
        
        ctx.requestId = requestId;
        
        try {
            await next();
            
            auditData.status = ctx.status;
            auditData.responseTime = Date.now() - startTime;
            
            // Log apenas se habilitado ou se for suspeito
            if (process.env.AUDIT_ENABLED === 'true' || isSuspicious) {
                logger.info('Audit log:', auditData);
            }
            
        } catch (error) {
            auditData.error = error.message;
            auditData.status = ctx.status || 500;
            auditData.responseTime = Date.now() - startTime;
            
            logger.error('Erro na requisição:', auditData);
            throw error;
        }
    };
}

/**
 * Middleware de proteção contra ataques de força bruta
 */
function bruteForcePrevention() {
    const attempts = new Map();
    
    return async (ctx, next) => {
        const key = `${ctx.ip}:${ctx.path}`;
        const now = Date.now();
        
        // Limpar tentativas antigas
        for (const [attemptKey, data] of attempts.entries()) {
            if (now - data.lastAttempt > 900000) { // 15 minutos
                attempts.delete(attemptKey);
            }
        }
        
        const attemptData = attempts.get(key) || { count: 0, lastAttempt: now };
        
        // Verificar se está bloqueado
        if (attemptData.count >= 10 && now - attemptData.lastAttempt < 900000) {
            ctx.status = 429;
            ctx.body = { error: 'IP temporariamente bloqueado devido a atividade suspeita' };
            logger.warn(`IP bloqueado por força bruta: ${ctx.ip} - ${ctx.path}`);
            return;
        }
        
        try {
            await next();
            
            // Reset contador em caso de sucesso
            if (ctx.status < 400) {
                attempts.delete(key);
            }
            
        } catch (error) {
            // Incrementar contador em caso de erro
            attemptData.count++;
            attemptData.lastAttempt = now;
            attempts.set(key, attemptData);
            
            throw error;
        }
    };
}

/**
 * Middleware de validação de upload
 */
function uploadValidation() {
    return async (ctx, next) => {
        if (ctx.request.files) {
            for (const file of Object.values(ctx.request.files)) {
                // Validar tamanho
                if (file.size > SECURITY_CONFIG.upload.maxSize) {
                    ctx.status = 413;
                    ctx.body = { error: `Arquivo muito grande. Máximo: ${SECURITY_CONFIG.upload.maxSize} bytes` };
                    return;
                }
                
                // Validar tipo
                if (!SECURITY_CONFIG.upload.allowedTypes.includes(file.type)) {
                    ctx.status = 415;
                    ctx.body = { error: 'Tipo de arquivo não permitido' };
                    return;
                }
                
                // Validar nome do arquivo
                if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
                    ctx.status = 400;
                    ctx.body = { error: 'Nome de arquivo inválido' };
                    return;
                }
            }
        }
        
        await next();
    };
}

/**
 * Middleware de proteção CORS
 */
function corsProtection() {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    return async (ctx, next) => {
        const origin = ctx.get('Origin');
        
        if (origin && allowedOrigins.includes(origin)) {
            ctx.set('Access-Control-Allow-Origin', origin);
        } else if (allowedOrigins.includes('*')) {
            ctx.set('Access-Control-Allow-Origin', '*');
        }
        
        ctx.set('Access-Control-Allow-Methods', process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS');
        ctx.set('Access-Control-Allow-Headers', process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With');
        ctx.set('Access-Control-Allow-Credentials', process.env.CORS_CREDENTIALS || 'true');
        ctx.set('Access-Control-Max-Age', '86400'); // 24 horas
        
        if (ctx.method === 'OPTIONS') {
            ctx.status = 204;
            return;
        }
        
        await next();
    };
}

/**
 * Middleware de detecção de bots maliciosos
 */
function botDetection() {
    const maliciousBots = [
        /sqlmap/i,
        /nikto/i,
        /nessus/i,
        /openvas/i,
        /nmap/i,
        /masscan/i,
        /zap/i,
        /burp/i
    ];
    
    return async (ctx, next) => {
        const userAgent = ctx.get('User-Agent') || '';
        
        if (maliciousBots.some(pattern => pattern.test(userAgent))) {
            logger.warn(`Bot malicioso detectado: ${ctx.ip} - ${userAgent}`);
            ctx.status = 403;
            ctx.body = { error: 'Acesso negado' };
            return;
        }
        
        await next();
    };
}

/**
 * Middleware de timeout de requisição
 */
function requestTimeout() {
    const timeout = parseInt(process.env.API_TIMEOUT) || 30000; // 30 segundos
    
    return async (ctx, next) => {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeout);
        });
        
        try {
            await Promise.race([next(), timeoutPromise]);
        } catch (error) {
            if (error.message === 'Request timeout') {
                ctx.status = 408;
                ctx.body = { error: 'Timeout da requisição' };
                logger.warn(`Request timeout: ${ctx.ip} - ${ctx.path}`);
            } else {
                throw error;
            }
        }
    };
}

module.exports = {
    securityHeaders,
    generalRateLimit,
    loginRateLimit,
    apiRateLimit,
    inputValidation,
    securityAudit,
    bruteForcePrevention,
    uploadValidation,
    corsProtection,
    botDetection,
    requestTimeout,
    SECURITY_CONFIG
};