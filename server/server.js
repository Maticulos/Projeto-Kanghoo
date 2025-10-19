/**
 * SERVIDOR PRINCIPAL DA APLICAÇÃO DE TRANSPORTE ESCOLAR
 * 
 * Este arquivo configura e inicializa o servidor Koa.js que serve como backend
 * para a aplicação de transporte escolar. O servidor gerencia:
 * 
 * - Autenticação e autorização de usuários
 * - Cadastro de motoristas, responsáveis e crianças
 * - Sistema de rastreamento de veículos
 * - API para comunicação com o frontend
 * - Segurança robusta com rate limiting e validações
 * 
 * Tecnologias utilizadas:
 * - Koa.js: Framework web minimalista para Node.js
 * - PostgreSQL: Banco de dados relacional
 * - JWT: Autenticação baseada em tokens
 * - bcrypt: Hash seguro de senhas
 * 
 * @author Equipe de Desenvolvimento
 * @version 1.0.0
 */

// === IMPORTAÇÕES DE DEPENDÊNCIAS ===

// Framework web Koa.js e seus middlewares
const Koa = require('koa');                    // Framework principal
const KoaRouter = require('koa-router');       // Sistema de rotas
const json = require('koa-json');              // Formatação de JSON
const koaBody = require('koa-bodyparser');     // Parser do corpo das requisições
const serve = require('koa-static');           // Servir arquivos estáticos
const cors = require('@koa/cors');             // Cross-Origin Resource Sharing

// Utilitários do Node.js
const path = require('path');                  // Manipulação de caminhos de arquivos

// Bibliotecas de segurança
const bcrypt = require('bcryptjs');            // Hash de senhas
const jwt = require('jsonwebtoken');           // JSON Web Tokens

// Configurações personalizadas
const db = require('./config/db');             // Conexão com banco de dados
const { 
    securityConfig, 
    getSecurityHeaders, 
    sanitizeForLog, 
    validateInput, 
    validateLoginData, 
    validateCadastroData 
} = require('./config/security-config');       // Configurações de segurança

// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config({ path: '../.env' });

// === INICIALIZAÇÃO DA APLICAÇÃO ===

const app = new Koa();                         // Instância principal do Koa
const router = new KoaRouter();                // Roteador principal
const PORT = process.env.PORT || 5000;         // Porta do servidor (padrão: 5000)

// Configuração do JWT Secret com fallback seguro
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    console.error('⚠️  AVISO DE SEGURANÇA: JWT_SECRET não definido no .env');
    console.error('⚠️  Usando chave temporária - ALTERE IMEDIATAMENTE em produção!');
    return 'temp_key_' + Math.random().toString(36).substring(2, 15);
})();

// === CONFIGURAÇÃO DE MIDDLEWARES ===
// IMPORTANTE: A ordem dos middlewares é crucial no Koa.js
// Cada middleware é executado na ordem definida aqui

/**
 * MIDDLEWARE 1: HEADERS DE SEGURANÇA
 * 
 * Aplica headers de segurança robustos em todas as respostas para proteger
 * contra ataques comuns como XSS, clickjacking, MIME sniffing, etc.
 * 
 * Headers aplicados:
 * - X-Frame-Options: Previne clickjacking
 * - X-Content-Type-Options: Previne MIME sniffing
 * - X-XSS-Protection: Ativa proteção XSS do navegador
 * - Content-Security-Policy: Define política de segurança de conteúdo
 * - Referrer-Policy: Controla informações de referrer
 */
app.use(async (ctx, next) => {
    const headers = getSecurityHeaders();
    
    // Aplicar todos os headers de segurança definidos na configuração
    Object.entries(headers).forEach(([key, value]) => {
        ctx.set(key, value);
    });
    
    // Remove header que expõe a tecnologia utilizada (segurança por obscuridade)
    ctx.remove('X-Powered-By');
    
    await next();
});

/**
 * MIDDLEWARE 2: CORS (Cross-Origin Resource Sharing)
 * 
 * Configura as políticas de CORS para permitir requisições do frontend.
 * Em desenvolvimento, permite todas as origens para facilitar testes.
 * Em produção, deve ser configurado com domínios específicos.
 */
app.use(cors({
    origin: '*',                                    // DESENVOLVIMENTO: Permitir todas as origens
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],  // Headers permitidos
    credentials: true                               // Permitir cookies e credenciais
}));

/**
 * MIDDLEWARE 3: SERVIDOR DE ARQUIVOS ESTÁTICOS - PÚBLICO
 * 
 * Serve arquivos da pasta 'frontend/public' com prioridade.
 * Esta pasta contém os arquivos HTML principais da aplicação.
 * O Koa procura primeiro aqui por arquivos como index.html.
 */
app.use(serve(path.join(__dirname, '../frontend/public')));

/**
 * MIDDLEWARE 4: SERVIDOR DE ARQUIVOS ESTÁTICOS - GERAL
 * 
 * Serve outros arquivos estáticos (CSS, JS, imagens) da pasta 'frontend'.
 * Este middleware só é executado se o arquivo não for encontrado na pasta 'public'.
 * Implementa um sistema de fallback para servir recursos estáticos.
 */
app.use(serve(path.join(__dirname, '../frontend')));

/**
 * MIDDLEWARE 5: PARSER DO CORPO DAS REQUISIÇÕES
 * 
 * Processa o corpo das requisições HTTP (JSON, form-data, etc.)
 * e disponibiliza os dados em ctx.request.body.
 * Essencial para rotas de API que recebem dados do cliente.
 */
app.use(koaBody());

/**
 * MIDDLEWARE 6: FORMATAÇÃO DE JSON
 * 
 * Formata a saída JSON de forma legível (pretty-print) durante desenvolvimento.
 * Melhora a experiência de debugging ao visualizar respostas da API.
 */
app.use(json());

// === SISTEMA DE RATE LIMITING ===

/**
 * ARMAZENAMENTO EM MEMÓRIA PARA RATE LIMITING
 * 
 * Utiliza um Map para armazenar as requisições por IP.
 * Em produção, considere usar Redis para persistência e escalabilidade.
 * 
 * Estrutura: Map<IP_ADDRESS, Array<TIMESTAMP>>
 */
const rateLimitStore = new Map();

/**
 * FACTORY FUNCTION PARA RATE LIMITING
 * 
 * Cria um middleware de rate limiting configurável que limita o número
 * de requisições por IP em uma janela de tempo específica.
 * 
 * Algoritmo: Sliding Window
 * - Mantém um array de timestamps para cada IP
 * - Remove timestamps antigos automaticamente
 * - Bloqueia requisições quando o limite é atingido
 * 
 * @param {number} windowMs - Janela de tempo em milissegundos (padrão: 15 minutos)
 * @param {number} maxRequests - Número máximo de requisições (padrão: 100)
 * @returns {Function} Middleware do Koa para rate limiting
 */
const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    return async (ctx, next) => {
        // Obter IP do cliente (considera proxies e load balancers)
        const clientIP = ctx.request.ip || ctx.request.socket.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Limpeza automática: remover registros antigos da janela de tempo
        if (rateLimitStore.has(clientIP)) {
            const requests = rateLimitStore.get(clientIP).filter(time => time > windowStart);
            rateLimitStore.set(clientIP, requests);
        }
        
        // Verificar se o limite foi atingido
        const requests = rateLimitStore.get(clientIP) || [];
        
        if (requests.length >= maxRequests) {
            // Limite atingido: retornar erro 429 (Too Many Requests)
            ctx.status = 429;
            ctx.body = { 
                error: 'Muitas tentativas. Tente novamente em alguns minutos.',
                retryAfter: Math.ceil(windowMs / 1000)
            };
            // Header padrão para informar quando tentar novamente
            ctx.set('Retry-After', Math.ceil(windowMs / 1000));
            return;
        }
        
        // Registrar nova requisição e continuar
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

// Rota de proxy para busca de CEP
router.get('/api/cep/:cep', async (ctx) => {
    const { cep } = ctx.params;
    
    // Validar formato do CEP
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        ctx.status = 400;
        ctx.body = { error: 'CEP deve ter 8 dígitos' };
        return;
    }
    
    try {
        // Fazer requisição para ViaCEP usando https nativo
        const https = require('https');
        
        const dados = await new Promise((resolve, reject) => {
            const req = https.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (parseError) {
                        reject(new Error('Erro ao processar resposta da API'));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout na requisição'));
            });
        });
        
        if (dados.erro) {
            ctx.status = 404;
            ctx.body = { error: 'CEP não encontrado' };
            return;
        }
        
        ctx.status = 200;
        ctx.body = dados;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        ctx.status = 500;
        ctx.body = { error: 'Erro interno do servidor' };
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
const transportesRoutes = require('./routes/transportes');

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
app.use('/api/transportes', transportesRoutes.routes(), transportesRoutes.allowedMethods());
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