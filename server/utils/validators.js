/**
 * UTILITÁRIOS DE VALIDAÇÃO CENTRALIZADOS
 * 
 * Este módulo centraliza todas as funções de validação utilizadas no sistema
 * para evitar duplicação de código e garantir consistência nas validações.
 * 
 * Categorias de validação:
 * - Documentos brasileiros (CPF, CNPJ)
 * - Dados pessoais (email, telefone, CEP)
 * - Senhas e segurança
 * - Dados de entrada (strings, números, datas)
 * - Arquivos e uploads
 * - Dados específicos do domínio (veículos, rotas, etc.)
 * 
 * @author Sistema de Transporte Escolar
 * @version 2.0.0
 */

const { REGEX_PATTERNS } = require('../config/constants');

/**
 * Valida CPF brasileiro
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} True se CPF é válido, false caso contrário
 */
function validarCPF(cpf) {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]+/g, '');
    
    // Verifica se tem 11 dígitos e não é sequência repetida
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

/**
 * Valida CNPJ brasileiro
 * @param {string} cnpj - CNPJ a ser validado
 * @returns {boolean} True se CNPJ é válido, false caso contrário
 */
function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }
    
    // Validação do primeiro dígito verificador
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    
    // Validação do segundo dígito verificador
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    
    return true;
}

/**
 * Valida email
 * @param {string} email - Email a ser validado
 * @returns {boolean} True se email é válido, false caso contrário
 */
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida telefone brasileiro
 * @param {string} telefone - Telefone a ser validado
 * @returns {boolean} True se telefone é válido, false caso contrário
 */
function validarTelefone(telefone) {
    const telefoneNumeros = telefone.replace(/[^\d]+/g, '');
    // Aceita formatos: (11) 99999-9999, 11999999999, etc.
    return telefoneNumeros.length >= 10 && telefoneNumeros.length <= 11;
}

/**
 * Valida CEP brasileiro
 * @param {string} cep - CEP a ser validado
 * @returns {boolean} True se CEP é válido, false caso contrário
 */
function validarCEP(cep) {
    const cepNumeros = cep.replace(/[^\d]+/g, '');
    return cepNumeros.length === 8;
}

/**
 * Valida se string não está vazia
 * @param {string} valor - Valor a ser validado
 * @returns {boolean} True se não está vazio, false caso contrário
 */
function validarNaoVazio(valor) {
    return valor && valor.trim().length > 0;
}

/**
 * Valida idade mínima
 * @param {Date|string} dataNascimento - Data de nascimento
 * @param {number} idadeMinima - Idade mínima em anos
 * @returns {boolean} True se atende idade mínima, false caso contrário
 */
function validarIdadeMinima(dataNascimento, idadeMinima = 0) {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();
    const mesNascimento = nascimento.getMonth();
    const diaNascimento = nascimento.getDate();
    
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
        return (idade - 1) >= idadeMinima;
    }
    
    return idade >= idadeMinima;
}

// ===== VALIDAÇÕES DE SENHA E SEGURANÇA =====

/**
 * Valida força da senha
 * @param {string} senha - Senha a ser validada
 * @returns {object} Resultado da validação com score e detalhes
 */
function validarSenha(senha) {
    const resultado = {
        valida: false,
        score: 0,
        requisitos: {
            tamanho: false,
            maiuscula: false,
            minuscula: false,
            numero: false,
            especial: false
        },
        mensagens: []
    };

    if (!senha || typeof senha !== 'string') {
        resultado.mensagens.push('Senha é obrigatória');
        return resultado;
    }

    // Tamanho mínimo
    if (senha.length >= 8) {
        resultado.requisitos.tamanho = true;
        resultado.score += 1;
    } else {
        resultado.mensagens.push('Senha deve ter pelo menos 8 caracteres');
    }

    // Letra maiúscula
    if (/[A-Z]/.test(senha)) {
        resultado.requisitos.maiuscula = true;
        resultado.score += 1;
    } else {
        resultado.mensagens.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    // Letra minúscula
    if (/[a-z]/.test(senha)) {
        resultado.requisitos.minuscula = true;
        resultado.score += 1;
    } else {
        resultado.mensagens.push('Senha deve conter pelo menos uma letra minúscula');
    }

    // Número
    if (/\d/.test(senha)) {
        resultado.requisitos.numero = true;
        resultado.score += 1;
    } else {
        resultado.mensagens.push('Senha deve conter pelo menos um número');
    }

    // Caractere especial
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
        resultado.requisitos.especial = true;
        resultado.score += 1;
    } else {
        resultado.mensagens.push('Senha deve conter pelo menos um caractere especial');
    }

    resultado.valida = resultado.score >= 4; // Pelo menos 4 dos 5 requisitos
    return resultado;
}

/**
 * Valida entrada contra injeção de código
 * @param {string} input - Entrada a ser validada
 * @returns {boolean} True se entrada é segura, false caso contrário
 */
function validarEntradaSegura(input) {
    if (!input || typeof input !== 'string') return false;
    
    // Padrões perigosos
    const padroesPerigrosos = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /vbscript:/gi
    ];
    
    return !padroesPerigrosos.some(padrao => padrao.test(input));
}

// ===== VALIDAÇÕES DE ARQUIVOS =====

/**
 * Valida tipo de arquivo
 * @param {string} filename - Nome do arquivo
 * @param {Array} tiposPermitidos - Array de extensões permitidas
 * @returns {boolean} True se tipo é permitido, false caso contrário
 */
function validarTipoArquivo(filename, tiposPermitidos = []) {
    if (!filename || !tiposPermitidos.length) return false;
    
    const extensao = filename.toLowerCase().split('.').pop();
    return tiposPermitidos.includes(extensao);
}

/**
 * Valida tamanho de arquivo
 * @param {number} tamanho - Tamanho em bytes
 * @param {number} tamanhoMaximo - Tamanho máximo em bytes
 * @returns {boolean} True se tamanho é válido, false caso contrário
 */
function validarTamanhoArquivo(tamanho, tamanhoMaximo) {
    return typeof tamanho === 'number' && tamanho > 0 && tamanho <= tamanhoMaximo;
}

// ===== VALIDAÇÕES DE DADOS ESPECÍFICOS =====

/**
 * Valida placa de veículo brasileira
 * @param {string} placa - Placa a ser validada
 * @returns {boolean} True se placa é válida, false caso contrário
 */
function validarPlaca(placa) {
    if (!placa) return false;
    
    const placaLimpa = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Formato antigo: ABC1234
    const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/;
    // Formato Mercosul: ABC1D23
    const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    
    return formatoAntigo.test(placaLimpa) || formatoMercosul.test(placaLimpa);
}

/**
 * Valida coordenadas geográficas
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} True se coordenadas são válidas, false caso contrário
 */
function validarCoordenadas(latitude, longitude) {
    return (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        latitude >= -90 && latitude <= 90 &&
        longitude >= -180 && longitude <= 180
    );
}

/**
 * Valida canais de notificação
 * @param {Array} canais - Array de canais
 * @returns {boolean} True se canais são válidos, false caso contrário
 */
function validarCanaisNotificacao(canais) {
    if (!Array.isArray(canais)) return false;
    
    const canaisValidos = ['email', 'sms', 'push', 'whatsapp'];
    return canais.every(canal => canaisValidos.includes(canal));
}

/**
 * Valida horário no formato HH:MM
 * @param {string} horario - Horário a ser validado
 * @returns {boolean} True se horário é válido, false caso contrário
 */
function validarHorario(horario) {
    if (!horario || typeof horario !== 'string') return false;
    
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(horario);
}

/**
 * Valida data no formato YYYY-MM-DD
 * @param {string} data - Data a ser validada
 * @returns {boolean} True se data é válida, false caso contrário
 */
function validarData(data) {
    if (!data || typeof data !== 'string') return false;
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(data)) return false;
    
    const dataObj = new Date(data);
    return dataObj instanceof Date && !isNaN(dataObj);
}

// ===== VALIDAÇÕES COMPOSTAS =====

/**
 * Valida dados de cadastro de usuário
 * @param {object} dados - Dados do usuário
 * @returns {object} Resultado da validação
 */
function validarDadosUsuario(dados) {
    const erros = [];
    
    if (!validarNaoVazio(dados.nome)) {
        erros.push('Nome é obrigatório');
    }
    
    if (!validarEmail(dados.email)) {
        erros.push('Email inválido');
    }
    
    if (dados.cpf && !validarCPF(dados.cpf)) {
        erros.push('CPF inválido');
    }
    
    if (dados.telefone && !validarTelefone(dados.telefone)) {
        erros.push('Telefone inválido');
    }
    
    if (dados.senha) {
        const resultadoSenha = validarSenha(dados.senha);
        if (!resultadoSenha.valida) {
            erros.push(...resultadoSenha.mensagens);
        }
    }
    
    return {
        valido: erros.length === 0,
        erros
    };
}

/**
 * Valida dados de veículo
 * @param {object} dados - Dados do veículo
 * @returns {object} Resultado da validação
 */
function validarDadosVeiculo(dados) {
    const erros = [];
    
    if (!validarNaoVazio(dados.modelo)) {
        erros.push('Modelo é obrigatório');
    }
    
    if (!validarPlaca(dados.placa)) {
        erros.push('Placa inválida');
    }
    
    if (!dados.capacidade || dados.capacidade <= 0) {
        erros.push('Capacidade deve ser maior que zero');
    }
    
    if (dados.ano && (dados.ano < 1900 || dados.ano > new Date().getFullYear() + 1)) {
        erros.push('Ano inválido');
    }
    
    return {
        valido: erros.length === 0,
        erros
    };
}

module.exports = {
    // Documentos brasileiros
    validarCPF,
    validarCNPJ,
    
    // Dados pessoais
    validarEmail,
    validarTelefone,
    validarCEP,
    validarNaoVazio,
    validarIdadeMinima,
    
    // Senha e segurança
    validarSenha,
    validarEntradaSegura,
    
    // Arquivos
    validarTipoArquivo,
    validarTamanhoArquivo,
    
    // Dados específicos
    validarPlaca,
    validarCoordenadas,
    validarCanaisNotificacao,
    validarHorario,
    validarData,
    
    // Validações compostas
    validarDadosUsuario,
    validarDadosVeiculo
};