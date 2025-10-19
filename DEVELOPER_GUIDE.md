# 👨‍💻 Guia do Desenvolvedor - Sistema de Transporte Escolar

Este guia fornece informações detalhadas para desenvolvedores que desejam contribuir ou entender a arquitetura do sistema.

## 📋 Índice

- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Padrões de Código](#-padrões-de-código)
- [Estrutura do Banco de Dados](#-estrutura-do-banco-de-dados)
- [API Design](#-api-design)
- [Frontend Architecture](#-frontend-architecture)
- [Segurança](#-segurança)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

## 🏗️ Arquitetura do Sistema

### Visão Geral

O sistema segue uma arquitetura **cliente-servidor** com separação clara entre frontend e backend:

```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│                 │ ◄──────────────► │                 │
│    Frontend     │                  │     Backend     │
│   (Vanilla JS)  │                  │    (Koa.js)     │
│                 │                  │                 │
└─────────────────┘                  └─────────────────┘
                                              │
                                              │ SQL
                                              ▼
                                     ┌─────────────────┐
                                     │   PostgreSQL    │
                                     │    Database     │
                                     └─────────────────┘
```

### Componentes Principais

#### Frontend
- **Vanilla JavaScript**: Sem frameworks pesados para máxima performance
- **Progressive Web App**: Funcionalidades offline e mobile-first
- **Modular Design**: Código organizado em módulos reutilizáveis

#### Backend
- **Koa.js**: Framework minimalista e moderno
- **Middleware Stack**: Arquitetura baseada em middlewares
- **RESTful API**: Endpoints bem definidos e documentados

#### Database
- **PostgreSQL**: Banco relacional robusto
- **Migrations**: Controle de versão do schema
- **Indexes**: Otimização de consultas

## 📝 Padrões de Código

### JavaScript (ES6+)

#### Nomenclatura
```javascript
// Variáveis e funções: camelCase
const userName = 'João';
function getUserData() { }

// Constantes: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.exemplo.com';

// Classes: PascalCase
class UserManager { }

// Arquivos: kebab-case
// user-service.js, auth-middleware.js
```

#### Estrutura de Funções
```javascript
/**
 * Descrição da função
 * @param {string} param1 - Descrição do parâmetro
 * @param {Object} options - Opções configuráveis
 * @returns {Promise<Object>} Descrição do retorno
 */
async function exemploFuncao(param1, options = {}) {
    // Validação de entrada
    if (!param1) {
        throw new Error('param1 é obrigatório');
    }
    
    // Lógica principal
    try {
        const result = await processarDados(param1, options);
        return result;
    } catch (error) {
        console.error('Erro em exemploFuncao:', error);
        throw error;
    }
}
```

#### Error Handling
```javascript
// Sempre use try-catch para operações assíncronas
try {
    const data = await fetchData();
    return processData(data);
} catch (error) {
    // Log do erro
    console.error('Erro específico:', error.message);
    
    // Retorno de erro padronizado
    throw new Error(`Falha na operação: ${error.message}`);
}
```

### CSS

#### Metodologia BEM
```css
/* Bloco */
.card { }

/* Elemento */
.card__title { }
.card__content { }

/* Modificador */
.card--highlighted { }
.card__title--large { }
```

#### Variáveis CSS
```css
:root {
    /* Cores */
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    
    /* Espaçamentos */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 3rem;
    
    /* Tipografia */
    --font-family-primary: 'Inter', sans-serif;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
}
```

## 🗄️ Estrutura do Banco de Dados

### Diagrama ER

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   usuarios  │────▶│   veiculos  │     │   empresas  │
│             │     │             │     │             │
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ nome        │     │ usuario_id  │     │ usuario_id  │
│ email       │     │ placa       │     │ razao_social│
│ senha       │     │ renavam     │     │ cnpj        │
│ tipo        │     │ lotacao     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        
       │            ┌─────────────┐     ┌─────────────┐
       └───────────▶│   criancas  │     │    rotas    │
                    │             │     │             │
                    │ id (PK)     │     │ id (PK)     │
                    │ usuario_id  │     │ motorista_id│
                    │ nome        │     │ nome        │
                    │ idade       │     │ origem      │
                    │ escola      │     │ destino     │
                    └─────────────┘     └─────────────┘
```

### Principais Tabelas

#### usuarios
```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    celular VARCHAR(20),
    data_nascimento DATE,
    tipo_cadastro VARCHAR(50),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### rastreamento
```sql
CREATE TABLE rastreamento (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    velocidade DECIMAL(5, 2),
    status VARCHAR(50),
    timestamp_gps TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes Importantes
```sql
-- Performance para consultas de rastreamento
CREATE INDEX idx_rastreamento_usuario_timestamp 
ON rastreamento(usuario_id, timestamp_gps DESC);

-- Performance para login
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- Performance para busca de crianças
CREATE INDEX idx_criancas_usuario ON criancas(usuario_id);
```

## 🔌 API Design

### Padrões RESTful

#### Estrutura de URLs
```
GET    /api/usuarios           # Listar usuários
POST   /api/usuarios           # Criar usuário
GET    /api/usuarios/:id       # Obter usuário específico
PUT    /api/usuarios/:id       # Atualizar usuário
DELETE /api/usuarios/:id       # Deletar usuário

GET    /api/rastreamento/viagens        # Listar viagens
POST   /api/rastreamento/viagens        # Criar viagem
PUT    /api/rastreamento/viagens/:id    # Atualizar viagem
```

#### Códigos de Status HTTP
```javascript
// Sucesso
200 - OK (GET, PUT)
201 - Created (POST)
204 - No Content (DELETE)

// Erro do Cliente
400 - Bad Request (dados inválidos)
401 - Unauthorized (não autenticado)
403 - Forbidden (sem permissão)
404 - Not Found (recurso não encontrado)
422 - Unprocessable Entity (validação falhou)

// Erro do Servidor
500 - Internal Server Error
503 - Service Unavailable
```

#### Formato de Resposta Padronizado
```javascript
// Sucesso
{
    "sucesso": true,
    "dados": { /* dados da resposta */ },
    "mensagem": "Operação realizada com sucesso"
}

// Erro
{
    "sucesso": false,
    "erro": {
        "codigo": "VALIDATION_ERROR",
        "mensagem": "Dados inválidos fornecidos",
        "detalhes": {
            "email": "Email é obrigatório",
            "senha": "Senha deve ter pelo menos 8 caracteres"
        }
    }
}
```

### Middleware Stack

```javascript
// Ordem dos middlewares no Koa
app.use(securityHeaders);      // 1. Headers de segurança
app.use(cors);                 // 2. CORS
app.use(serveStatic);          // 3. Arquivos estáticos
app.use(bodyParser);           // 4. Parse do body
app.use(jsonFormatter);        // 5. Formatação JSON
app.use(rateLimit);            // 6. Rate limiting
app.use(authentication);       // 7. Autenticação (rotas protegidas)
app.use(routes);               // 8. Rotas da aplicação
```

## 🎨 Frontend Architecture

### Estrutura Modular

```javascript
// app.js - Módulo principal
const App = {
    // Inicialização da aplicação
    init() {
        this.initModals();
        this.initForms();
        this.initAnimations();
    },
    
    // Gerenciamento de modais
    initModals() {
        ModalManager.init();
    },
    
    // Inicialização de formulários
    initForms() {
        FormValidator.init();
        MultiStepForm.init();
    }
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
```

### Gerenciamento de Estado

```javascript
// Estado global simples
const AppState = {
    user: null,
    isAuthenticated: false,
    currentLocation: null,
    
    // Métodos para atualizar estado
    setUser(userData) {
        this.user = userData;
        this.isAuthenticated = true;
        this.notifyStateChange('user', userData);
    },
    
    // Sistema de observadores
    observers: new Map(),
    
    subscribe(key, callback) {
        if (!this.observers.has(key)) {
            this.observers.set(key, []);
        }
        this.observers.get(key).push(callback);
    },
    
    notifyStateChange(key, value) {
        const callbacks = this.observers.get(key) || [];
        callbacks.forEach(callback => callback(value));
    }
};
```

### Comunicação com API

```javascript
// api-client.js - Cliente HTTP centralizado
class ApiClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('authToken');
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Adicionar token se disponível
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }
    
    // Métodos de conveniência
    get(endpoint) {
        return this.request(endpoint);
    }
    
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Instância global
const api = new ApiClient();
```

## 🔒 Segurança

### Autenticação JWT

```javascript
// Geração de token
const token = jwt.sign(
    { 
        id: user.id, 
        email: user.email,
        tipo: user.tipo_cadastro 
    },
    JWT_SECRET,
    { 
        expiresIn: '2h',
        algorithm: 'HS256'
    }
);

// Middleware de autenticação
const authenticateToken = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        ctx.status = 401;
        ctx.body = { error: 'Token de acesso requerido' };
        return;
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        ctx.user = decoded;
        await next();
    } catch (error) {
        ctx.status = 403;
        ctx.body = { error: 'Token inválido' };
    }
};
```

### Validação de Dados

```javascript
// Validadores customizados
const validators = {
    email: (value) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(value);
    },
    
    cpf: (value) => {
        const cpf = value.replace(/[^\d]/g, '');
        if (cpf.length !== 11) return false;
        
        // Algoritmo de validação do CPF
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        // ... resto da validação
    },
    
    senha: (value) => {
        return value.length >= 8 && 
               /[A-Za-z]/.test(value) && 
               /\d/.test(value);
    }
};

// Middleware de validação
const validateInput = (schema) => {
    return async (ctx, next) => {
        const errors = {};
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = ctx.request.body[field];
            
            for (const rule of rules) {
                if (!rule.validator(value)) {
                    errors[field] = rule.message;
                    break;
                }
            }
        }
        
        if (Object.keys(errors).length > 0) {
            ctx.status = 422;
            ctx.body = { errors };
            return;
        }
        
        await next();
    };
};
```

### Rate Limiting Avançado

```javascript
// Rate limiting por tipo de operação
const rateLimitConfigs = {
    login: { windowMs: 60000, maxRequests: 5 },      // 5 tentativas por minuto
    api: { windowMs: 900000, maxRequests: 100 },     // 100 req por 15 min
    upload: { windowMs: 3600000, maxRequests: 10 }   // 10 uploads por hora
};

const createRateLimit = (type) => {
    const config = rateLimitConfigs[type];
    return rateLimit(config.windowMs, config.maxRequests);
};

// Aplicar rate limits específicos
router.post('/api/login', createRateLimit('login'), loginHandler);
router.post('/api/upload', createRateLimit('upload'), uploadHandler);
```

## 🧪 Testing

### Estrutura de Testes

```javascript
// tests/unit/user-service.test.js
const { expect } = require('chai');
const UserService = require('../../services/user-service');

describe('UserService', () => {
    describe('validateEmail', () => {
        it('deve validar email correto', () => {
            const result = UserService.validateEmail('test@example.com');
            expect(result).to.be.true;
        });
        
        it('deve rejeitar email inválido', () => {
            const result = UserService.validateEmail('invalid-email');
            expect(result).to.be.false;
        });
    });
});

// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../server');

describe('Authentication', () => {
    it('deve fazer login com credenciais válidas', async () => {
        const response = await request(app)
            .post('/api/login')
            .send({
                email: 'test@example.com',
                senha: 'password123'
            });
            
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('token');
    });
});
```

### Testes Frontend

```javascript
// tests/frontend/form-validation.test.js
describe('Form Validation', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <form id="test-form">
                <input type="email" id="email" required>
                <input type="password" id="password" required>
            </form>
        `;
        FormValidator.init();
    });
    
    it('deve validar email obrigatório', () => {
        const emailInput = document.getElementById('email');
        emailInput.value = '';
        
        const isValid = FormValidator.validateField(emailInput);
        expect(isValid).to.be.false;
    });
});
```

## 🚀 Deployment

### Ambiente de Produção

```bash
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 5000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: transporte_escolar
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

### Configuração Nginx

```nginx
# nginx.conf
server {
    listen 80;
    server_name exemplo.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name exemplo.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Banco
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar logs
sudo journalctl -u postgresql

# Testar conexão
psql -h localhost -U postgres -d transporte_escolar
```

#### 2. Problemas de CORS
```javascript
// Verificar configuração CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
```

#### 3. Token JWT Expirado
```javascript
// Implementar refresh token
const refreshToken = async (oldToken) => {
    try {
        const decoded = jwt.verify(oldToken, JWT_SECRET, { ignoreExpiration: true });
        const newToken = jwt.sign(
            { id: decoded.id, email: decoded.email },
            JWT_SECRET,
            { expiresIn: '2h' }
        );
        return newToken;
    } catch (error) {
        throw new Error('Token inválido');
    }
};
```

### Logs e Monitoramento

```javascript
// logger.js - Sistema de logs estruturado
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

module.exports = logger;
```

### Performance Monitoring

```javascript
// middleware/performance.js
const performanceMiddleware = async (ctx, next) => {
    const start = Date.now();
    
    await next();
    
    const duration = Date.now() - start;
    
    // Log requisições lentas
    if (duration > 1000) {
        console.warn(`Requisição lenta: ${ctx.method} ${ctx.url} - ${duration}ms`);
    }
    
    // Adicionar header de tempo de resposta
    ctx.set('X-Response-Time', `${duration}ms`);
};
```

---

## 📚 Recursos Adicionais

- [Documentação do Koa.js](https://koajs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

**Mantenha este guia atualizado conforme o projeto evolui!**