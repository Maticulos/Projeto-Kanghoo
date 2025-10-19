const Koa = require('koa');
const KoaRouter = require('koa-router');
const json = require('koa-json');
const path = require('path');
const bcrypt = require('bcryptjs');
const koaBody = require('koa-bodyparser');
const jwt = require('jsonwebtoken');
const db = require('./db');
const serve = require('koa-static');
const cors = require('@koa/cors');
const { securityConfig, getSecurityHeaders, sanitizeForLog, validateInput, validateLoginData, validateCadastroData } = require('./security-config');

require('dotenv').config({ path: '../.env' });

const app = new Koa();
const router = new KoaRouter();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    console.error('⚠️  AVISO DE SEGURANÇA: JWT_SECRET não definido no .env');
    console.error('⚠️  Usando chave temporária - ALTERE IMEDIATAMENTE em produção!');
    return 'temp_key_' + Math.random().toString(36).substring(2, 15);
})();

// --- MIDDLEWARES ---
// A ordem é importante.

// 0. Configurar headers de segurança robustos
app.use(async (ctx, next) => {
    const headers = getSecurityHeaders();
    
    // Aplicar todos os headers de segurança
    Object.entries(headers).forEach(([key, value]) => {
        ctx.set(key, value);
    });
    
    // Remove header que expõe tecnologia
    ctx.remove('X-Powered-By');
    
    await next();
});

// 0.5. Configurar CORS
app.use(cors({
    origin: '*', // Permitir todas as origens para desenvolvimento
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

// 1. Servir arquivos da subpasta 'public' primeiro.
// O Koa vai procurar o index.html aqui e vai encontrá-lo na raiz.
app.use(serve(path.join(__dirname, '../frontend/public')));

// 2. Servir outros arquivos (css, js, imagens) da pasta 'frontend' principal.
// Se um arquivo não for encontrado em 'public', ele procura aqui.
app.use(serve(path.join(__dirname, '../frontend')));

// 3. Processar o corpo da requisição (para rotas de API como /login, /cadastrar)
app.use(koaBody());

// 4. Formatar a saída JSON de forma legível (pretty-print)
app.use(json());

// --- RATE LIMITING ---
const rateLimitStore = new Map();

const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    return async (ctx, next) => {
        const clientIP = ctx.request.ip || ctx.request.socket.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Limpar registros antigos
        if (rateLimitStore.has(clientIP)) {
            const requests = rateLimitStore.get(clientIP).filter(time => time > windowStart);
            rateLimitStore.set(clientIP, requests);
        }
        
        // Verificar limite
        const requests = rateLimitStore.get(clientIP) || [];
        
        if (requests.length >= maxRequests) {
            ctx.status = 429;
            ctx.body = { 
                error: 'Muitas tentativas. Tente novamente em alguns minutos.',
                retryAfter: Math.ceil(windowMs / 1000)
            };
            ctx.set('Retry-After', Math.ceil(windowMs / 1000));
            return;
        }
        
        // Adicionar nova requisição
        requests.push(now);
        rateLimitStore.set(clientIP, requests);
        
        await next();
    };
};

// Rate limiting específico para login (mais restritivo)
const loginRateLimit = rateLimit(
    securityConfig.rateLimit.loginWindowMs, 
    securityConfig.rateLimit.loginMaxRequests
);

// Rate limiting geral
const generalRateLimit = rateLimit(
    securityConfig.rateLimit.windowMs,
    securityConfig.rateLimit.maxRequests
);

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const autenticar = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
        ctx.status = 401;
        ctx.body = { message: 'Token de autenticação não fornecido.' };
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, securityConfig.jwt.secret);
        ctx.state.usuario = decoded;
        await next();
    } catch (err) {
        console.error('Erro na verificação do token:', err.message);
        ctx.status = 401;
        ctx.body = { message: 'Token inválido ou expirado.' };
    }
};

// Funções de validação e sanitização agora estão centralizadas em security-config.js

// --- ROTAS DA API ---

// Aplicar rate limiting geral
app.use(generalRateLimit);

router.post('/api/contact', async (ctx) => {
    const { nome, email, telefone, assunto, mensagem, website } = ctx.request.body || {};

    // Honeypot simples contra bots
    if (website) {
        ctx.status = 200;
        ctx.body = { message: 'OK' };
        return;
    }

    if (!nome || !email || !mensagem) {
        ctx.status = 400;
        ctx.body = { message: 'Nome, e-mail e mensagem são obrigatórios.' };
        return;
    }

    try {
        const insertQuery = `
            INSERT INTO contatos (nome, email, telefone, assunto, mensagem, origem)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const res = await db.query(insertQuery, [
            nome,
            email,
            telefone || null,
            assunto || null,
            mensagem,
            'site'
        ]);
        ctx.status = 201;
        ctx.body = { message: 'Mensagem enviada com sucesso!', id: res.rows[0].id };
    } catch (error) {
        console.error('Erro ao salvar contato:', error);
        ctx.status = 500;
        ctx.body = { message: 'Erro interno do servidor.' };
    }
});

router.post('/cadastrar', async (ctx) => {
    const { 
        tipoCadastro, nomeCompleto, email, senha, celular, dataNascimento, 
        placa, renavam, lotacaoMaxima,
        razaoSocial, cnpj, nomeFantasia
    } = ctx.request.body;

    // Validação usando configuração centralizada
    const validationResult = validateCadastroData(ctx.request.body);
    
    if (!validationResult.isValid) {
        ctx.status = 400;
        ctx.body = { 
            error: 'Dados inválidos', 
            details: validationResult.errors 
        };
        return;
    }

    // Usar dados sanitizados da validação
    const sanitizedData = validationResult.sanitizedData;

    await db.query('BEGIN');
    try {
        const userExists = await db.query('SELECT * FROM usuarios WHERE email = $1', [sanitizedData.email]);
        if (userExists.rows.length > 0) {
            ctx.status = 409;
            ctx.body = { message: 'Este e-mail já está em uso.' };
            await db.query('ROLLBACK');
            return;
        }

        const senhaCrypt = await bcrypt.hash(sanitizedData.senha, securityConfig.bcrypt.saltRounds);
        const novoUsuarioQuery = `
            INSERT INTO usuarios (nome_completo, email, senha, celular, data_nascimento, tipo_cadastro) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const resUsuario = await db.query(novoUsuarioQuery, [
            sanitizedData.nomeCompleto, sanitizedData.email, senhaCrypt, sanitizedData.celular, sanitizedData.dataNascimento, sanitizedData.tipoCadastro
        ]);
        const novoUsuarioId = resUsuario.rows[0].id;

        if (sanitizedData.placa && sanitizedData.renavam) {
            const novoVeiculoQuery = `
                INSERT INTO veiculos (usuario_id, placa, renavam, lotacao_maxima) 
                VALUES ($1, $2, $3, $4)`;
            await db.query(novoVeiculoQuery, [novoUsuarioId, sanitizedData.placa, sanitizedData.renavam, sanitizedData.lotacaoMaxima]);
        }

        if (sanitizedData.razaoSocial && sanitizedData.cnpj) {
            const novaEmpresaQuery = `
                INSERT INTO empresas (usuario_id, razao_social, nome_fantasia, cnpj)
                VALUES ($1, $2, $3, $4)`;
            await db.query(novaEmpresaQuery, [novoUsuarioId, sanitizedData.razaoSocial, sanitizedData.nomeFantasia, sanitizedData.cnpj]);
        }

        await db.query('COMMIT');
        
        // Log de segurança para novo usuário
        const logData = sanitizeForLog({
            action: 'user_registration',
            email: sanitizedData.email,
            tipo: sanitizedData.tipoCadastro,
            ip: ctx.ip,
            timestamp: new Date().toISOString()
        });
        console.log(`[SECURITY] ${JSON.stringify(logData)}`);
        
        ctx.status = 201;
        ctx.body = { 
            message: 'Usuário cadastrado com sucesso!', 
            id: novoUsuarioId,
            tipo: sanitizedData.tipoCadastro
        };

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Erro no cadastro:', error.message);
        ctx.status = 500;
        ctx.body = { error: 'Erro interno do servidor.' };
    }
});

router.post('/login', loginRateLimit, async (ctx) => {
    const { email, senha } = ctx.request.body;
    
    // Validação usando configuração centralizada
    const validationResult = validateLoginData({ email, senha });
    
    if (!validationResult.isValid) {
        ctx.status = 400;
        ctx.body = { 
            error: 'Dados inválidos', 
            details: validationResult.errors 
        };
        return;
    }

    const sanitizedEmail = validationResult.sanitizedData.email;
    
    try {
        let usuario = null;
        let senhaValida = false;
        
        // Primeiro, tentar buscar na tabela de usuários (motoristas)
        const usuarioResult = await db.query('SELECT * FROM usuarios WHERE email = $1', [sanitizedEmail]);
        
        if (usuarioResult.rows.length > 0) {
            usuario = usuarioResult.rows[0];
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        } else {
            // Se não encontrou na tabela de usuários, buscar na tabela de crianças (responsáveis)
            const responsavelResult = await db.query(`
                SELECT 
                    id,
                    nome_responsavel as nome_completo,
                    email_responsavel as email,
                    senha_responsavel as senha,
                    'responsavel' as tipo_cadastro,
                    telefone_responsavel as telefone
                FROM criancas 
                WHERE email_responsavel = $1 AND ativo = true
                LIMIT 1
            `, [sanitizedEmail]);
            
            if (responsavelResult.rows.length > 0) {
                usuario = responsavelResult.rows[0];
                senhaValida = await bcrypt.compare(senha, usuario.senha);
            }
        }
        
        if (!usuario || !senhaValida) {
            const logData = sanitizeForLog({
                action: 'login_failed',
                email: sanitizedEmail,
                ip: ctx.ip,
                timestamp: new Date().toISOString()
            });
            console.log(`[SECURITY] ${JSON.stringify(logData)}`);
            ctx.status = 401;
            ctx.body = { error: 'Credenciais inválidas' };
            return;
        }
        
        // Gerar token JWT usando configuração centralizada
        const token = jwt.sign(
            { 
                userId: usuario.id, 
                email: usuario.email,
                tipo: usuario.tipo_cadastro 
            },
            securityConfig.jwt.secret,
            { expiresIn: securityConfig.jwt.expiresIn }
        );
        
        // Log de segurança para login bem-sucedido
        const logData = sanitizeForLog({
            action: 'login_success',
            email: sanitizedEmail,
            ip: ctx.ip,
            timestamp: new Date().toISOString()
        });
        console.log(`[SECURITY] ${JSON.stringify(logData)}`);
        
        // Determinar URL de redirecionamento baseado no tipo de usuário
        let redirectUrl = '/auth/dashboard.html'; // URL padrão
        
        switch (usuario.tipo_cadastro) {
            case 'motorista_escolar':
                redirectUrl = '/auth/area-motorista-escolar.html';
                break;
            case 'motorista_excursao':
                redirectUrl = '/auth/area-motorista-excursao.html';
                break;
            case 'responsavel':
                redirectUrl = '/auth/area-responsavel.html';
                break;
            default:
                redirectUrl = '/auth/dashboard.html';
        }
        
        ctx.body = { 
            message: 'Login realizado com sucesso',
            token,
            expiresIn: '2h',
            user: {
                id: usuario.id,
                nome: usuario.nome_completo,
                email: usuario.email,
                tipo: usuario.tipo_cadastro
            },
            redirectUrl: redirectUrl
        };
    } catch (error) {
        console.error('❌ Erro no login:', error.message);
        ctx.status = 500;
        ctx.body = { error: 'Erro interno do servidor' };
    }
});

// Endpoint para validar token existente
router.post('/api/validate-token', async (ctx) => {
    try {
        const authHeader = ctx.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { error: 'Token não fornecido' };
            return;
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer '
        
        // Verificar e decodificar o token
        const decoded = jwt.verify(token, securityConfig.jwt.secret);
        
        // Buscar dados atualizados do usuário no banco
        const user = await db.query('SELECT id, nome_completo, email, tipo_cadastro FROM usuarios WHERE id = $1', [decoded.userId]);
        
        if (user.rows.length === 0) {
            ctx.status = 401;
            ctx.body = { error: 'Usuário não encontrado' };
            return;
        }
        
        const usuario = user.rows[0];
        
        // Log de validação de token
        const logData = sanitizeForLog({
            action: 'token_validation',
            userId: usuario.id,
            email: usuario.email,
            ip: ctx.ip,
            timestamp: new Date().toISOString()
        });
        console.log(`[SECURITY] ${JSON.stringify(logData)}`);
        
        ctx.body = {
            valid: true,
            user: {
                id: usuario.id,
                nome: usuario.nome_completo,
                email: usuario.email,
                tipo: usuario.tipo_cadastro
            }
        };
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            ctx.status = 401;
            ctx.body = { error: 'Token inválido ou expirado' };
        } else {
            console.error('❌ Erro na validação do token:', error.message);
            ctx.status = 500;
            ctx.body = { error: 'Erro interno do servidor' };
        }
    }
});

router.get('/api/dashboard', autenticar, async ctx => {
    ctx.status = 200;
    ctx.body = {
        message: "Dados do usuário carregados com sucesso!",
        usuario: { nome: ctx.state.usuario.nome }
    };
});

router.get('/api/motorista/profile', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        const usuarioQuery = 'SELECT * FROM usuarios WHERE id = $1';
        const veiculoQuery = 'SELECT * FROM veiculos WHERE usuario_id = $1';
        const empresaQuery = 'SELECT * FROM empresas WHERE usuario_id = $1';

        const usuarioResult = await db.query(usuarioQuery, [userId]);
        const veiculoResult = await db.query(veiculoQuery, [userId]);
        const empresaResult = await db.query(empresaQuery, [userId]);

        if (usuarioResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { message: "Usuário não encontrado." };
            return;
        }

        ctx.status = 200;
        ctx.body = {
            usuario: usuarioResult.rows[0],
            veiculo: veiculoResult.rows.length > 0 ? veiculoResult.rows[0] : null,
            empresa: empresaResult.rows.length > 0 ? empresaResult.rows[0] : null
        };

    } catch (error) {
        console.error("Erro ao buscar dados do perfil:", error);
        ctx.status = 500;
        ctx.body = { message: "Erro interno do servidor." };
    }
});

// --- ROTAS DA API ---
// Importar rotas
const motoristaEscolarRoutes = require('./routes/motorista-escolar-simple');
const responsavelRoutes = require('./routes/responsavel');
const rastreamentoRoutes = require('./routes/rastreamento');
const trackingApiRoutes = require('./routes/tracking-api');
const cadastroCriancasRoutes = require('./routes/cadastro-criancas');

// Registrar rotas
app.use(motoristaEscolarRoutes.routes());
app.use(motoristaEscolarRoutes.allowedMethods());
app.use(responsavelRoutes.routes());
app.use(responsavelRoutes.allowedMethods());
app.use(rastreamentoRoutes.routes());
app.use(rastreamentoRoutes.allowedMethods());
app.use(trackingApiRoutes.routes());
app.use(trackingApiRoutes.allowedMethods());
app.use(cadastroCriancasRoutes.routes());
app.use(cadastroCriancasRoutes.allowedMethods());
// app.use('/api/responsavel', responsavelRoutes.routes(), responsavelRoutes.allowedMethods());
// app.use('/api/rastreamento', rastreamentoRoutes.routes(), rastreamentoRoutes.allowedMethods());

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.use(router.routes()).use(router.allowedMethods());

const iniciarServidor = async () => {
    try {
        await db.criarTabelas();
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`Acesse a aplicação em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Erro ao iniciar o servidor:", error);
    }
};

iniciarServidor();