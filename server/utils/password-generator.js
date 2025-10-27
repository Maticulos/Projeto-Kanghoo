/**
 * Gerador de Senhas
 * Centraliza lógica de geração de senhas seguras
 */

/**
 * Gera senha aleatória
 * @param {number} tamanho - Tamanho da senha (padrão: 8)
 * @param {object} opcoes - Opções de geração
 * @param {boolean} opcoes.incluirMaiusculas - Incluir letras maiúsculas (padrão: true)
 * @param {boolean} opcoes.incluirMinusculas - Incluir letras minúsculas (padrão: true)
 * @param {boolean} opcoes.incluirNumeros - Incluir números (padrão: true)
 * @param {boolean} opcoes.incluirSimbolos - Incluir símbolos especiais (padrão: false)
 * @returns {string} Senha gerada
 */
function gerarSenha(tamanho = 8, opcoes = {}) {
    const config = {
        incluirMaiusculas: opcoes.incluirMaiusculas !== false,
        incluirMinusculas: opcoes.incluirMinusculas !== false,
        incluirNumeros: opcoes.incluirNumeros !== false,
        incluirSimbolos: opcoes.incluirSimbolos || false
    };
    
    let caracteres = '';
    
    if (config.incluirMaiusculas) {
        caracteres += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    
    if (config.incluirMinusculas) {
        caracteres += 'abcdefghijklmnopqrstuvwxyz';
    }
    
    if (config.incluirNumeros) {
        caracteres += '0123456789';
    }
    
    if (config.incluirSimbolos) {
        caracteres += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }
    
    if (caracteres === '') {
        throw new Error('Pelo menos um tipo de caractere deve ser incluído');
    }
    
    let senha = '';
    for (let i = 0; i < tamanho; i++) {
        senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
    return senha;
}

/**
 * Gera senha simples (apenas letras e números)
 * Compatível com a função original do cadastro-criancas.js
 * @param {number} tamanho - Tamanho da senha (padrão: 8)
 * @returns {string} Senha gerada
 */
function gerarSenhaSimples(tamanho = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let senha = '';
    for (let i = 0; i < tamanho; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
}

/**
 * Gera senha forte com garantia de pelo menos um caractere de cada tipo
 * @param {number} tamanho - Tamanho da senha (mínimo: 4)
 * @returns {string} Senha forte gerada
 */
function gerarSenhaForte(tamanho = 12) {
    if (tamanho < 4) {
        throw new Error('Senha forte deve ter pelo menos 4 caracteres');
    }
    
    const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const simbolos = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Garantir pelo menos um caractere de cada tipo
    let senha = '';
    senha += maiusculas.charAt(Math.floor(Math.random() * maiusculas.length));
    senha += minusculas.charAt(Math.floor(Math.random() * minusculas.length));
    senha += numeros.charAt(Math.floor(Math.random() * numeros.length));
    senha += simbolos.charAt(Math.floor(Math.random() * simbolos.length));
    
    // Preencher o restante aleatoriamente
    const todosCaracteres = maiusculas + minusculas + numeros + simbolos;
    for (let i = 4; i < tamanho; i++) {
        senha += todosCaracteres.charAt(Math.floor(Math.random() * todosCaracteres.length));
    }
    
    // Embaralhar a senha para não ter padrão previsível
    return senha.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Gera PIN numérico
 * @param {number} tamanho - Tamanho do PIN (padrão: 4)
 * @returns {string} PIN gerado
 */
function gerarPIN(tamanho = 4) {
    let pin = '';
    for (let i = 0; i < tamanho; i++) {
        pin += Math.floor(Math.random() * 10).toString();
    }
    return pin;
}

/**
 * Valida força da senha
 * @param {string} senha - Senha a ser validada
 * @returns {object} Objeto com score e feedback
 */
function validarForcaSenha(senha) {
    let score = 0;
    const feedback = [];
    
    if (senha.length >= 8) {
        score += 1;
    } else {
        feedback.push('Senha deve ter pelo menos 8 caracteres');
    }
    
    if (/[a-z]/.test(senha)) {
        score += 1;
    } else {
        feedback.push('Senha deve conter letras minúsculas');
    }
    
    if (/[A-Z]/.test(senha)) {
        score += 1;
    } else {
        feedback.push('Senha deve conter letras maiúsculas');
    }
    
    if (/[0-9]/.test(senha)) {
        score += 1;
    } else {
        feedback.push('Senha deve conter números');
    }
    
    if (/[^a-zA-Z0-9]/.test(senha)) {
        score += 1;
    } else {
        feedback.push('Senha deve conter símbolos especiais');
    }
    
    const niveis = ['Muito Fraca', 'Fraca', 'Regular', 'Boa', 'Muito Forte'];
    
    return {
        score,
        nivel: niveis[score] || 'Muito Fraca',
        feedback: feedback.length > 0 ? feedback : ['Senha atende aos critérios de segurança']
    };
}

module.exports = {
    gerarSenha,
    gerarSenhaSimples,
    gerarSenhaForte,
    gerarPIN,
    validarForcaSenha
};