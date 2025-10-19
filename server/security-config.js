// Configurações de Segurança Centralizadas
const securityConfig = {
    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        loginWindowMs: 1 * 60 * 1000, // 1 minuto para login (desenvolvimento)
        loginMaxRequests: 50 // 50 tentativas de login por minuto (desenvolvimento)
    },

    // Headers de Segurança
    securityHeaders: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: http://localhost:*",
            "connect-src 'self'",
            "frame-ancestors 'none'"
        ].join('; ')
    },

    // Configurações de JWT
    jwt: {
        secret: process.env.JWT_SECRET || (() => {
            console.error('⚠️  AVISO DE SEGURANÇA: JWT_SECRET não definido no .env');
            console.error('⚠️  Usando chave temporária - ALTERE IMEDIATAMENTE em produção!');
            return 'temp_key_' + Math.random().toString(36).substring(2, 15);
        })(),
        expiresIn: '2h',
        algorithm: 'HS256'
    },

    // Configurações de Bcrypt
    bcrypt: {
        saltRounds: 12
    },

    // Validações
    validation: {
        email: {
            maxLength: 254,
            regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
            minLength: 8,
            maxLength: 128,
            regex: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
        },
        name: {
            minLength: 2,
            maxLength: 100
        },
        phone: {
            regex: /^\(\d{2}\)\s\d{4,5}-\d{4}$/
        },
        cpf: {
            length: 11
        },
        cnpj: {
            length: 14
        },
        age: {
            min: 16,
            max: 120
        },
        lotacao: {
            min: 1,
            max: 100
        }
    },

    // Configurações de Logging
    logging: {
        logSensitiveData: false,
        logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
        maxLogLength: 1000
    },

    // Configurações de Produção
    production: {
        httpsOnly: true,
        hstsMaxAge: 31536000, // 1 ano
        hstsIncludeSubDomains: true,
        hstsPreload: true
    }
};

// Função para obter headers de segurança baseados no ambiente
const getSecurityHeaders = () => {
    const headers = { ...securityConfig.securityHeaders };
    
    // Adicionar HSTS apenas em produção
    if (process.env.NODE_ENV === 'production') {
        headers['Strict-Transport-Security'] = 
            `max-age=${securityConfig.production.hstsMaxAge}; includeSubDomains; preload`;
    }
    
    return headers;
};

// Função para sanitizar logs (remover dados sensíveis)
const sanitizeForLog = (data) => {
    if (typeof data === 'string') {
        return data.length > 3 ? data.substring(0, 3) + '***' : '***';
    }
    
    if (typeof data === 'object' && data !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (['senha', 'password', 'token', 'jwt'].includes(key.toLowerCase())) {
                sanitized[key] = '***';
            } else if (key.toLowerCase().includes('email')) {
                sanitized[key] = sanitizeForLog(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    
    return data;
};

// Função para validar entrada baseada no tipo
const validateInput = (value, type) => {
    const config = securityConfig.validation[type];
    if (!config) return { valid: false, error: 'Tipo de validação não encontrado' };
    
    switch (type) {
        case 'email':
            if (!config.regex.test(value) || value.length > config.maxLength) {
                return { valid: false, error: 'Email inválido' };
            }
            break;
            
        case 'password':
            if (!config.regex.test(value) || value.length < config.minLength || value.length > config.maxLength) {
                return { valid: false, error: 'Senha deve ter pelo menos 8 caracteres, incluindo letras e números' };
            }
            break;
            
        case 'name':
            if (value.length < config.minLength || value.length > config.maxLength) {
                return { valid: false, error: `Nome deve ter entre ${config.minLength} e ${config.maxLength} caracteres` };
            }
            break;
            
        case 'phone':
            if (!config.regex.test(value)) {
                return { valid: false, error: 'Formato de telefone inválido. Use: (XX) XXXXX-XXXX' };
            }
            break;
            
        case 'cpf':
            const cpfNumbers = value.replace(/[^\d]/g, '');
            if (cpfNumbers.length !== config.length) {
                return { valid: false, error: 'CPF inválido' };
            }
            break;
            
        case 'cnpj':
            const cnpjNumbers = value.replace(/[^\d]/g, '');
            if (cnpjNumbers.length !== config.length) {
                return { valid: false, error: 'CNPJ inválido' };
            }
            break;
    }
    
    return { valid: true };
};

// Função específica para validar dados de login
const validateLoginData = (data) => {
    const errors = [];
    const sanitizedData = {};
    
    // Validar email
    if (!data.email) {
        errors.push('Email é obrigatório');
    } else {
        const emailValidation = validateInput(data.email, 'email');
        if (!emailValidation.valid) {
            errors.push(emailValidation.error);
        } else {
            sanitizedData.email = data.email.trim().toLowerCase();
        }
    }
    
    // Validar senha
    if (!data.senha) {
        errors.push('Senha é obrigatória');
    } else {
        // Para login, não validamos a complexidade da senha, apenas se existe
        sanitizedData.senha = data.senha;
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        sanitizedData
    };
};

// Função específica para validar dados de cadastro
const validateCadastroData = (data) => {
    const errors = [];
    const sanitizedData = {};
    
    // Validar nome completo
    if (!data.nomeCompleto) {
        errors.push('Nome completo é obrigatório');
    } else {
        const nameValidation = validateInput(data.nomeCompleto, 'name');
        if (!nameValidation.valid) {
            errors.push(nameValidation.error);
        } else {
            sanitizedData.nomeCompleto = data.nomeCompleto.trim();
        }
    }
    
    // Validar email
    if (!data.email) {
        errors.push('Email é obrigatório');
    } else {
        const emailValidation = validateInput(data.email, 'email');
        if (!emailValidation.valid) {
            errors.push(emailValidation.error);
        } else {
            sanitizedData.email = data.email.trim().toLowerCase();
        }
    }
    
    // Validar senha
    if (!data.senha) {
        errors.push('Senha é obrigatória');
    } else {
        const passwordValidation = validateInput(data.senha, 'password');
        if (!passwordValidation.valid) {
            errors.push(passwordValidation.error);
        } else {
            sanitizedData.senha = data.senha;
        }
    }
    
    // Validar campos opcionais
    if (data.celular) {
        sanitizedData.celular = data.celular.trim();
    }
    
    if (data.dataNascimento) {
        sanitizedData.dataNascimento = data.dataNascimento;
    }
    
    if (data.tipoCadastro) {
        sanitizedData.tipoCadastro = data.tipoCadastro;
    }
    
    if (data.placa) {
        sanitizedData.placa = data.placa.trim().toUpperCase();
    }
    
    if (data.renavam) {
        sanitizedData.renavam = data.renavam.trim();
    }
    
    if (data.lotacaoMaxima) {
        sanitizedData.lotacaoMaxima = parseInt(data.lotacaoMaxima);
    }
    
    if (data.razaoSocial) {
        sanitizedData.razaoSocial = data.razaoSocial.trim();
    }
    
    if (data.cnpj) {
        sanitizedData.cnpj = data.cnpj.trim();
    }
    
    if (data.nomeFantasia) {
        sanitizedData.nomeFantasia = data.nomeFantasia.trim();
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        sanitizedData
    };
};

module.exports = {
    securityConfig,
    JWT_SECRET: securityConfig.jwt.secret,
    getSecurityHeaders,
    sanitizeForLog,
    validateInput,
    validateLoginData,
    validateCadastroData
};