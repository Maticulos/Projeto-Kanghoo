const multer = require('@koa/multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Configurações de segurança para uploads
 */
const UPLOAD_CONFIG = {
    // Tipos de arquivo permitidos por categoria
    ALLOWED_TYPES: {
        images: {
            mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            maxSize: 5 * 1024 * 1024, // 5MB
            description: 'Imagens (JPG, PNG, GIF, WebP)'
        },
        documents: {
            mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            extensions: ['.pdf', '.doc', '.docx'],
            maxSize: 10 * 1024 * 1024, // 10MB
            description: 'Documentos (PDF, DOC, DOCX)'
        },
        csv: {
            mimeTypes: ['text/csv', 'application/csv', 'text/plain'],
            extensions: ['.csv'],
            maxSize: 5 * 1024 * 1024, // 5MB
            description: 'Arquivos CSV'
        },
        all: {
            mimeTypes: [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/csv', 'application/csv'
            ],
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.csv'],
            maxSize: 10 * 1024 * 1024, // 10MB
            description: 'Todos os tipos permitidos'
        }
    },
    
    // Diretório de uploads
    UPLOAD_DIR: 'uploads/',
    
    // Tamanho máximo global
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    
    // Número máximo de arquivos por upload
    MAX_FILES: 5
};

/**
 * Valida se o tipo de arquivo é permitido
 * @param {Object} file - Arquivo do multer
 * @param {string} category - Categoria de arquivo (images, documents, csv, all)
 * @returns {Object} - {valid: boolean, error?: string}
 */
function validateFileType(file, category = 'all') {
    const config = UPLOAD_CONFIG.ALLOWED_TYPES[category];
    
    if (!config) {
        return { valid: false, error: `Categoria de arquivo inválida: ${category}` };
    }
    
    // Verificar MIME type
    if (!config.mimeTypes.includes(file.mimetype)) {
        return { 
            valid: false, 
            error: `Tipo de arquivo não permitido. Tipos aceitos: ${config.description}` 
        };
    }
    
    // Verificar extensão
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!config.extensions.includes(fileExtension)) {
        return { 
            valid: false, 
            error: `Extensão de arquivo não permitida. Extensões aceitas: ${config.extensions.join(', ')}` 
        };
    }
    
    return { valid: true };
}

/**
 * Valida o tamanho do arquivo
 * @param {Object} file - Arquivo do multer
 * @param {string} category - Categoria de arquivo
 * @returns {Object} - {valid: boolean, error?: string}
 */
function validateFileSize(file, category = 'all') {
    const config = UPLOAD_CONFIG.ALLOWED_TYPES[category];
    
    if (!config) {
        return { valid: false, error: `Categoria de arquivo inválida: ${category}` };
    }
    
    if (file.size > config.maxSize) {
        const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(1);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return { 
            valid: false, 
            error: `Arquivo muito grande (${fileSizeMB}MB). Tamanho máximo: ${maxSizeMB}MB` 
        };
    }
    
    return { valid: true };
}

/**
 * Gera um nome de arquivo seguro e único
 * @param {string} originalName - Nome original do arquivo
 * @returns {string} - Nome seguro do arquivo
 */
function generateSecureFileName(originalName) {
    const extension = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `${timestamp}_${randomBytes}${extension}`;
}

/**
 * Sanitiza o nome do arquivo removendo caracteres perigosos
 * @param {string} filename - Nome do arquivo
 * @returns {string} - Nome sanitizado
 */
function sanitizeFileName(filename) {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove caracteres especiais
        .replace(/_{2,}/g, '_') // Remove underscores múltiplos
        .replace(/^_+|_+$/g, '') // Remove underscores no início e fim
        .substring(0, 100); // Limita o tamanho
}

/**
 * Verifica se o arquivo é realmente do tipo declarado (verificação de magic numbers)
 * @param {string} filePath - Caminho do arquivo
 * @param {string} expectedMimeType - MIME type esperado
 * @returns {Promise<boolean>} - True se o arquivo é válido
 */
async function verifyFileSignature(filePath, expectedMimeType) {
    try {
        const buffer = Buffer.alloc(8);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 8, 0);
        fs.closeSync(fd);
        
        const hex = buffer.toString('hex').toUpperCase();
        
        // Magic numbers para diferentes tipos de arquivo
        const signatures = {
            'image/jpeg': ['FFD8FF'],
            'image/png': ['89504E47'],
            'image/gif': ['474946'],
            'application/pdf': ['255044462D'],
            'application/msword': ['D0CF11E0'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504B0304']
        };
        
        const expectedSignatures = signatures[expectedMimeType];
        if (!expectedSignatures) {
            return true; // Se não temos assinatura conhecida, aceita
        }
        
        return expectedSignatures.some(sig => hex.startsWith(sig));
    } catch (error) {
        logger.error('Erro ao verificar assinatura do arquivo:', error);
        return false;
    }
}

/**
 * Cria configuração do multer com validações de segurança
 * @param {string} category - Categoria de arquivo (images, documents, csv, all)
 * @param {Object} options - Opções adicionais
 * @returns {Object} - Configuração do multer
 */
function createSecureUpload(category = 'all', options = {}) {
    const config = UPLOAD_CONFIG.ALLOWED_TYPES[category];
    
    if (!config) {
        throw new Error(`Categoria de arquivo inválida: ${category}`);
    }
    
    // Garantir que o diretório de upload existe
    if (!fs.existsSync(UPLOAD_CONFIG.UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_CONFIG.UPLOAD_DIR, { recursive: true });
    }
    
    return multer({
        dest: UPLOAD_CONFIG.UPLOAD_DIR,
        
        // Filtro de arquivos
        fileFilter: (req, file, cb) => {
            // Validar tipo de arquivo
            const typeValidation = validateFileType(file, category);
            if (!typeValidation.valid) {
                return cb(new Error(typeValidation.error), false);
            }
            
            cb(null, true);
        },
        
        // Limites
        limits: {
            fileSize: config.maxSize,
            files: options.maxFiles || UPLOAD_CONFIG.MAX_FILES,
            fieldSize: 1024 * 1024, // 1MB para campos de texto
            fields: 20 // Máximo 20 campos
        },
        
        // Configuração de armazenamento
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, UPLOAD_CONFIG.UPLOAD_DIR);
            },
            filename: (req, file, cb) => {
                const secureFileName = generateSecureFileName(file.originalname);
                cb(null, secureFileName);
            }
        })
    });
}

/**
 * Middleware para validação pós-upload
 * @param {string} category - Categoria de arquivo
 * @returns {Function} - Middleware do Koa
 */
function validateUploadedFiles(category = 'all') {
    return async (ctx, next) => {
        try {
            const files = ctx.files || (ctx.file ? [ctx.file] : []);
            
            for (const file of files) {
                // Validar tamanho novamente (por segurança)
                const sizeValidation = validateFileSize(file, category);
                if (!sizeValidation.valid) {
                    // Remover arquivo inválido
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                    ctx.throw(400, sizeValidation.error);
                }
                
                // Verificar assinatura do arquivo
                const isValidSignature = await verifyFileSignature(file.path, file.mimetype);
                if (!isValidSignature) {
                    // Remover arquivo inválido
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                    ctx.throw(400, 'Arquivo corrompido ou tipo de arquivo inválido');
                }
                
                // Adicionar informações de segurança ao arquivo
                file.secureFileName = path.basename(file.path);
                file.sanitizedOriginalName = sanitizeFileName(file.originalname);
                file.uploadTimestamp = Date.now();
                file.validated = true;
            }
            
            await next();
        } catch (error) {
            // Limpar arquivos em caso de erro
            const files = ctx.files || (ctx.file ? [ctx.file] : []);
            for (const file of files) {
                if (file.path && fs.existsSync(file.path)) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (cleanupError) {
                        logger.error('Erro ao limpar arquivo:', cleanupError);
                    }
                }
            }
            throw error;
        }
    };
}

/**
 * Utilitário para limpar arquivos antigos
 * @param {number} maxAgeHours - Idade máxima em horas
 */
function cleanupOldFiles(maxAgeHours = 24) {
    try {
        const uploadDir = UPLOAD_CONFIG.UPLOAD_DIR;
        if (!fs.existsSync(uploadDir)) return;
        
        const files = fs.readdirSync(uploadDir);
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        
        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stats = fs.statSync(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                logger.info(`Arquivo antigo removido: ${file}`);
            }
        }
    } catch (error) {
        logger.error('Erro ao limpar arquivos antigos:', error);
    }
}

module.exports = {
    createSecureUpload,
    validateUploadedFiles,
    validateFileType,
    validateFileSize,
    generateSecureFileName,
    sanitizeFileName,
    verifyFileSignature,
    cleanupOldFiles,
    UPLOAD_CONFIG
};