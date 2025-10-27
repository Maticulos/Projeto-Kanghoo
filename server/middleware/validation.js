/**
 * Middleware de Validação Centralizado
 * 
 * Este módulo centraliza todas as validações da aplicação,
 * fornecendo funções reutilizáveis e consistentes.
 * 
 * @author Sistema de Transporte Escolar
 * @version 1.0.0
 */

const { validationError } = require('../utils/api-response');

/**
 * Validações básicas de tipos e formatos
 */
const validators = {
    /**
     * Valida se é um email válido
     * @param {string} email - Email a ser validado
     * @returns {boolean} True se válido
     */
    isEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Valida se é um CPF válido
     * @param {string} cpf - CPF a ser validado
     * @returns {boolean} True se válido
     */
    isCPF: (cpf) => {
        if (!cpf) return false;
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        return remainder === parseInt(cpf.charAt(10));
    },

    /**
     * Valida se é um telefone válido
     * @param {string} phone - Telefone a ser validado
     * @returns {boolean} True se válido
     */
    isPhone: (phone) => {
        if (!phone) return false;
        const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
        return phoneRegex.test(phone);
    },

    /**
     * Valida se é uma senha forte
     * @param {string} password - Senha a ser validada
     * @returns {boolean} True se válida
     */
    isStrongPassword: (password) => {
        if (!password || password.length < 8) return false;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return hasUpper && hasLower && hasNumber && hasSpecial;
    },

    /**
     * Valida se é uma data válida
     * @param {string} date - Data a ser validada (YYYY-MM-DD)
     * @returns {boolean} True se válida
     */
    isValidDate: (date) => {
        if (!date) return false;
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj);
    },

    /**
     * Valida se é um número positivo
     * @param {any} value - Valor a ser validado
     * @returns {boolean} True se válido
     */
    isPositiveNumber: (value) => {
        return !isNaN(value) && parseFloat(value) > 0;
    }
};

/**
 * Esquemas de validação para diferentes entidades
 */
const schemas = {
    /**
     * Validação para cadastro de usuário
     */
    userRegistration: {
        nome: { required: true, minLength: 2, maxLength: 100 },
        email: { required: true, validator: validators.isEmail },
        cpf: { required: true, validator: validators.isCPF },
        telefone: { required: true, validator: validators.isPhone },
        senha: { required: true, validator: validators.isStrongPassword },
        tipo_usuario: { required: true, enum: ['responsavel', 'motorista_escolar', 'motorista_excursao'] }
    },

    /**
     * Validação para login
     */
    login: {
        email: { required: true, validator: validators.isEmail },
        senha: { required: true, minLength: 1 }
    },

    /**
     * Validação para cadastro de criança
     */
    childRegistration: {
        nome: { required: true, minLength: 2, maxLength: 100 },
        data_nascimento: { required: true, validator: validators.isValidDate },
        escola: { required: true, minLength: 2, maxLength: 200 },
        endereco: { required: true, minLength: 5, maxLength: 300 }
    },

    /**
     * Validação para cadastro de veículo
     */
    vehicleRegistration: {
        modelo: { required: true, minLength: 2, maxLength: 100 },
        placa: { required: true, minLength: 7, maxLength: 8 },
        capacidade: { required: true, validator: validators.isPositiveNumber },
        ano: { required: true, validator: (year) => year >= 1990 && year <= new Date().getFullYear() + 1 }
    },

    /**
     * Validação para paginação
     */
    pagination: {
        page: { required: false, validator: validators.isPositiveNumber, default: 1 },
        limit: { required: false, validator: (val) => validators.isPositiveNumber(val) && val <= 100, default: 10 }
    }
};

/**
 * Valida um campo individual
 * @param {any} value - Valor a ser validado
 * @param {Object} rules - Regras de validação
 * @param {string} fieldName - Nome do campo
 * @returns {Array} Array de erros (vazio se válido)
 */
const validateField = (value, rules, fieldName) => {
    const errors = [];

    // Verifica se é obrigatório
    if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldName} é obrigatório`);
        return errors;
    }

    // Se não é obrigatório e está vazio, pula outras validações
    if (!rules.required && (value === undefined || value === null || value === '')) {
        return errors;
    }

    // Validação de comprimento mínimo
    if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${fieldName} deve ter pelo menos ${rules.minLength} caracteres`);
    }

    // Validação de comprimento máximo
    if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${fieldName} deve ter no máximo ${rules.maxLength} caracteres`);
    }

    // Validação de enum
    if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${fieldName} deve ser um dos valores: ${rules.enum.join(', ')}`);
    }

    // Validação customizada
    if (rules.validator && !rules.validator(value)) {
        errors.push(`${fieldName} tem formato inválido`);
    }

    return errors;
};

/**
 * Valida um objeto completo baseado em um schema
 * @param {Object} data - Dados a serem validados
 * @param {Object} schema - Schema de validação
 * @returns {Object} Resultado da validação
 */
const validateSchema = (data, schema) => {
    const errors = {};
    const validatedData = {};

    // Valida cada campo do schema
    for (const [fieldName, rules] of Object.entries(schema)) {
        const fieldErrors = validateField(data[fieldName], rules, fieldName);
        
        if (fieldErrors.length > 0) {
            errors[fieldName] = fieldErrors;
        } else {
            // Aplica valor padrão se necessário
            validatedData[fieldName] = data[fieldName] !== undefined 
                ? data[fieldName] 
                : rules.default;
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        validatedData
    };
};

/**
 * Middleware factory para validação
 * @param {string|Object} schemaOrName - Nome do schema ou objeto schema inline
 * @returns {Function} Middleware de validação
 */
const validate = (schemaOrName) => {
    return async (ctx, next) => {
        let schema;
        
        // Se for string, busca o schema pelos nomes registrados
        if (typeof schemaOrName === 'string') {
            schema = schemas[schemaOrName];
            if (!schema) {
                throw new Error(`Schema '${schemaOrName}' não encontrado`);
            }
        } else if (typeof schemaOrName === 'object' && schemaOrName !== null) {
            // Se for objeto, usa diretamente como schema
            schema = schemaOrName;
        } else {
            throw new Error('Schema deve ser uma string (nome) ou objeto (schema inline)');
        }

        const validation = validateSchema(ctx.request.body, schema);

        if (!validation.isValid) {
            ctx.status = 422;
            ctx.body = validationError(validation.errors, 'Dados de entrada inválidos');
            return;
        }

        // Adiciona dados validados ao contexto
        ctx.validatedData = validation.validatedData;
        await next();
    };
};

/**
 * Middleware para validação de parâmetros de query
 * @param {string|Object} schemaOrName - Nome do schema ou objeto schema inline
 * @returns {Function} Middleware de validação
 */
const validateQuery = (schemaOrName) => {
    return async (ctx, next) => {
        let schema;
        
        // Se for string, busca o schema pelos nomes registrados
        if (typeof schemaOrName === 'string') {
            schema = schemas[schemaOrName];
            if (!schema) {
                throw new Error(`Schema '${schemaOrName}' não encontrado`);
            }
        } else if (typeof schemaOrName === 'object' && schemaOrName !== null) {
            // Se for objeto, usa diretamente como schema
            schema = schemaOrName;
        } else {
            throw new Error('Schema deve ser uma string (nome) ou objeto (schema inline)');
        }

        const validation = validateSchema(ctx.query, schema);

        if (!validation.isValid) {
            ctx.status = 422;
            ctx.body = validationError(validation.errors, 'Parâmetros de consulta inválidos');
            return;
        }

        // Adiciona dados validados ao contexto
        ctx.validatedQuery = validation.validatedData;
        await next();
    };
};

/**
 * Adiciona um novo schema de validação
 * @param {string} name - Nome do schema
 * @param {Object} schema - Definição do schema
 */
const addSchema = (name, schema) => {
    schemas[name] = schema;
};

/**
 * Adiciona um novo validador
 * @param {string} name - Nome do validador
 * @param {Function} validator - Função validadora
 */
const addValidator = (name, validator) => {
    validators[name] = validator;
};

module.exports = {
    validators,
    schemas,
    validate,
    validateQuery,
    validateField,
    validateSchema,
    addSchema,
    addValidator
};