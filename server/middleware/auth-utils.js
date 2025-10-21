const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/security-config');

/**
 * Middleware de autenticação unificado
 * Verifica se o token JWT é válido e extrai as informações do usuário
 */
const authenticateToken = async (ctx, next) => {
    try {
        const authHeader = ctx.headers.authorization;
        
        if (!authHeader) {
            ctx.status = 401;
            ctx.body = { 
                success: false, 
                message: 'Token de acesso requerido' 
            };
            return;
        }

        const token = authHeader.split(' ')[1]; // Remove "Bearer " do início
        
        if (!token) {
            ctx.status = 401;
            ctx.body = { 
                success: false, 
                message: 'Token de acesso requerido' 
            };
            return;
        }

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Adicionar informações do usuário ao contexto
        ctx.user = {
            id: decoded.id,
            email: decoded.email,
            tipo: decoded.tipo,
            nome: decoded.nome
        };

        await next();
    } catch (error) {
        // Log mais detalhado para debug (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development') {
            console.error('🔐 Erro na autenticação:', {
                tipo: error.name,
                mensagem: error.message,
                rota: ctx.path,
                metodo: ctx.method,
                ip: ctx.ip
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            ctx.status = 401;
            ctx.body = { 
                success: false, 
                message: 'Token expirado' 
            };
        } else if (error.name === 'JsonWebTokenError') {
            ctx.status = 401;
            ctx.body = { 
                success: false, 
                message: 'Token inválido ou expirado' 
            };
        } else {
            ctx.status = 500;
            ctx.body = { 
                success: false, 
                message: 'Erro interno do servidor' 
            };
        }
    }
};

/**
 * Middleware para verificar se o usuário tem permissão específica
 * @param {string|Array} allowedTypes - Tipos de usuário permitidos
 */
const requireRole = (allowedTypes) => {
    return async (ctx, next) => {
        if (!ctx.user) {
            ctx.status = 401;
            ctx.body = { 
                success: false, 
                message: 'Usuário não autenticado' 
            };
            return;
        }

        const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
        
        if (!types.includes(ctx.user.tipo)) {
            ctx.status = 403;
            ctx.body = { 
                success: false, 
                message: 'Acesso negado. Permissão insuficiente.' 
            };
            return;
        }

        await next();
    };
};

/**
 * Middleware opcional de autenticação
 * Não bloqueia a requisição se não houver token, mas adiciona informações do usuário se houver
 */
const optionalAuth = async (ctx, next) => {
    try {
        const authHeader = ctx.headers.authorization;
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET);
                ctx.user = {
                    id: decoded.id,
                    email: decoded.email,
                    tipo: decoded.tipo,
                    nome: decoded.nome
                };
            }
        }
    } catch (error) {
        // Ignorar erros de token em autenticação opcional
        console.log('Token opcional inválido:', error.message);
    }
    
    await next();
};

/**
 * Função utilitária para gerar tokens JWT
 * @param {Object} payload - Dados do usuário para incluir no token
 * @param {string} expiresIn - Tempo de expiração (padrão: 24h)
 */
const generateToken = (payload, expiresIn = '24h') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Função utilitária para verificar tokens JWT
 * @param {string} token - Token a ser verificado
 */
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth,
    generateToken,
    verifyToken
};