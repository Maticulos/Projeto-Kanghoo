/**
 * Utilitário para padronização de respostas da API
 * 
 * Este módulo centraliza a formatação de respostas HTTP,
 * garantindo consistência em toda a aplicação.
 * 
 * @author Sistema de Transporte Escolar
 * @version 1.0.0
 */

const logger = require('./logger');

/**
 * Formata resposta de sucesso
 * @param {any} data - Dados a serem retornados
 * @param {string} message - Mensagem de sucesso
 * @param {number} statusCode - Código HTTP de status (padrão: 200)
 * @returns {Object} Resposta formatada de sucesso
 */
const success = (data = null, message = 'Operação realizada com sucesso', statusCode = 200) => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    statusCode
});

/**
 * Formata resposta de erro
 * @param {string} message - Mensagem de erro
 * @param {number} statusCode - Código HTTP de status (padrão: 400)
 * @param {any} details - Detalhes adicionais do erro
 * @returns {Object} Resposta formatada de erro
 */
const error = (message = 'Erro interno do servidor', statusCode = 400, details = null) => ({
    success: false,
    message,
    error: true,
    details,
    timestamp: new Date().toISOString(),
    statusCode
});

/**
 * Formata resposta de validação com erros específicos
 * @param {Array|Object} validationErrors - Erros de validação
 * @param {string} message - Mensagem principal
 * @returns {Object} Resposta formatada de erro de validação
 */
const validationError = (validationErrors, message = 'Dados inválidos fornecidos') => ({
    success: false,
    message,
    error: true,
    validationErrors,
    timestamp: new Date().toISOString(),
    statusCode: 422
});

/**
 * Formata resposta de não autorizado
 * @param {string} message - Mensagem de erro
 * @returns {Object} Resposta formatada de não autorizado
 */
const unauthorized = (message = 'Acesso não autorizado') => ({
    success: false,
    message,
    error: true,
    timestamp: new Date().toISOString(),
    statusCode: 401
});

/**
 * Formata resposta de não encontrado
 * @param {string} message - Mensagem de erro
 * @returns {Object} Resposta formatada de não encontrado
 */
const notFound = (message = 'Recurso não encontrado') => ({
    success: false,
    message,
    error: true,
    timestamp: new Date().toISOString(),
    statusCode: 404
});

/**
 * Formata resposta de conflito
 * @param {string} message - Mensagem de erro
 * @param {any} details - Detalhes do conflito
 * @returns {Object} Resposta formatada de conflito
 */
const conflict = (message = 'Conflito de dados', details = null) => ({
    success: false,
    message,
    error: true,
    details,
    timestamp: new Date().toISOString(),
    statusCode: 409
});

/**
 * Formata resposta paginada
 * @param {Array} data - Dados da página atual
 * @param {Object} pagination - Informações de paginação
 * @param {string} message - Mensagem de sucesso
 * @returns {Object} Resposta formatada com paginação
 */
const paginated = (data, pagination, message = 'Dados recuperados com sucesso') => ({
    success: true,
    message,
    data,
    pagination: {
        currentPage: pagination.currentPage || 1,
        totalPages: pagination.totalPages || 1,
        totalItems: pagination.totalItems || 0,
        itemsPerPage: pagination.itemsPerPage || 10,
        hasNextPage: pagination.hasNextPage || false,
        hasPreviousPage: pagination.hasPreviousPage || false
    },
    timestamp: new Date().toISOString(),
    statusCode: 200
});

/**
 * Middleware para enviar resposta formatada
 * @param {Object} ctx - Contexto do Koa
 * @param {Object} response - Resposta formatada
 */
const send = (ctx, response) => {
    ctx.status = response.statusCode || 200;
    ctx.body = response;
};

/**
 * Middleware para capturar e formatar erros não tratados
 * @param {Object} ctx - Contexto do Koa
 * @param {Function} next - Próximo middleware
 */
const errorHandler = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        logger.error('Erro não tratado:', err);
        
        // Determina o tipo de erro e resposta apropriada
        let response;
        
        if (err.status === 401) {
            response = unauthorized(err.message);
        } else if (err.status === 404) {
            response = notFound(err.message);
        } else if (err.status === 409) {
            response = conflict(err.message);
        } else if (err.status === 422) {
            response = validationError(err.details, err.message);
        } else {
            response = error(
                process.env.NODE_ENV === 'production' 
                    ? 'Erro interno do servidor' 
                    : err.message,
                err.status || 500,
                process.env.NODE_ENV === 'development' ? err.stack : null
            );
        }
        
        send(ctx, response);
    }
};

module.exports = {
    success,
    error,
    validationError,
    unauthorized,
    notFound,
    conflict,
    paginated,
    send,
    errorHandler
};