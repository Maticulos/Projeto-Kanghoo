/**
 * CONFIGURAÇÃO DE UPLOADS
 * 
 * Centraliza todas as configurações relacionadas ao upload de arquivos,
 * incluindo caminhos, limites, tipos permitidos e políticas de segurança.
 * 
 * @author Sistema de Transporte Escolar
 * @version 2.0.0
 */

const path = require('path');
const fs = require('fs');

// Diretório base de uploads
const UPLOAD_BASE_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Configurações por categoria de upload
 */
const UPLOAD_CATEGORIES = {
    // Arquivos de usuários
    USER_PROFILE: {
        path: 'users/profiles',
        maxSize: 2 * 1024 * 1024, // 2MB
        allowedTypes: ['jpg', 'jpeg', 'png', 'webp'],
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        description: 'Fotos de perfil dos usuários'
    },
    
    USER_DOCUMENT: {
        path: 'users/documents',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Documentos pessoais (RG, CPF, CNH)'
    },
    
    USER_CERTIFICATE: {
        path: 'users/certificates',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Certificados e comprovantes'
    },
    
    // Arquivos de veículos
    VEHICLE_PHOTO: {
        path: 'vehicles/photos',
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['jpg', 'jpeg', 'png', 'webp'],
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        description: 'Fotos dos veículos'
    },
    
    VEHICLE_DOCUMENT: {
        path: 'vehicles/documents',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Documentos dos veículos (CRLV, seguro)'
    },
    
    VEHICLE_INSPECTION: {
        path: 'vehicles/inspections',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Laudos de vistoria e inspeção'
    },
    
    // Arquivos de crianças
    CHILD_PHOTO: {
        path: 'children/photos',
        maxSize: 2 * 1024 * 1024, // 2MB
        allowedTypes: ['jpg', 'jpeg', 'png', 'webp'],
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        description: 'Fotos das crianças'
    },
    
    CHILD_DOCUMENT: {
        path: 'children/documents',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Documentos das crianças'
    },
    
    CHILD_MEDICAL: {
        path: 'children/medical',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        description: 'Atestados médicos e receitas'
    },
    
    // Arquivos de eventos
    EVENT_BANNER: {
        path: 'events/banners',
        maxSize: 8 * 1024 * 1024, // 8MB
        allowedTypes: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        description: 'Banners e imagens promocionais'
    },
    
    EVENT_DOCUMENT: {
        path: 'events/documents',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['pdf', 'doc', 'docx'],
        mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        description: 'Contratos e documentos do evento'
    },
    
    EVENT_PHOTO: {
        path: 'events/photos',
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['jpg', 'jpeg', 'png', 'webp'],
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        description: 'Fotos do evento'
    },
    
    // Arquivos do sistema
    SYSTEM_BACKUP: {
        path: 'system/backups',
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['zip', 'tar', 'gz'],
        mimeTypes: ['application/zip', 'application/x-tar', 'application/gzip'],
        description: 'Backups de arquivos'
    },
    
    SYSTEM_TEMP: {
        path: 'system/temp',
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['*'], // Qualquer tipo para arquivos temporários
        mimeTypes: ['*'],
        description: 'Arquivos temporários'
    },
    
    // Relatórios
    REPORT_PDF: {
        path: 'reports/pdf',
        maxSize: 20 * 1024 * 1024, // 20MB
        allowedTypes: ['pdf'],
        mimeTypes: ['application/pdf'],
        description: 'Relatórios em PDF'
    },
    
    REPORT_EXCEL: {
        path: 'reports/excel',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['xls', 'xlsx', 'csv'],
        mimeTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        description: 'Planilhas exportadas'
    }
};

/**
 * Classe para gerenciar configurações de upload
 */
class UploadConfig {
    /**
     * Obtém configuração de uma categoria
     * @param {string} category - Categoria do upload
     * @returns {object} Configuração da categoria
     */
    static getConfig(category) {
        return UPLOAD_CATEGORIES[category] || null;
    }
    
    /**
     * Obtém caminho completo para uma categoria
     * @param {string} category - Categoria do upload
     * @param {string} filename - Nome do arquivo (opcional)
     * @returns {string} Caminho completo
     */
    static getPath(category, filename = '') {
        const config = this.getConfig(category);
        if (!config) {
            throw new Error(`Categoria de upload inválida: ${category}`);
        }
        
        const fullPath = path.join(UPLOAD_BASE_DIR, config.path);
        return filename ? path.join(fullPath, filename) : fullPath;
    }
    
    /**
     * Obtém caminho para foto de perfil de usuário
     * @param {number} userId - ID do usuário
     * @param {string} filename - Nome do arquivo
     * @returns {string} Caminho completo
     */
    static getUserProfilePath(userId, filename = '') {
        const userDir = path.join(UPLOAD_BASE_DIR, 'users/profiles', userId.toString());
        this.ensureDirectoryExists(userDir);
        return filename ? path.join(userDir, filename) : userDir;
    }
    
    /**
     * Obtém caminho para documento de veículo
     * @param {number} vehicleId - ID do veículo
     * @param {string} filename - Nome do arquivo
     * @returns {string} Caminho completo
     */
    static getVehicleDocumentPath(vehicleId, filename = '') {
        const vehicleDir = path.join(UPLOAD_BASE_DIR, 'vehicles/documents', vehicleId.toString());
        this.ensureDirectoryExists(vehicleDir);
        return filename ? path.join(vehicleDir, filename) : vehicleDir;
    }
    
    /**
     * Obtém caminho para foto de criança
     * @param {number} childId - ID da criança
     * @param {string} filename - Nome do arquivo
     * @returns {string} Caminho completo
     */
    static getChildPhotoPath(childId, filename = '') {
        const childDir = path.join(UPLOAD_BASE_DIR, 'children/photos', childId.toString());
        this.ensureDirectoryExists(childDir);
        return filename ? path.join(childDir, filename) : childDir;
    }
    
    /**
     * Valida se um arquivo é permitido para uma categoria
     * @param {string} category - Categoria do upload
     * @param {string} filename - Nome do arquivo
     * @param {string} mimeType - Tipo MIME do arquivo
     * @param {number} fileSize - Tamanho do arquivo em bytes
     * @returns {object} Resultado da validação
     */
    static validateFile(category, filename, mimeType, fileSize) {
        const config = this.getConfig(category);
        if (!config) {
            return {
                valid: false,
                error: `Categoria de upload inválida: ${category}`
            };
        }
        
        // Validar tamanho
        if (fileSize > config.maxSize) {
            return {
                valid: false,
                error: `Arquivo muito grande. Máximo permitido: ${this.formatFileSize(config.maxSize)}`
            };
        }
        
        // Validar extensão
        const extension = filename.toLowerCase().split('.').pop();
        if (!config.allowedTypes.includes('*') && !config.allowedTypes.includes(extension)) {
            return {
                valid: false,
                error: `Tipo de arquivo não permitido. Tipos aceitos: ${config.allowedTypes.join(', ')}`
            };
        }
        
        // Validar MIME type
        if (!config.mimeTypes.includes('*') && !config.mimeTypes.includes(mimeType)) {
            return {
                valid: false,
                error: `Tipo MIME não permitido: ${mimeType}`
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Garante que um diretório existe
     * @param {string} dirPath - Caminho do diretório
     */
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    /**
     * Formata tamanho de arquivo para exibição
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    static formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    /**
     * Gera nome único para arquivo
     * @param {string} originalName - Nome original do arquivo
     * @returns {string} Nome único
     */
    static generateUniqueFilename(originalName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = originalName.toLowerCase().split('.').pop();
        return `${timestamp}_${random}.${extension}`;
    }
    
    /**
     * Obtém estatísticas de uso de espaço
     * @returns {object} Estatísticas de uso
     */
    static async getStorageStats() {
        const stats = {};
        
        for (const [category, config] of Object.entries(UPLOAD_CATEGORIES)) {
            const categoryPath = this.getPath(category);
            try {
                const size = await this.getDirectorySize(categoryPath);
                stats[category] = {
                    path: config.path,
                    size: size,
                    sizeFormatted: this.formatFileSize(size),
                    description: config.description
                };
            } catch (error) {
                stats[category] = {
                    path: config.path,
                    size: 0,
                    sizeFormatted: '0 Bytes',
                    description: config.description,
                    error: error.message
                };
            }
        }
        
        return stats;
    }
    
    /**
     * Calcula tamanho de um diretório
     * @param {string} dirPath - Caminho do diretório
     * @returns {Promise<number>} Tamanho em bytes
     */
    static async getDirectorySize(dirPath) {
        if (!fs.existsSync(dirPath)) return 0;
        
        let totalSize = 0;
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                totalSize += await this.getDirectorySize(filePath);
            } else {
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            }
        }
        
        return totalSize;
    }
}

module.exports = {
    UploadConfig,
    UPLOAD_CATEGORIES,
    UPLOAD_BASE_DIR
};