const logger = require('../utils/logger');

function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const isProd = process.env.NODE_ENV === 'production' || 
                 process.env.NODE_ENV === 'prod' ||
                 process.env.ENVIRONMENT === 'production';

  // Validações obrigatórias em produção
  if (isProd) {
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET é obrigatório em produção');
    }
    
    // REDIS_PASSWORD só é obrigatório se REDIS_URL estiver configurado
    // Se não houver Redis, o sistema usa fallback em memória
    if (process.env.REDIS_URL) {
      if (!process.env.REDIS_PASSWORD || process.env.REDIS_PASSWORD.length < 16) {
        errors.push('REDIS_PASSWORD deve ter pelo menos 16 caracteres quando REDIS_URL está configurado');
      }
    } else {
      warnings.push('REDIS_URL não configurado. Rate limiting usará fallback em memória (limitado a este processo).');
    }
    
    if (!process.env.CORS_ORIGINS) {
      warnings.push('CORS_ORIGINS não configurado. Usando lista padrão restritiva.');
    }
    
    if (!process.env.DB_PASSWORD) {
      errors.push('DB_PASSWORD é obrigatório em produção');
    }
  }

  // Validações gerais
  if (!process.env.DB_NAME) {
    warnings.push('DB_NAME não configurado. Usando padrão.');
  }

  // Reportar
  if (errors.length > 0) {
    logger.error('❌ Erros de configuração de ambiente:', errors);
    throw new Error('Configuração de ambiente inválida. Verifique as variáveis de ambiente.');
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn('⚠️  ' + warning));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.info('✅ Validação de ambiente concluída com sucesso');
  }
}

module.exports = { validateEnvironment };

// Executar se chamado diretamente
if (require.main === module) {
  validateEnvironment();
}

