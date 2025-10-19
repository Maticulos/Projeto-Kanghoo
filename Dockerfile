# ========================================
# DOCKERFILE PARA SISTEMA DE TRANSPORTE ESCOLAR
# ========================================
# Este Dockerfile cria uma imagem otimizada para produção

# ========================================
# ESTÁGIO 1: BUILD
# ========================================
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Copiar arquivos de dependências
COPY server/package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production && npm cache clean --force

# ========================================
# ESTÁGIO 2: PRODUÇÃO
# ========================================
FROM node:18-alpine AS production

# Metadados da imagem
LABEL maintainer="Sistema de Transporte Escolar"
LABEL version="1.0.0"
LABEL description="Sistema completo de gestão de transporte escolar"

# Instalar dependências do sistema
RUN apk add --no-cache \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar dependências do estágio de build
COPY --from=builder /app/node_modules ./node_modules

# Copiar código da aplicação
COPY server/ ./
COPY frontend/ ./frontend/

# Criar diretórios necessários
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta da aplicação
EXPOSE 5000

# Configurar variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=5000

# Health check para monitoramento
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Comando para iniciar a aplicação
CMD ["npm", "start"]