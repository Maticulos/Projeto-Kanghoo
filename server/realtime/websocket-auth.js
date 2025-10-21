/**
 * MIDDLEWARE DE AUTENTICAÇÃO WEBSOCKET
 * 
 * Este middleware é responsável por autenticar conexões WebSocket
 * usando tokens JWT, validar permissões e gerenciar sessões.
 * 
 * Funcionalidades:
 * - Validação de token JWT
 * - Verificação de permissões por tipo de usuário
 * - Rate limiting por usuário
 * - Blacklist de tokens
 * - Logs de segurança
 * 
 * @author Sistema Kanghoo
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');
const { USER_TYPES } = require('./event-types');

class WebSocketAuth {
    constructor(options = {}) {
        this.jwtSecret = options.jwtSecret || process.env.JWT_SECRET || 'kanghoo-secret-key';
        this.tokenBlacklist = new Set();
        this.rateLimitMap = new Map();
        
        // Configurações
        this.config = {
            maxConnectionsPerUser: options.maxConnectionsPerUser || 5,
            rateLimitWindow: options.rateLimitWindow || 60000, // 1 minuto
            maxRequestsPerWindow: options.maxRequestsPerWindow || 100,
            tokenExpirationBuffer: options.tokenExpirationBuffer || 300000, // 5 minutos
            allowedOrigins: options.allowedOrigins || ['http://localhost:3000', 'https://kanghoo.com']
        };

        console.log('[WEBSOCKET-AUTH] Middleware de autenticação inicializado');
    }

    /**
     * Middleware principal de autenticação
     */
    async authenticate(ws, req) {
        try {
            console.log('[WEBSOCKET-AUTH] Iniciando autenticação WebSocket');

            // 1. Verificar origem da conexão
            const originCheck = this.verifyOrigin(req);
            if (!originCheck.valid) {
                throw new Error(`Origem não autorizada: ${originCheck.error}`);
            }

            // 2. Extrair e validar token
            const token = this.extractToken(req);
            if (!token) {
                throw new Error('Token de autenticação não fornecido');
            }

            // 3. Verificar se token está na blacklist
            if (this.isTokenBlacklisted(token)) {
                throw new Error('Token foi revogado');
            }

            // 4. Decodificar e validar JWT
            const decoded = await this.verifyJWT(token);
            if (!decoded) {
                throw new Error('Token inválido ou expirado');
            }

            // 5. Verificar rate limiting
            const rateLimitCheck = this.checkRateLimit(decoded.userId);
            if (!rateLimitCheck.allowed) {
                throw new Error(`Rate limit excedido: ${rateLimitCheck.error}`);
            }

            // 6. Validar permissões do usuário
            const permissionCheck = this.validateUserPermissions(decoded);
            if (!permissionCheck.valid) {
                throw new Error(`Permissões insuficientes: ${permissionCheck.error}`);
            }

            // 7. Preparar dados do usuário autenticado
            const userData = {
                userId: decoded.userId,
                userType: decoded.userType,
                nome: decoded.nome,
                email: decoded.email,
                permissions: decoded.permissions || [],
                sessionId: this.generateSessionId(),
                connectedAt: new Date(),
                lastActivity: new Date(),
                token: token
            };

            // 8. Anexar dados do usuário ao WebSocket
            ws.userData = userData;
            ws.isAuthenticated = true;

            console.log(`[WEBSOCKET-AUTH] Usuário autenticado: ${userData.nome} (${userData.userType})`);

            return {
                success: true,
                userData
            };

        } catch (error) {
            console.error('[WEBSOCKET-AUTH] Falha na autenticação:', error.message);
            
            // Log de segurança
            this.logSecurityEvent('auth_failed', {
                ip: req.socket.remoteAddress,
                userAgent: req.headers['user-agent'],
                error: error.message,
                timestamp: new Date()
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extrai token do request
     */
    extractToken(req) {
        // Tentar extrair de diferentes locais
        let token = null;

        // 1. Query parameter
        if (req.url) {
            const url = new URL(req.url, `http://${req.headers.host}`);
            token = url.searchParams.get('token');
        }

        // 2. Header Authorization
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        // 3. Cookie (se configurado)
        if (!token && req.headers.cookie) {
            const cookies = this.parseCookies(req.headers.cookie);
            token = cookies.auth_token || cookies.jwt_token;
        }

        return token;
    }

    /**
     * Verifica e decodifica JWT
     */
    async verifyJWT(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Verificar se o token não está muito próximo do vencimento
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = (decoded.exp - now) * 1000;
            
            if (timeUntilExpiry < this.config.tokenExpirationBuffer) {
                console.warn(`[WEBSOCKET-AUTH] Token próximo do vencimento: ${timeUntilExpiry}ms restantes`);
            }

            return decoded;
        } catch (error) {
            console.error('[WEBSOCKET-AUTH] Erro ao verificar JWT:', error.message);
            return null;
        }
    }

    /**
     * Verifica origem da conexão
     */
    verifyOrigin(req) {
        const origin = req.headers.origin;
        
        if (!origin) {
            return { valid: false, error: 'Origem não especificada' };
        }

        if (!this.config.allowedOrigins.includes(origin)) {
            return { valid: false, error: `Origem ${origin} não autorizada` };
        }

        return { valid: true };
    }

    /**
     * Verifica rate limiting por usuário
     */
    checkRateLimit(userId) {
        const now = Date.now();
        const windowStart = now - this.config.rateLimitWindow;

        // Obter ou criar entrada para o usuário
        if (!this.rateLimitMap.has(userId)) {
            this.rateLimitMap.set(userId, []);
        }

        const userRequests = this.rateLimitMap.get(userId);
        
        // Remover requests antigas (fora da janela)
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
        
        // Verificar se excedeu o limite
        if (validRequests.length >= this.config.maxRequestsPerWindow) {
            return {
                allowed: false,
                error: `Máximo de ${this.config.maxRequestsPerWindow} requests por minuto excedido`
            };
        }

        // Adicionar request atual
        validRequests.push(now);
        this.rateLimitMap.set(userId, validRequests);

        return { allowed: true };
    }

    /**
     * Valida permissões do usuário
     */
    validateUserPermissions(decoded) {
        // Verificar se o tipo de usuário é válido
        if (!Object.values(USER_TYPES).includes(decoded.userType)) {
            return { valid: false, error: 'Tipo de usuário inválido' };
        }

        // Verificar se o usuário está ativo
        if (decoded.status && decoded.status !== 'active') {
            return { valid: false, error: 'Usuário inativo' };
        }

        // Verificações específicas por tipo de usuário
        switch (decoded.userType) {
            case USER_TYPES.RESPONSAVEL:
                if (!decoded.criancas || decoded.criancas.length === 0) {
                    console.warn(`[WEBSOCKET-AUTH] Responsável ${decoded.userId} sem crianças associadas`);
                }
                break;

            case USER_TYPES.MOTORISTA:
                if (!decoded.veiculo_id) {
                    console.warn(`[WEBSOCKET-AUTH] Motorista ${decoded.userId} sem veículo associado`);
                }
                break;

            case USER_TYPES.ADMIN:
                if (!decoded.permissions || !decoded.permissions.includes('admin_access')) {
                    return { valid: false, error: 'Permissões de administrador insuficientes' };
                }
                break;
        }

        return { valid: true };
    }

    /**
     * Verifica se token está na blacklist
     */
    isTokenBlacklisted(token) {
        return this.tokenBlacklist.has(token);
    }

    /**
     * Adiciona token à blacklist
     */
    blacklistToken(token) {
        this.tokenBlacklist.add(token);
        console.log('[WEBSOCKET-AUTH] Token adicionado à blacklist');
    }

    /**
     * Gera ID de sessão único
     */
    generateSessionId() {
        return `ws_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Parse cookies do header
     */
    parseCookies(cookieHeader) {
        const cookies = {};
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
        });
        return cookies;
    }

    /**
     * Middleware para validar mensagens recebidas
     */
    validateMessage(ws, message) {
        try {
            // Verificar se usuário está autenticado
            if (!ws.isAuthenticated || !ws.userData) {
                return { valid: false, error: 'Usuário não autenticado' };
            }

            // Verificar rate limiting
            const rateLimitCheck = this.checkRateLimit(ws.userData.userId);
            if (!rateLimitCheck.allowed) {
                return { valid: false, error: rateLimitCheck.error };
            }

            // Atualizar última atividade
            ws.userData.lastActivity = new Date();

            // Validar estrutura da mensagem
            if (!message || typeof message !== 'object') {
                return { valid: false, error: 'Formato de mensagem inválido' };
            }

            if (!message.type) {
                return { valid: false, error: 'Tipo de mensagem não especificado' };
            }

            return { valid: true };

        } catch (error) {
            console.error('[WEBSOCKET-AUTH] Erro ao validar mensagem:', error);
            return { valid: false, error: 'Erro interno de validação' };
        }
    }

    /**
     * Middleware para autorizar ações específicas
     */
    authorizeAction(ws, action, targetData = {}) {
        const userData = ws.userData;
        
        if (!userData) {
            return { authorized: false, error: 'Usuário não autenticado' };
        }

        // Verificações baseadas no tipo de usuário e ação
        switch (action) {
            case 'send_notification':
                return this.authorizeNotificationSend(userData, targetData);
                
            case 'view_location':
                return this.authorizeLocationView(userData, targetData);
                
            case 'send_message':
                return this.authorizeMessageSend(userData, targetData);
                
            case 'admin_action':
                return this.authorizeAdminAction(userData, targetData);
                
            default:
                return { authorized: true }; // Ações gerais permitidas
        }
    }

    /**
     * Autoriza envio de notificações
     */
    authorizeNotificationSend(userData, targetData) {
        // Apenas admins e sistema podem enviar notificações
        if (userData.userType !== USER_TYPES.ADMIN) {
            return { authorized: false, error: 'Apenas administradores podem enviar notificações' };
        }

        return { authorized: true };
    }

    /**
     * Autoriza visualização de localização
     */
    authorizeLocationView(userData, targetData) {
        switch (userData.userType) {
            case USER_TYPES.ADMIN:
                return { authorized: true }; // Admin vê tudo
                
            case USER_TYPES.RESPONSAVEL:
                // Responsável só vê localização de suas crianças
                if (targetData.crianca_id && userData.criancas?.includes(targetData.crianca_id)) {
                    return { authorized: true };
                }
                return { authorized: false, error: 'Acesso negado a esta localização' };
                
            case USER_TYPES.MOTORISTA:
                // Motorista vê localização do próprio veículo
                if (targetData.veiculo_id === userData.veiculo_id) {
                    return { authorized: true };
                }
                return { authorized: false, error: 'Acesso negado a este veículo' };
                
            default:
                return { authorized: false, error: 'Tipo de usuário não autorizado' };
        }
    }

    /**
     * Autoriza envio de mensagens
     */
    authorizeMessageSend(userData, targetData) {
        // Todos os usuários autenticados podem enviar mensagens
        // Mas com restrições baseadas no destinatário
        
        if (userData.userType === USER_TYPES.ADMIN) {
            return { authorized: true }; // Admin pode enviar para qualquer um
        }

        // Outras validações específicas podem ser adicionadas aqui
        return { authorized: true };
    }

    /**
     * Autoriza ações administrativas
     */
    authorizeAdminAction(userData, targetData) {
        if (userData.userType !== USER_TYPES.ADMIN) {
            return { authorized: false, error: 'Ação restrita a administradores' };
        }

        if (!userData.permissions?.includes('admin_access')) {
            return { authorized: false, error: 'Permissões administrativas insuficientes' };
        }

        return { authorized: true };
    }

    /**
     * Log de eventos de segurança
     */
    logSecurityEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date(),
            type: eventType,
            ...data
        };

        console.log(`[WEBSOCKET-AUTH] SECURITY EVENT: ${JSON.stringify(logEntry)}`);
        
        // Aqui você pode integrar com um sistema de logs mais robusto
        // como Winston, ou enviar para um serviço de monitoramento
    }

    /**
     * Limpa dados antigos (rate limiting, etc.)
     */
    cleanup() {
        const now = Date.now();
        const windowStart = now - this.config.rateLimitWindow;

        // Limpar rate limiting antigo
        for (const [userId, requests] of this.rateLimitMap.entries()) {
            const validRequests = requests.filter(timestamp => timestamp > windowStart);
            if (validRequests.length === 0) {
                this.rateLimitMap.delete(userId);
            } else {
                this.rateLimitMap.set(userId, validRequests);
            }
        }

        console.log('[WEBSOCKET-AUTH] Cleanup executado');
    }

    /**
     * Obtém estatísticas de autenticação
     */
    getStats() {
        return {
            blacklistedTokens: this.tokenBlacklist.size,
            activeRateLimits: this.rateLimitMap.size,
            config: this.config
        };
    }
}

module.exports = WebSocketAuth;