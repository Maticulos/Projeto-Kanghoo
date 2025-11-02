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

// === CARREGAMENTO DE VARIÁVEIS DE AMBIENTE ===
require('dotenv').config();

// === IMPORTAÇÕES DE DEPENDÊNCIAS ===

// Framework web Koa.js e seus middlewares
const Koa = require('koa');                    // Framework principal
const KoaRouter = require('koa-router');       // Sistema de rotas
const json = require('koa-json');              // Formatação de JSON
const bodyParser = require('koa-bodyparser');     // Parser do corpo das requisições
const serve = require('koa-static');           // Servir arquivos estáticos
const cors = require('@koa/cors');             // Cross-Origin Resource Sharing
const compress = require('koa-compress');      // Compressão de respostas HTTP

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
const logger = require('./utils/logger');      // Sistema de logging centralizado
const { errorHandler } = require('./utils/api-response'); // Middleware de tratamento de erro global

// === INICIALIZAÇÃO DA APLICAÇÃO ===

const app = new Koa();                         // Instância principal do Koa
const router = new KoaRouter();                // Roteador principal
const PORT = process.env.PORT || 3000;         // Porta do servidor (padrão: 3000)

// Configuração do JWT Secret com fallback seguro
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    logger.error('⚠️  AVISO DE SEGURANÇA: JWT_SECRET não definido no .env');
    logger.error('⚠️  Usando chave temporária - ALTERE IMEDIATAMENTE em produção!');
    return 'temp_key_' + Math.random().toString(36).substring(2, 15);
})();

// === CONFIGURAÇÃO DE MIDDLEWARES ===
// IMPORTANTE: A ordem dos middlewares é crucial no Koa.js
// Cada middleware é executado na ordem definida aqui

// Middleware de tratamento de erro global (deve ser o primeiro)
app.use(errorHandler);

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
 * MIDDLEWARE 2: COMPRESSÃO DE RESPOSTAS HTTP
 * 
 * Comprime automaticamente as respostas HTTP usando gzip/deflate para reduzir
 * o tamanho dos dados transferidos e melhorar a performance da aplicação.
 * 
 * Configurações:
 * - threshold: Comprime apenas respostas maiores que 1KB
 * - gzip: Ativa compressão gzip (padrão e mais compatível)
 * - deflate: Ativa compressão deflate como alternativa
 * - br: Ativa compressão Brotli para navegadores modernos (melhor taxa)
 */
app.use(compress({
    filter(content_type) {
        // Comprime apenas tipos de conteúdo que se beneficiam da compressão
        return /text|javascript|json|xml|svg/.test(content_type);
    },
    threshold: 1024,        // Comprime apenas respostas > 1KB
    gzip: {
        flush: require('zlib').constants.Z_SYNC_FLUSH,
    },
    deflate: {
        flush: require('zlib').constants.Z_SYNC_FLUSH,
    },
    br: false // Desabilitado por compatibilidade, pode ser habilitado se necessário
}));

/**
 * MIDDLEWARE 3: CORS (Cross-Origin Resource Sharing)
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
 * MIDDLEWARE 4: SERVIDOR DE ARQUIVOS ESTÁTICOS - PÚBLICO
 * 
 * Serve arquivos da pasta 'frontend/public' com prioridade.
 * Esta pasta contém os arquivos HTML principais da aplicação.
 * O Koa procura primeiro aqui por arquivos como index.html.
 */
app.use(serve(path.join(__dirname, '../frontend/public')));

/**
 * MIDDLEWARE 5: SERVIDOR DE ARQUIVOS ESTÁTICOS - GERAL
 * 
 * Serve outros arquivos estáticos (CSS, JS, imagens) da pasta 'frontend'.
 * Este middleware só é executado se o arquivo não for encontrado na pasta 'public'.
 * Implementa um sistema de fallback para servir recursos estáticos.
 */
app.use(serve(path.join(__dirname, '../frontend')));

/**
 * MIDDLEWARE 6: PARSER DO CORPO DAS REQUISIÇÕES
 * 
 * Processa o corpo das requisições HTTP (JSON, form-data, etc.)
 * e disponibiliza os dados em ctx.request.body.
 * Essencial para rotas de API que recebem dados do cliente.
 */
app.use(bodyParser());

/**
 * MIDDLEWARE 7: FORMATAÇÃO DE JSON
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

const cadastroRateLimit = rateLimit(
    15 * 60 * 1000, // 15 minutos
    10 // 10 tentativas de cadastro por IP
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
        logger.error('Erro na verificação do token:', err.message);
        ctx.status = 401;
        ctx.body = { message: 'Token inválido ou expirado.' };
    }
};

// Funções de validação e sanitização agora estão centralizadas em security-config.js

// --- ROTAS DA API ---

// Aplicar rate limiting geral
app.use(generalRateLimit);

// Rota de health check para monitoramento
router.get('/api/health', async (ctx) => {
    ctx.body = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    };
});

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
        logger.error('Erro ao salvar contato:', error);
        ctx.status = 500;
        ctx.body = { message: 'Erro interno do servidor.' };
    }
});

// Cache simples para CEPs (em memória)
const cepCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Rota de proxy para busca de CEP com melhorias
router.get('/api/cep/:cep', async (ctx) => {
    const { cep } = ctx.params;
    
    // Validar formato do CEP
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        ctx.status = 400;
        ctx.body = { error: 'CEP deve ter 8 dígitos' };
        return;
    }
    
    // Verificar cache primeiro
    const cacheKey = cepLimpo;
    const cached = cepCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        ctx.status = 200;
        ctx.body = cached.data;
        return;
    }
    
    try {
        const https = require('https');
        
        // Função para fazer requisição com timeout melhorado
        const buscarCEP = (url, timeout = 8000) => {
            return new Promise((resolve, reject) => {
                const req = https.get(url, {
                    timeout: timeout,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; CEP-API/1.0)'
                    }
                }, (res) => {
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
                
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout na requisição'));
                });
            });
        };
        
        let dados = null;
        let ultimoErro = null;
        
        // Tentar ViaCEP primeiro
        try {
            dados = await buscarCEP(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (dados && !dados.erro && dados.localidade && dados.uf) {
                // Sucesso com ViaCEP
            } else {
                throw new Error('CEP não encontrado no ViaCEP');
            }
        } catch (error) {
            ultimoErro = error;
            logger.warn(`ViaCEP falhou para CEP ${cepLimpo}:`, error.message);
            
            // Fallback para API dos Correios (se disponível)
            try {
                dados = await buscarCEP(`https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente?cep=${cepLimpo}`, 5000);
                if (dados && (dados.localidade || dados.cidade) && dados.uf) {
                    // Normalizar resposta dos Correios para formato ViaCEP
                    dados = {
                        cep: dados.cep || `${cepLimpo.substring(0,5)}-${cepLimpo.substring(5)}`,
                        logradouro: dados.logradouro || dados.end,
                        complemento: dados.complemento || '',
                        bairro: dados.bairro || dados.distrito,
                        localidade: dados.localidade || dados.cidade,
                        uf: dados.uf,
                        estado: dados.estado || dados.uf,
                        ibge: dados.ibge || '',
                        gia: dados.gia || '',
                        ddd: dados.ddd || '',
                        siafi: dados.siafi || ''
                    };
                } else {
                    throw new Error('CEP não encontrado nos Correios');
                }
            } catch (correiosError) {
                logger.warn(`Correios também falhou para CEP ${cepLimpo}:`, correiosError.message);
                throw ultimoErro; // Usar o erro original do ViaCEP
            }
        }
        
        if (!dados || dados.erro || !dados.localidade || !dados.uf) {
            ctx.status = 404;
            ctx.body = { 
                error: 'CEP não encontrado',
                details: 'Verifique se o CEP está correto e tente novamente'
            };
            return;
        }
        
        // Armazenar no cache
        cepCache.set(cacheKey, {
            data: dados,
            timestamp: Date.now()
        });
        
        // Limpar cache antigo periodicamente (manter apenas 1000 entradas)
        if (cepCache.size > 1000) {
            const entries = Array.from(cepCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toDelete = entries.slice(0, 200); // Remove os 200 mais antigos
            toDelete.forEach(([key]) => cepCache.delete(key));
        }
        
        ctx.status = 200;
        ctx.body = dados;
    } catch (error) {
        logger.error('Erro ao buscar CEP:', error);
        ctx.status = 500;
        ctx.body = { 
            error: 'Erro interno do servidor',
            details: 'Tente novamente em alguns instantes'
        };
    }
});

router.post('/cadastrar', cadastroRateLimit, async (ctx) => {
    logger.debug('Iniciando cadastro via API...');
    
    const { 
        tipoCadastro, nomeCompleto, email, senha, celular, dataNascimento, 
        placa, renavam, lotacaoMaxima,
        razaoSocial, cnpj, nomeFantasia
    } = ctx.request.body;

    logger.debug('Dados recebidos:', { tipoCadastro, nomeCompleto, email: email?.substring(0, 5) + '***' });

    // Validação usando configuração centralizada
    const validationResult = validateCadastroData(ctx.request.body);
    
    if (!validationResult.isValid) {
        logger.debug('Validação falhou:', validationResult.errors);
        ctx.status = 400;
        ctx.body = { 
            error: 'Dados inválidos', 
            details: validationResult.errors 
        };
        return;
    }

    logger.debug('Validação passou');
    
    // Usar dados sanitizados da validação
    const sanitizedData = validationResult.sanitizedData;

    logger.debug('Iniciando transação...');
    await db.query('BEGIN');
    try {
        logger.debug('Verificando email duplicado...');
        const userExists = await db.query('SELECT * FROM usuarios WHERE email = $1', [sanitizedData.email]);
        if (userExists.rows.length > 0) {
            logger.debug('Email já existe, fazendo rollback');
            ctx.status = 409;
            ctx.body = { message: 'Este e-mail já está em uso.' };
            await db.query('ROLLBACK');
            return;
        }

        logger.debug('Gerando hash da senha...');
        const senhaCrypt = await bcrypt.hash(sanitizedData.senha, securityConfig.bcrypt.saltRounds);
        
        logger.debug('Inserindo usuário...');
        const novoUsuarioQuery = `
            INSERT INTO usuarios (nome_completo, email, senha, celular, data_nascimento, tipo_cadastro) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const resUsuario = await db.query(novoUsuarioQuery, [
            sanitizedData.nomeCompleto, sanitizedData.email, senhaCrypt, sanitizedData.celular, sanitizedData.dataNascimento, sanitizedData.tipoCadastro
        ]);
        const novoUsuarioId = resUsuario.rows[0].id;
        logger.debug('Usuário inserido com ID:', novoUsuarioId);

        if (sanitizedData.placa && sanitizedData.renavam) {
            logger.debug('Inserindo veículo...');
            const novoVeiculoQuery = `
                INSERT INTO veiculos (usuario_id, placa, renavam, lotacao_maxima) 
                VALUES ($1, $2, $3, $4)`;
            await db.query(novoVeiculoQuery, [novoUsuarioId, sanitizedData.placa, sanitizedData.renavam, sanitizedData.lotacaoMaxima]);
            logger.debug('Veículo inserido');
        }

        if (sanitizedData.razaoSocial && sanitizedData.cnpj) {
            logger.debug('Inserindo empresa...');
            const novaEmpresaQuery = `
                INSERT INTO empresas (usuario_id, razao_social, nome_fantasia, cnpj)
                VALUES ($1, $2, $3, $4)`;
            await db.query(novaEmpresaQuery, [novoUsuarioId, sanitizedData.razaoSocial, sanitizedData.nomeFantasia, sanitizedData.cnpj]);
            logger.debug('Empresa inserida');
        }

        logger.debug('Fazendo COMMIT...');
        const commitResult = await db.query('COMMIT');
        logger.debug('COMMIT realizado com sucesso', commitResult);
        
        // Verificação imediata após commit
        logger.debug('Verificando se usuário foi salvo...');
        const verifyUser = await db.query('SELECT * FROM usuarios WHERE id = $1', [novoUsuarioId]);
        logger.debug('Usuário encontrado após commit:', verifyUser.rows.length > 0 ? 'SIM' : 'NÃO');
        if (verifyUser.rows.length > 0) {
            logger.debug('Dados do usuário:', { id: verifyUser.rows[0].id, nome: verifyUser.rows[0].nome_completo, email: verifyUser.rows[0].email });
        }
        
        // Log de segurança para novo usuário
        const logData = sanitizeForLog({
            action: 'user_registration',
            email: sanitizedData.email,
            tipo: sanitizedData.tipoCadastro,
            ip: ctx.ip,
            timestamp: new Date().toISOString()
        });
        logger.info(`[SECURITY] ${JSON.stringify(logData)}`);
        
        ctx.status = 201;
        ctx.body = { 
            message: 'Usuário cadastrado com sucesso!', 
            id: novoUsuarioId,
            tipo: sanitizedData.tipoCadastro
        };

    } catch (error) {
        await db.query('ROLLBACK');
        logger.error('❌ Erro no cadastro:', error.message);
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
        
        // Buscar na tabela de usuários
        const usuarioResult = await db.query('SELECT * FROM usuarios WHERE email = $1', [sanitizedEmail]);
        
        if (usuarioResult.rows.length > 0) {
            usuario = usuarioResult.rows[0];
            senhaValida = await bcrypt.compare(senha, usuario.senha);
        }
        
        if (!usuario || !senhaValida) {
            const logData = sanitizeForLog({
                action: 'login_failed',
                email: sanitizedEmail,
                ip: ctx.ip,
                timestamp: new Date().toISOString()
            });
            logger.security(`Tentativa de login com dados inválidos`, logData);
            ctx.status = 401;
            ctx.body = { error: 'Credenciais inválidas' };
            return;
        }
        
        // Gerar token JWT usando configuração centralizada
        const token = jwt.sign(
            { 
                userId: usuario.id, 
                email: usuario.email,
                tipo: usuario.tipo_cadastro,
                nomeCompleto: usuario.nome_completo
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
        logger.security(`Login realizado com sucesso`, logData);
        
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
        logger.error('❌ Erro no login:', error.message);
        ctx.status = 500;
        ctx.body = { error: 'Erro interno do servidor' };
    }
});

// Endpoint para validar token existente
router.post('/api/validate-token', async (ctx) => {
    logger.info('🔍 [VALIDATE-TOKEN] Requisição recebida');
    
    try {
        const authHeader = ctx.headers.authorization;
        logger.info(`🔍 [VALIDATE-TOKEN] Authorization header: ${authHeader ? 'presente' : 'ausente'}`);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('⚠️ [VALIDATE-TOKEN] Token não fornecido ou formato inválido');
            ctx.status = 401;
            ctx.body = { error: 'Token não fornecido' };
            return;
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer '
        logger.info(`🔍 [VALIDATE-TOKEN] Token extraído: ${token.substring(0, 20)}...`);
        
        // Token de desenvolvimento
        if (token === 'dev_token_responsavel_teste' && process.env.NODE_ENV !== 'production') {
            logger.info('✅ [VALIDATE-TOKEN] Token de desenvolvimento válido');
            ctx.body = {
                valid: true,
                user: {
                    id: 999,
                    nome: 'Responsável Teste',
                    email: 'responsavel@teste.com',
                    tipo: 'responsavel'
                }
            };
            return;
        }
        
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
        logger.security(`Token validado com sucesso`, logData);
        
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
        logger.error(`❌ [VALIDATE-TOKEN] Erro capturado: ${error.name} - ${error.message}`);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            logger.warn('⚠️ [VALIDATE-TOKEN] Token inválido ou expirado');
            ctx.status = 401;
            ctx.body = { error: 'Token inválido ou expirado' };
        } else {
            logger.error('❌ [VALIDATE-TOKEN] Erro interno do servidor:', error.message);
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

// Rota de perfil do motorista (versão em inglês)
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
        logger.error("Erro ao buscar dados do perfil:", error);
        ctx.status = 500;
        ctx.body = { message: "Erro interno do servidor." };
    }
});

// Rota de perfil do motorista (versão em português)
router.get('/api/motorista/perfil', autenticar, async ctx => {
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
        logger.error("Erro ao buscar dados do perfil:", error);
        ctx.status = 500;
        ctx.body = { message: "Erro interno do servidor." };
    }
});

// Rota para listar crianças do motorista
router.get('/api/motorista/criancas', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        const resultado = await db.query(`
            SELECT c.*, u.nome_completo as responsavel_nome, u.email as responsavel_email,
                   r.nome_rota, r.horario_inicio, r.horario_fim
            FROM criancas c
            LEFT JOIN usuarios u ON c.responsavel_id = u.id
            LEFT JOIN rotas r ON c.rota_id = r.id
            WHERE c.motorista_id = $1 AND c.ativo = true
            ORDER BY c.nome_completo
        `, [userId]);

        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            criancas: resultado.rows
        };
    } catch (error) {
        logger.error('Erro ao listar crianças:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            mensagem: 'Erro interno do servidor'
        };
    }
});

// Rota de perfil do responsável
router.get('/api/responsavel/perfil', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        const usuarioQuery = 'SELECT * FROM usuarios WHERE id = $1';
        const assinaturaQuery = 'SELECT * FROM assinaturas WHERE usuario_id = $1';

        const usuarioResult = await db.query(usuarioQuery, [userId]);
        const assinaturaResult = await db.query(assinaturaQuery, [userId]);

        if (usuarioResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { message: "Usuário não encontrado." };
            return;
        }

        ctx.status = 200;
        ctx.body = {
            usuario: usuarioResult.rows[0],
            assinatura: assinaturaResult.rows.length > 0 ? assinaturaResult.rows[0] : null
        };

    } catch (error) {
        logger.error("Erro ao buscar dados do perfil do responsável:", error);
        ctx.status = 500;
        ctx.body = { message: "Erro interno do servidor." };
    }
});

// Rota para status da assinatura do responsável
router.get('/api/responsavel/assinatura', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        const planoQuery = `
            SELECT 
                p.id,
                p.tipo_plano as nome,
                p.limite_rotas,
                p.limite_usuarios,
                p.data_inicio,
                p.data_fim as data_vencimento,
                p.ativo,
                p.criado_em,
                p.atualizado_em
            FROM planos_assinatura p
            WHERE p.usuario_id = $1
            ORDER BY p.criado_em DESC
            LIMIT 1
        `;

        const planoResult = await db.query(planoQuery, [userId]);

        if (planoResult.rows.length === 0) {
            ctx.status = 200;
            ctx.body = {
                assinatura: null,
                status: 'sem_assinatura',
                message: "Usuário não possui assinatura ativa."
            };
            return;
        }

        const plano = planoResult.rows[0];
        const agora = new Date();
        const dataVencimento = new Date(plano.data_vencimento);
        
        let status = 'ativa';
        if (dataVencimento < agora) {
            status = 'vencida';
        } else if (!plano.ativo) {
            status = 'cancelada';
        }

        ctx.status = 200;
        ctx.body = {
            assinatura: plano,
            status: status,
            dias_restantes: Math.ceil((dataVencimento - agora) / (1000 * 60 * 60 * 24))
        };

    } catch (error) {
        logger.error("Erro ao buscar status da assinatura:", error);
        ctx.status = 500;
        ctx.body = { message: "Erro interno do servidor." };
    }
});

// Rota para listar crianças do responsável
router.get('/api/responsavel/criancas', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        const criancasQuery = `
            SELECT c.*, r.nome_rota, r.horario_inicio, r.horario_fim,
                   u.nome_completo as motorista_nome, u.telefone as motorista_telefone
            FROM criancas c
            LEFT JOIN rotas r ON c.rota_id = r.id
            LEFT JOIN usuarios u ON c.motorista_id = u.id
            WHERE c.responsavel_id = $1 AND c.ativo = true
            ORDER BY c.nome_completo
        `;

        const criancasResult = await db.query(criancasQuery, [userId]);

        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            criancas: criancasResult.rows,
            total: criancasResult.rows.length
        };

    } catch (error) {
        logger.error("Erro ao listar crianças do responsável:", error);
        ctx.status = 500;
        ctx.body = { 
            sucesso: false,
            message: "Erro interno do servidor." 
        };
    }
});

// Rota para iniciar conferência de crianças
router.post('/api/motorista/conferencia', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        const { rota_id, tipo_conferencia } = ctx.request.body;

        if (!rota_id || !tipo_conferencia) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                message: "Rota ID e tipo de conferência são obrigatórios."
            };
            return;
        }

        // Verificar se a rota pertence ao motorista
        const rotaQuery = 'SELECT * FROM rotas WHERE id = $1 AND motorista_id = $2';
        const rotaResult = await db.query(rotaQuery, [rota_id, userId]);

        if (rotaResult.rows.length === 0) {
            ctx.status = 403;
            ctx.body = {
                sucesso: false,
                message: "Rota não encontrada ou não pertence ao motorista."
            };
            return;
        }

        // Criar registro de conferência
        const conferenciaQuery = `
            INSERT INTO conferencias (motorista_id, rota_id, tipo_conferencia, data_inicio, status)
            VALUES ($1, $2, $3, NOW(), 'em_andamento')
            RETURNING *
        `;

        const conferenciaResult = await db.query(conferenciaQuery, [userId, rota_id, tipo_conferencia]);

        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            conferencia: conferenciaResult.rows[0],
            message: "Conferência iniciada com sucesso."
        };

    } catch (error) {
        logger.error("Erro ao iniciar conferência:", error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: "Erro interno do servidor."
        };
    }
});

// Rota para cadastrar nova criança
router.post('/api/responsavel/criancas', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        const { 
            nome_completo, 
            data_nascimento, 
            endereco_residencial, 
            escola, 
            endereco_escola,
            rota_id,
            observacoes 
        } = ctx.request.body;

        // Validação básica
        if (!nome_completo || !data_nascimento || !endereco_residencial || !escola) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                message: "Nome completo, data de nascimento, endereço residencial e escola são obrigatórios."
            };
            return;
        }

        // Inserir nova criança
        const criancaQuery = `
            INSERT INTO criancas (
                responsavel_id, nome_completo, data_nascimento, 
                endereco_residencial, escola, endereco_escola, 
                rota_id, observacoes, ativo, criado_em
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
            RETURNING *
        `;

        const criancaResult = await db.query(criancaQuery, [
            userId, nome_completo, data_nascimento, 
            endereco_residencial, escola, endereco_escola, 
            rota_id, observacoes
        ]);

        ctx.status = 201;
        ctx.body = {
            sucesso: true,
            crianca: criancaResult.rows[0],
            message: "Criança cadastrada com sucesso."
        };

    } catch (error) {
        logger.error("Erro ao cadastrar criança:", error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: "Erro interno do servidor."
        };
    }
});

// Rota para preferências de notificação
router.get('/api/responsavel/notificacoes', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        const preferencesQuery = `
            SELECT * FROM notification_preferences 
            WHERE user_id = $1
        `;

        const preferencesResult = await db.query(preferencesQuery, [userId]);

        if (preferencesResult.rows.length === 0) {
            // Criar preferências padrão se não existirem
            const defaultPreferencesQuery = `
                INSERT INTO notification_preferences (
                    user_id, email_notifications, sms_notifications, 
                    push_notifications, arrival_notifications, 
                    departure_notifications, delay_notifications,
                    emergency_notifications, created_at
                )
                VALUES ($1, true, false, true, true, true, true, true, NOW())
                RETURNING *
            `;

            const defaultResult = await db.query(defaultPreferencesQuery, [userId]);
            
            ctx.status = 200;
            ctx.body = {
                sucesso: true,
                preferencias: defaultResult.rows[0],
                message: "Preferências padrão criadas."
            };
        } else {
            ctx.status = 200;
            ctx.body = {
                sucesso: true,
                preferencias: preferencesResult.rows[0]
            };
        }

    } catch (error) {
        logger.error("Erro ao buscar preferências de notificação:", error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: "Erro interno do servidor."
        };
    }
});

// Rota para buscar perfil de usuários (motoristas e responsáveis)
router.get('/api/usuarios/perfil', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        // Buscar dados do usuário
        const usuarioQuery = `
            SELECT u.id, u.nome_completo, u.email, u.celular, u.tipo_cadastro, 
                   u.data_nascimento, u.criado_em
            FROM usuarios u 
            WHERE u.id = $1
        `;
        
        const usuarioResult = await db.query(usuarioQuery, [userId]);
        
        if (usuarioResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                message: 'Usuário não encontrado'
            };
            return;
        }
        
        const dadosUsuario = usuarioResult.rows[0];
        let dadosAdicionais = {};
        
        // Se for motorista, buscar dados do veículo e empresa
        if (dadosUsuario.tipo_cadastro === 'motorista_escolar' || dadosUsuario.tipo_cadastro === 'motorista_excursao') {
            const veiculoQuery = `
                SELECT v.placa, v.renavam, v.lotacao_maxima
                FROM veiculos v
                WHERE v.usuario_id = $1
            `;
            
            const veiculoResult = await db.query(veiculoQuery, [userId]);
            
            if (veiculoResult.rows.length > 0) {
                dadosAdicionais.veiculo = veiculoResult.rows[0];
            }
            
            const empresaQuery = `
                SELECT e.razao_social, e.nome_fantasia, e.cnpj
                FROM empresas e
                WHERE e.usuario_id = $1
            `;
            
            const empresaResult = await db.query(empresaQuery, [userId]);
            
            if (empresaResult.rows.length > 0) {
                dadosAdicionais.empresa = empresaResult.rows[0];
            }
        }
        
        // Se for responsável, buscar dados do plano (se houver)
        if (dadosUsuario.tipo_cadastro === 'responsavel') {
            const planoQuery = `
                SELECT p.id, p.tipo_plano, p.limite_rotas, p.limite_usuarios, p.ativo
                FROM planos_assinatura p
                WHERE p.usuario_id = $1 AND p.ativo = true
            `;
            
            const planoResult = await db.query(planoQuery, [userId]);
            
            if (planoResult.rows.length > 0) {
                dadosAdicionais.plano = planoResult.rows[0];
            }
        }
        
        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            dados: {
                ...dadosUsuario,
                ...dadosAdicionais
            }
        };
    } catch (error) {
        logger.error('Erro ao buscar perfil do usuário:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para buscar status da assinatura
router.get('/api/assinaturas/status', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        // Buscar plano ativo do usuário
        const planoQuery = `
            SELECT p.id, p.tipo_plano as plano_nome, p.limite_rotas, p.limite_usuarios,
                   p.data_inicio, p.data_fim, p.ativo, p.criado_em
            FROM planos_assinatura p
            WHERE p.usuario_id = $1
            ORDER BY p.criado_em DESC
            LIMIT 1
        `;
        
        const planoResult = await db.query(planoQuery, [userId]);
        
        if (planoResult.rows.length === 0) {
            ctx.status = 200;
            ctx.body = {
                sucesso: true,
                dados: {
                    status: 'sem_plano',
                    message: 'Usuário não possui plano ativo',
                    plano_atual: null,
                    dias_restantes: 0,
                    vencimento: null
                }
            };
            return;
        }
        
        const dadosPlano = planoResult.rows[0];
        const hoje = new Date();
        let diasRestantes = 0;
        let statusFinal = dadosPlano.ativo ? 'ativa' : 'inativa';
        
        // Verificar se há data de fim e calcular dias restantes
        if (dadosPlano.data_fim) {
            const dataVencimento = new Date(dadosPlano.data_fim);
            diasRestantes = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
            
            // Verificar se o plano venceu
            if (diasRestantes <= 0 && dadosPlano.ativo) {
                statusFinal = 'vencida';
                
                // Atualizar status no banco
                await db.query(
                    'UPDATE planos_assinatura SET ativo = $1 WHERE id = $2',
                    [false, dadosPlano.id]
                );
            }
        }
        
        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            dados: {
                id: dadosPlano.id,
                status: statusFinal,
                plano_atual: {
                    id: dadosPlano.id,
                    nome: dadosPlano.plano_nome,
                    limite_rotas: dadosPlano.limite_rotas,
                    limite_usuarios: dadosPlano.limite_usuarios
                },
                data_inicio: dadosPlano.data_inicio,
                data_vencimento: dadosPlano.data_fim,
                dias_restantes: Math.max(0, diasRestantes),
                valor: null, // Não há valor na tabela planos_assinatura
                renovacao_automatica: false // Pode ser implementado futuramente
            }
        };
    } catch (error) {
        logger.error('Erro ao buscar status da assinatura:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para listar planos disponíveis
router.get('/api/planos', async ctx => {
    try {
        // Buscar todos os planos ativos
        const planosQuery = `
            SELECT id, tipo_plano, limite_rotas, limite_usuarios, 
                   ativo, criado_em
            FROM planos_assinatura 
            WHERE ativo = true
            ORDER BY tipo_plano ASC
        `;
        
        const planosResult = await db.query(planosQuery);
        
        // Formatar dados dos planos
        const planosFormatados = planosResult.rows.map(plano => {
            return {
                id: plano.id,
                nome: plano.tipo_plano,
                tipo_plano: plano.tipo_plano,
                limite_rotas: plano.limite_rotas,
                limite_usuarios: plano.limite_usuarios,
                ativo: plano.ativo,
                criado_em: plano.criado_em
            };
        });
        
        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            dados: planosFormatados,
            total: planosFormatados.length
        };
    } catch (error) {
        logger.error('Erro ao buscar planos:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para listar crianças (responsáveis)
router.get('/api/criancas', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        // Verificar se é responsável
        const usuarioQuery = `
            SELECT tipo_cadastro FROM usuarios WHERE id = $1
        `;
        const usuarioResult = await db.query(usuarioQuery, [userId]);
        
        if (usuarioResult.rows.length === 0 || usuarioResult.rows[0].tipo_cadastro !== 'responsavel') {
            ctx.status = 403;
            ctx.body = {
                sucesso: false,
                message: 'Acesso negado. Apenas responsáveis podem acessar esta rota.'
            };
            return;
        }
        
        // Buscar crianças do responsável
        const criancasQuery = `
            SELECT c.id, c.nome_completo, c.data_nascimento, c.cpf, c.endereco_residencial,
                   c.escola, c.endereco_escola, c.observacoes_medicas, c.criado_em,
                   r.nome_rota as rota_nome, r.horario_ida, r.horario_volta,
                   u.nome_completo as motorista_nome, u.celular as motorista_telefone
            FROM criancas c
            LEFT JOIN rotas_escolares r ON c.rota_id = r.id
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            WHERE c.responsavel_id = $1
            ORDER BY c.nome_completo ASC
        `;
        
        const criancasResult = await db.query(criancasQuery, [userId]);
        
        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            dados: criancasResult.rows,
            total: criancasResult.rows.length
        };
    } catch (error) {
        logger.error('Erro ao buscar crianças:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para cadastrar crianças (responsáveis)
router.post('/api/criancas', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        const { nome, data_nascimento, cpf, endereco, escola, serie, turno, observacoes } = ctx.request.body;
        
        // Verificar se é responsável
        const usuarioQuery = `
            SELECT tipo_cadastro FROM usuarios WHERE id = $1
        `;
        const usuarioResult = await db.query(usuarioQuery, [userId]);
        
        if (usuarioResult.rows.length === 0 || usuarioResult.rows[0].tipo_cadastro !== 'responsavel') {
            ctx.status = 403;
            ctx.body = {
                sucesso: false,
                message: 'Acesso negado. Apenas responsáveis podem cadastrar crianças.'
            };
            return;
        }
        
        // Validar campos obrigatórios
        if (!nome || !data_nascimento || !cpf || !endereco || !escola) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                message: 'Campos obrigatórios: nome, data_nascimento, cpf, endereco, escola'
            };
            return;
        }
        
        // Verificar se CPF já existe
        const cpfExistenteQuery = `
            SELECT id FROM criancas WHERE cpf = $1
        `;
        const cpfExistenteResult = await db.query(cpfExistenteQuery, [cpf]);
        
        if (cpfExistenteResult.rows.length > 0) {
            ctx.status = 409;
            ctx.body = {
                sucesso: false,
                message: 'CPF já cadastrado no sistema'
            };
            return;
        }
        
        // Inserir criança
        const inserirCriancaQuery = `
            INSERT INTO criancas (nome_completo, data_nascimento, cpf, endereco_residencial, escola, 
                                endereco_escola, responsavel_id, ativo, criado_em)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
            RETURNING id, nome_completo, data_nascimento, cpf, endereco_residencial, escola, endereco_escola
        `;
        
        const criancaResult = await db.query(inserirCriancaQuery, [
            nome, data_nascimento, cpf, endereco, escola, escola, userId
        ]);
        
        ctx.status = 201;
        ctx.body = {
            sucesso: true,
            message: 'Criança cadastrada com sucesso',
            dados: criancaResult.rows[0]
        };
    } catch (error) {
        logger.error('Erro ao cadastrar criança:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para buscar preferências de notificação
router.get('/api/notificacoes/preferencias', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        
        // Buscar preferências existentes
        const preferenciaQuery = `
            SELECT * FROM preferencias_notificacao WHERE usuario_id = $1
        `;
        const preferenciaResult = await db.query(preferenciaQuery, [userId]);
        
        if (preferenciaResult.rows.length === 0) {
            // Criar preferências padrão se não existirem
            const criarPreferenciaQuery = `
                INSERT INTO preferencias_notificacao 
                (usuario_id, email_ativo, sms_ativo, push_ativo, 
                 notif_chegada, notif_saida, notif_atraso, notif_emergencia, 
                 criado_em, atualizado_em)
                VALUES ($1, true, true, true, true, true, true, true, NOW(), NOW())
                RETURNING *
            `;
            const novaPreferenciaResult = await db.query(criarPreferenciaQuery, [userId]);
            
            ctx.status = 200;
            ctx.body = {
                sucesso: true,
                dados: novaPreferenciaResult.rows[0]
            };
        } else {
            ctx.status = 200;
            ctx.body = {
                sucesso: true,
                dados: preferenciaResult.rows[0]
            };
        }
    } catch (error) {
        logger.error('Erro ao buscar preferências de notificação:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para buscar notificações
router.get('/api/notificacoes', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        const { limite = 20, offset = 0, lida } = ctx.query;
        
        let whereClause = 'WHERE usuario_id = $1';
        let params = [userId];
        
        // Filtrar por status de leitura se especificado
        if (lida !== undefined) {
            whereClause += ' AND lida = $2';
            params.push(lida === 'true');
        }
        
        // Buscar notificações
        const notificacoesQuery = `
            SELECT id, titulo, mensagem, tipo, lida, criado_em, 
                   dados_extras, prioridade
            FROM notificacoes 
            ${whereClause}
            ORDER BY criado_em DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        params.push(parseInt(limite), parseInt(offset));
        
        const notificacoesResult = await db.query(notificacoesQuery, params);
        
        // Contar total de notificações
        const countQuery = `
            SELECT COUNT(*) as total FROM notificacoes ${whereClause}
        `;
        const countResult = await db.query(countQuery, params.slice(0, -2));
        
        // Contar notificações não lidas
        const naoLidasQuery = `
            SELECT COUNT(*) as nao_lidas FROM notificacoes 
            WHERE usuario_id = $1 AND lida = false
        `;
        const naoLidasResult = await db.query(naoLidasQuery, [userId]);
        
        ctx.status = 200;
        ctx.body = {
            sucesso: true,
            dados: {
                notificacoes: notificacoesResult.rows,
                total: parseInt(countResult.rows[0].total),
                nao_lidas: parseInt(naoLidasResult.rows[0].nao_lidas),
                limite: parseInt(limite),
                offset: parseInt(offset)
            }
        };
    } catch (error) {
        logger.error('Erro ao buscar notificações:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// Rota para iniciar conferência
router.post('/api/conferencia/iniciar', autenticar, async ctx => {
    try {
        const userId = ctx.state.usuario.userId;
        const { rota_id, tipo_conferencia = 'ida' } = ctx.request.body;
        
        // Verificar se é motorista
        const usuarioQuery = `
            SELECT tipo_cadastro FROM usuarios WHERE id = $1
        `;
        const usuarioResult = await db.query(usuarioQuery, [userId]);
        
        if (usuarioResult.rows.length === 0 || usuarioResult.rows[0].tipo_cadastro !== 'motorista') {
            ctx.status = 403;
            ctx.body = {
                sucesso: false,
                message: 'Acesso negado. Apenas motoristas podem iniciar conferência.'
            };
            return;
        }
        
        // Validar campos obrigatórios
        if (!rota_id) {
            ctx.status = 400;
            ctx.body = {
                sucesso: false,
                message: 'Campo obrigatório: rota_id'
            };
            return;
        }
        
        // Verificar se a rota pertence ao motorista
        const rotaQuery = `
            SELECT id, nome FROM rotas_escolares 
            WHERE id = $1 AND motorista_id = $2 AND ativo = true
        `;
        const rotaResult = await db.query(rotaQuery, [rota_id, userId]);
        
        if (rotaResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                sucesso: false,
                message: 'Rota não encontrada ou não pertence ao motorista'
            };
            return;
        }
        
        // Verificar se já existe uma conferência ativa para esta rota hoje
        const conferenciaAtivaQuery = `
            SELECT id FROM conferencias 
            WHERE rota_id = $1 AND DATE(criado_em) = CURRENT_DATE 
            AND status = 'em_andamento' AND tipo = $2
        `;
        const conferenciaAtivaResult = await db.query(conferenciaAtivaQuery, [rota_id, tipo_conferencia]);
        
        if (conferenciaAtivaResult.rows.length > 0) {
            ctx.status = 409;
            ctx.body = {
                sucesso: false,
                message: 'Já existe uma conferência ativa para esta rota hoje'
            };
            return;
        }
        
        // Criar nova conferência
        const criarConferenciaQuery = `
            INSERT INTO conferencias (rota_id, motorista_id, tipo, status, criado_em)
            VALUES ($1, $2, $3, 'em_andamento', NOW())
            RETURNING id, rota_id, tipo, status, criado_em
        `;
        
        const conferenciaResult = await db.query(criarConferenciaQuery, [rota_id, userId, tipo_conferencia]);
        
        // Buscar crianças da rota para inicializar a conferência
        const criancasQuery = `
            SELECT c.id, c.nome_completo, c.endereco, rc.ordem_parada
            FROM criancas c
            JOIN rota_criancas rc ON c.id = rc.crianca_id
            WHERE rc.rota_id = $1 AND rc.ativo = true
            ORDER BY rc.ordem_parada
        `;
        const criancasResult = await db.query(criancasQuery, [rota_id]);
        
        ctx.status = 201;
        ctx.body = {
            sucesso: true,
            message: 'Conferência iniciada com sucesso',
            dados: {
                conferencia: conferenciaResult.rows[0],
                rota: rotaResult.rows[0],
                criancas: criancasResult.rows
            }
        };
    } catch (error) {
        logger.error('Erro ao iniciar conferência:', error);
        ctx.status = 500;
        ctx.body = {
            sucesso: false,
            message: 'Erro interno do servidor'
        };
    }
});

// --- ROTAS DA API ---
// Importar rotas
const motoristaEscolarRoutes = require('./routes/motorista-escolar');
const responsavelRoutes = require('./routes/responsavel');
const rastreamentoRoutes = require('./routes/rastreamento');
const trackingApiRoutes = require('./routes/tracking-api');
// const cadastroCriancasRoutes = require('./routes/cadastro-criancas');
const transportesRoutes = require('./routes/transportes');
const notificationPreferencesRoutes = require('./routes/notification-preferences');

// Novas rotas para sistema de rotas escolares
const rotasEscolaresRoutes = require('./routes/rotas-escolares');
const planosAssinaturaRoutes = require('./routes/planos-assinatura');
const buscarRotasRoutes = require('./routes/buscar-rotas');
const conferenciaCriancasRoutes = require('./routes/conferencia-criancas');
const rastreamentoGpsRoutes = require('./routes/rastreamento-gps');
const googleMapsApiRoutes = require('./routes/google-maps-api');
const gpsTrackingApiRoutes = require('./routes/gps-tracking-api');
const mapsConfigRoutes = require('./routes/maps-config');
const motoristaExcursaoRoutes = require('./routes/motorista-excursao');
const posicaoCriancasRoutes = require('./routes/posicao-criancas');
const atualizacaoPosicaoRoutes = require('./routes/atualizacao-posicao');

// Importar sistema de notificações em tempo real
const RealtimeServer = require('./realtime/realtime-server');
const TrackingIntegration = require('./realtime/tracking-integration');
const NotificationHub = require('./realtime/notification-hub');

// Registrar rotas
app.use(motoristaEscolarRoutes.routes());
app.use(motoristaEscolarRoutes.allowedMethods());
app.use(responsavelRoutes.routes());
app.use(responsavelRoutes.allowedMethods());
app.use(rastreamentoRoutes.routes());
app.use(rastreamentoRoutes.allowedMethods());
app.use(trackingApiRoutes.routes());
app.use(trackingApiRoutes.allowedMethods());
// app.use(cadastroCriancasRoutes.routes());
// app.use(cadastroCriancasRoutes.allowedMethods());
app.use(transportesRoutes.routes());
app.use(transportesRoutes.allowedMethods());
app.use(notificationPreferencesRoutes.routes());
app.use(notificationPreferencesRoutes.allowedMethods());

// Registrar novas rotas do sistema de rotas escolares
app.use(rotasEscolaresRoutes.routes());
app.use(rotasEscolaresRoutes.allowedMethods());
app.use(planosAssinaturaRoutes.routes());
app.use(planosAssinaturaRoutes.allowedMethods());
app.use(buscarRotasRoutes.routes());
app.use(buscarRotasRoutes.allowedMethods());
app.use(conferenciaCriancasRoutes.routes());
app.use(conferenciaCriancasRoutes.allowedMethods());
app.use(rastreamentoGpsRoutes.routes());
app.use(rastreamentoGpsRoutes.allowedMethods());
app.use(googleMapsApiRoutes.routes());
app.use(googleMapsApiRoutes.allowedMethods());
app.use(gpsTrackingApiRoutes.routes());
app.use(gpsTrackingApiRoutes.allowedMethods());

// Rotas de configuração do Google Maps
app.use(mapsConfigRoutes.routes());
app.use(mapsConfigRoutes.allowedMethods());
app.use(motoristaExcursaoRoutes.routes());
app.use(motoristaExcursaoRoutes.allowedMethods());
app.use(posicaoCriancasRoutes.routes());
app.use(posicaoCriancasRoutes.allowedMethods());
app.use(atualizacaoPosicaoRoutes.routes());
app.use(atualizacaoPosicaoRoutes.allowedMethods());
// app.use('/api/responsavel', responsavelRoutes.routes(), responsavelRoutes.allowedMethods());
// app.use('/api/rastreamento', rastreamentoRoutes.routes(), rastreamentoRoutes.allowedMethods());

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.use(router.routes()).use(router.allowedMethods());

const iniciarServidor = async () => {
    try {
        // Inicializar banco de dados
        await db.criarTabelas();
        
        // Inicializar servidor HTTP
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Servidor rodando na porta ${PORT}`);
            logger.info(`📱 Acesse a aplicação em http://localhost:${PORT}`);
        });

        // Inicializar sistema de notificações em tempo real
        logger.info('🔄 Inicializando sistema de notificações em tempo real...');
        
        // Criar instâncias dos componentes
        const notificationHub = new NotificationHub();
        const trackingIntegration = new TrackingIntegration(notificationHub);
        
        // Configurar servidor de WebSocket
        const realtimeServer = new RealtimeServer({
            server,
            jwtSecret: JWT_SECRET,
            notificationHub,
            enableAuditLogs: true,
            maxConnectionsPerIP: 10,
            maxMessagesPerMinute: 60,
            allowedOrigins: [
                'http://localhost:3000',
                'http://localhost:5000',
                `http://localhost:${PORT}`
            ]
        });

        // Inicializar componentes
        await realtimeServer.initialize();
        await trackingIntegration.initialize();
        
        // Configurar integração com rotas de rastreamento
        rastreamentoRoutes.setTrackingIntegration(trackingIntegration);
        
        // Configurar integração com rotas de conferência
        conferenciaCriancasRoutes.setTrackingIntegration(trackingIntegration);
        
        logger.info('✅ Sistema de notificações em tempo real inicializado');
            logger.info('🔌 WebSocket disponível em ws://localhost:' + PORT);
        
        // Configurar shutdown gracioso
        const gracefulShutdown = async (signal) => {
            logger.info(`\n📡 Recebido sinal ${signal}, iniciando shutdown gracioso...`);
            
            try {
                // Parar servidor de WebSocket
                await realtimeServer.shutdown();
                
                // Fechar servidor HTTP
                server.close(() => {
                    logger.info('✅ Servidor HTTP fechado');
                    process.exit(0);
                });
                
                // Timeout de segurança
                setTimeout(() => {
                    logger.info('⚠️  Forçando encerramento após timeout');
                    process.exit(1);
                }, 10000);
                
            } catch (error) {
                logger.error('❌ Erro durante shutdown:', error);
                process.exit(1);
            }
        };

        // Registrar handlers de shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
    } catch (error) {
        logger.error("❌ Erro ao iniciar o servidor:", error);
        process.exit(1);
    }
};

iniciarServidor();