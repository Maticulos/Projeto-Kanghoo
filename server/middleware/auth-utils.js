const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/security-config');
const logger = require('../utils/logger');

/**
 * Middleware de autenticação unificado
 * Verifica se o token JWT é válido e extrai as informações do usuário
 */
const authenticateToken = async (ctx, next) => {
    try {
        const authHeader = ctx.headers.authorization;
        
        if (!authHeader) {
            console.log('Token não encontrado ou formato inválido');
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

        // Token de desenvolvimento - APENAS se explicitamente habilitado
        const DEV_TOKEN_ENABLED = process.env.ALLOW_DEV_TOKEN === 'true';
        const DEV_TOKEN = process.env.DEV_TOKEN || 'dev_token_responsavel_teste';
        
        if (token === DEV_TOKEN && DEV_TOKEN_ENABLED && process.env.NODE_ENV !== 'production') {
            // Log de segurança
            logger.warn('⚠️  Token de desenvolvimento usado', {
                ip: ctx.ip,
                path: ctx.path,
                timestamp: new Date().toISOString()
            });
            
            ctx.state.user = {
                id: 1,
                email: 'ana.responsavel@teste.kanghoo.com',
                tipo: 'responsavel',
                nome: 'Responsável Teste'
            };
            await next();
            return;
        }

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Adicionar informações do usuário ao contexto
        ctx.state.user = {
            id: decoded.userId,  // Corrigido: usar userId em vez de id
            email: decoded.email,
            tipo: decoded.tipo,
            nome: decoded.nome || decoded.nomeCompleto  // Suporte para ambos os campos
        };

        await next();
    } catch (error) {
        // Log mais detalhado para debug (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development') {
            logger.error('🔐 Erro na autenticação:', {
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
        if (!ctx.state.user) {
            ctx.status = 401;
            ctx.body = { 
                success: false, 
                message: 'Usuário não autenticado' 
            };
            return;
        }

        const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
        
        if (!types.includes(ctx.state.user.tipo)) {
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
                ctx.state.user = {
                    // suporte a diferentes formatos de payload (userId ou id)
                    id: decoded.userId || decoded.id,
                    email: decoded.email,
                    tipo: decoded.tipo,
                    nome: decoded.nome || decoded.nomeCompleto || decoded.nome_completo
                };
            }
        }
    } catch (error) {
        // Ignorar erros de token em autenticação opcional
        logger.info('Token opcional inválido:', error.message);
    }
    
    await next();
};

/**
 * Middleware para verificar se o usuário é um responsável
 */
const verificarResponsavel = async (ctx, next) => {
    try {
        if (!ctx.state.user || ctx.state.user.tipo !== 'responsavel' && ctx.state.user.tipo !== 'admin') {
            ctx.status = 403;
            ctx.body = { 
                success: false, 
                message: 'Acesso negado. Apenas responsáveis podem acessar este recurso.' 
            };
            return;
        }
        await next();
    } catch (error) {
        logger.error('Erro na verificação de responsável:', error);
        ctx.status = 500;
        ctx.body = { 
            success: false, 
            message: 'Erro interno do servidor' 
        };
    }
};

/**
 * Middleware para verificar se o usuário é um motorista
 */
const verificarMotorista = async (ctx, next) => {
    try {
        if (!ctx.state.user || (ctx.state.user.tipo !== 'motorista_escolar' && ctx.state.user.tipo !== 'motorista_excursao' && ctx.state.user.tipo !== 'motorista_escolar_excursao')) {
            ctx.status = 403;
            ctx.body = { 
                success: false, 
                message: 'Acesso negado. Apenas motoristas podem acessar este recurso.' 
            };
            return;
        }
        await next();
    } catch (error) {
        logger.error('Erro na verificação de motorista:', error);
        ctx.status = 500;
        ctx.body = { 
            success: false, 
            message: 'Erro interno do servidor' 
        };
    }
};

/**
 * Middleware para verificar se o usuário é um motorista de excursão
 */
const verificarMotoristaExcursao = async (ctx, next) => {
    try {
        if (!ctx.state.user || ctx.state.user.tipo !== 'motorista_excursao' && ctx.state.user.tipo !== 'motorista_escolar_excursao') {
            ctx.status = 403;
            ctx.body = { 
                success: false, 
                message: 'Acesso negado. Apenas motoristas de excursão podem acessar este recurso.' 
            };
            return;
        }
        await next();
    } catch (error) {
        logger.error('Erro na verificação de motorista de excursão:', error);
        ctx.status = 500;
        ctx.body = { 
            success: false, 
            message: 'Erro interno do servidor' 
        };
    }
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
    verificarResponsavel,
    verificarMotorista,
    verificarMotoristaExcursao,
    generateToken,
    verifyToken
};