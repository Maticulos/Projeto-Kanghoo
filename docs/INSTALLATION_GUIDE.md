# 🛠️ Guia de Instalação e Configuração

## 📋 Visão Geral

Este guia fornece instruções detalhadas para instalar, configurar e executar o Sistema de Rastreamento de Transporte Escolar em diferentes ambientes.

## 🔧 Pré-requisitos

### Requisitos do Sistema

| Componente | Versão Mínima | Versão Recomendada | Observações |
|------------|---------------|-------------------|-------------|
| **Node.js** | 16.0.0 | 18.x ou superior | LTS recomendado |
| **NPM** | 8.0.0 | 9.x ou superior | Ou Yarn 1.22+ |
| **SQLite** | 3.35.0 | 3.40+ | Incluído no Node.js |
| **Sistema Operacional** | - | Windows 10+, macOS 10.15+, Ubuntu 20.04+ | - |

### Verificação dos Pré-requisitos

```bash
# Verificar versão do Node.js
node --version
# Deve retornar v16.0.0 ou superior

# Verificar versão do NPM
npm --version
# Deve retornar 8.0.0 ou superior

# Verificar SQLite (opcional)
sqlite3 --version
# Deve retornar 3.35.0 ou superior
```

## 📦 Instalação

### Método 1: Instalação Padrão

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd teste-backend-koa
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Verifique a instalação**
   ```bash
   npm run check
   ```

### Método 2: Instalação com Yarn

```bash
# Clone o repositório
git clone <repository-url>
cd teste-backend-koa

# Instale com Yarn
yarn install

# Verifique a instalação
yarn check
```

### Método 3: Instalação via Docker

```bash
# Clone o repositório
git clone <repository-url>
cd teste-backend-koa

# Build da imagem Docker
docker build -t tracking-system .

# Execute o container
docker run -p 5000:5000 tracking-system
```

## ⚙️ Configuração

### 1. Configuração do Ambiente

#### Arquivo .env

Crie um arquivo `.env` na raiz do projeto:

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

#### Configurações Essenciais

```bash
# ======================
# CONFIGURAÇÕES DO SERVIDOR
# ======================
PORT=5000
NODE_ENV=development
HOST=localhost

# ======================
# BANCO DE DADOS
# ======================
DATABASE_PATH=./database.db
DATABASE_BACKUP_ENABLED=true
DATABASE_BACKUP_INTERVAL=24

# ======================
# AUTENTICAÇÃO JWT
# ======================
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ======================
# WHATSAPP INTEGRATION
# ======================
WHATSAPP_TOKEN=seu-whatsapp-business-token
WHATSAPP_WEBHOOK_VERIFY=seu-webhook-verify-token
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_ENABLED=true

# ======================
# CACHE E PERFORMANCE
# ======================
CACHE_RETENTION_HOURS=24
MAX_LOCATIONS_PER_DRIVER=1000
CLEANUP_INTERVAL_HOURS=6
ENABLE_REAL_TIME=true

# ======================
# SEGURANÇA
# ======================
ENABLE_CORS=true
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15

# ======================
# LOGS E MONITORAMENTO
# ======================
LOG_LEVEL=info
LOG_FILE=./logs/app.log
ENABLE_AUDIT_LOG=true

# ======================
# NOTIFICAÇÕES
# ======================
EMAIL_ENABLED=false
SMS_ENABLED=false
PUSH_NOTIFICATIONS_ENABLED=false
```

### 2. Configuração do Banco de Dados

#### Inicialização Automática

O sistema cria automaticamente o banco de dados na primeira execução:

```bash
# Execute o servidor para criar o banco
npm start
```

#### Configuração Manual (Opcional)

```bash
# Criar banco manualmente
sqlite3 database.db

# Executar scripts de criação
.read scripts/create_tables.sql
.exit
```

#### Backup e Restauração

```bash
# Criar backup
sqlite3 database.db ".backup backup_$(date +%Y%m%d).db"

# Restaurar backup
sqlite3 database.db ".restore backup_20240115.db"
```

### 3. Configuração do WhatsApp

#### Pré-requisitos WhatsApp

1. **Conta WhatsApp Business**
2. **Meta for Developers Account**
3. **Webhook configurado**

#### Configuração Passo a Passo

1. **Acesse Meta for Developers**
   ```
   https://developers.facebook.com/
   ```

2. **Crie uma aplicação**
   - Selecione "Business"
   - Adicione produto "WhatsApp"

3. **Configure o Webhook**
   ```bash
   # URL do webhook
   https://seu-dominio.com/api/whatsapp/webhook
   
   # Token de verificação
   seu-webhook-verify-token
   ```

4. **Obtenha as credenciais**
   ```bash
   WHATSAPP_TOKEN=EAAxxxxxxxxxxxxx
   WHATSAPP_PHONE_NUMBER_ID=123456789
   WHATSAPP_WEBHOOK_VERIFY=seu-token-verify
   ```

#### Teste da Integração

```bash
# Teste de envio de mensagem
curl -X POST http://localhost:5000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"to": "5511999999999", "message": "Teste"}'
```

### 4. Configuração de Segurança

#### Geração de JWT Secret

```bash
# Gerar secret seguro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Configuração HTTPS (Produção)

```javascript
// server.js - Configuração HTTPS
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app.callback()).listen(443);
```

#### Configuração de CORS

```javascript
// Configuração detalhada de CORS
const cors = require('@koa/cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}));
```

## 🚀 Execução

### Desenvolvimento

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Ou com nodemon
npm run start:dev

# Com logs detalhados
DEBUG=* npm run dev
```

### Produção

```bash
# Modo produção
npm start

# Com PM2 (recomendado)
npm install -g pm2
pm2 start ecosystem.config.js

# Com Docker
docker-compose up -d
```

### Testes

```bash
# Executar todos os testes
npm test

# Testes específicos
npm run test:unit
npm run test:integration
npm run test:api

# Cobertura de testes
npm run test:coverage
```

## 🔍 Verificação da Instalação

### 1. Verificação Básica

```bash
# Verificar se o servidor está rodando
curl http://localhost:5000/health

# Resposta esperada:
# {"status": "ok", "timestamp": "2024-01-15T10:30:00.000Z"}
```

### 2. Verificação das APIs

```bash
# Testar API de tracking
node testar-tracking-api.js

# Testar persistência
node testar-persistencia-rastreamento.js

# Executar exemplos
node exemplos-uso-tracking.js
```

### 3. Verificação do Banco

```bash
# Verificar tabelas criadas
sqlite3 database.db ".tables"

# Verificar estrutura
sqlite3 database.db ".schema tracking_locations"
```

### 4. Verificação do WhatsApp

```bash
# Testar webhook
curl -X GET "http://localhost:5000/api/whatsapp/webhook?hub.verify_token=seu-token&hub.challenge=test&hub.mode=subscribe"
```

## 🐛 Solução de Problemas

### Problemas Comuns

#### 1. Erro de Porta em Uso

```bash
# Erro: EADDRINUSE: address already in use :::5000
# Solução: Alterar porta ou matar processo

# Encontrar processo usando a porta
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # macOS/Linux

# Matar processo
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # macOS/Linux
```

#### 2. Erro de Permissão no Banco

```bash
# Erro: SQLITE_READONLY: attempt to write a readonly database
# Solução: Verificar permissões

# Linux/macOS
chmod 664 database.db
chmod 755 .

# Windows
# Verificar propriedades do arquivo e dar permissão de escrita
```

#### 3. Erro de Dependências

```bash
# Erro: Module not found
# Solução: Reinstalar dependências

# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install

# Ou com Yarn
rm -rf node_modules yarn.lock
yarn install
```

#### 4. Erro de JWT

```bash
# Erro: JsonWebTokenError: invalid token
# Solução: Verificar configuração JWT

# Verificar se JWT_SECRET está definido
echo $JWT_SECRET

# Gerar novo secret se necessário
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Logs e Debugging

#### Configuração de Logs

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```

#### Debug Mode

```bash
# Ativar debug detalhado
DEBUG=tracking:* npm start

# Debug específico
DEBUG=tracking:api npm start
DEBUG=tracking:database npm start
DEBUG=tracking:whatsapp npm start
```

## 📊 Monitoramento

### Health Check

```javascript
// health-check.js
app.use(async (ctx, next) => {
  if (ctx.path === '/health') {
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version
    };
    return;
  }
  await next();
});
```

### Métricas

```bash
# Endpoint de métricas
curl http://localhost:5000/api/tracking/stats

# Resposta com métricas do sistema
{
  "sucesso": true,
  "dados": {
    "cache": {
      "motoristas_ativos": 5,
      "total_localizacoes": 1250,
      "memoria_utilizada_mb": 45.2
    }
  }
}
```

## 🔄 Atualizações

### Atualização do Sistema

```bash
# Backup antes da atualização
sqlite3 database.db ".backup backup_pre_update.db"

# Atualizar código
git pull origin main

# Atualizar dependências
npm update

# Executar migrações (se houver)
npm run migrate

# Reiniciar serviço
pm2 restart tracking-system
```

### Migração de Dados

```bash
# Executar migrações
npm run migrate

# Verificar versão do schema
sqlite3 database.db "SELECT * FROM schema_version ORDER BY version DESC LIMIT 1;"
```

## 🚀 Deploy em Produção

### Configuração do Servidor

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Configurar PM2
pm2 startup
pm2 save
```

### Arquivo ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'tracking-system',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Nginx (Proxy Reverso)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📞 Suporte

### Canais de Suporte

- **Documentação**: [README_TRACKING_SYSTEM.md](./README_TRACKING_SYSTEM.md)
- **Issues**: GitHub Issues
- **Email**: suporte@exemplo.com

### Informações para Suporte

Ao solicitar suporte, inclua:

1. **Versão do sistema**
2. **Sistema operacional**
3. **Logs de erro**
4. **Passos para reproduzir**
5. **Configuração (sem dados sensíveis)**

---

*Última atualização: Janeiro 2024*
*Versão: 1.0.0*