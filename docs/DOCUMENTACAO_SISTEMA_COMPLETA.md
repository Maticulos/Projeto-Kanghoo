# 📚 DOCUMENTAÇÃO COMPLETA DO SISTEMA

## 🎯 Visão Geral do Sistema

Sistema completo de transporte escolar com rastreamento em tempo real, desenvolvido com Node.js, Koa.js e PostgreSQL. O sistema oferece funcionalidades para motoristas escolares, responsáveis e administradores, com foco em segurança e monitoramento de crianças.

### 🏗️ Arquitetura do Sistema

```
📁 Sistema de Transporte Escolar
├── 🖥️ Backend (Node.js + Koa.js)
│   ├── 🔌 APIs RESTful
│   ├── 🌐 WebSocket (Tempo Real)
│   ├── 🗄️ PostgreSQL Database
│   ├── 🔐 Sistema de Autenticação JWT
│   ├── 📝 Sistema de Logging Configurável
│   ├── 🔧 Constantes Centralizadas
│   └── 🛡️ Middleware de Segurança
├── 🌐 Frontend (HTML5 + JavaScript)
│   ├── 📱 Interface Responsiva
│   ├── 🗺️ Integração Google Maps
│   ├── 🔔 Notificações em Tempo Real
│   ├── 📦 Assets Organizados e Otimizados
│   ├── 🎨 CSS Modular com Variáveis
│   └── ⚡ Bundle Minificado para Performance
└── 🔧 Ferramentas de Desenvolvimento
    ├── 🧪 Suite de Testes
    ├── 🔍 Ferramentas de Debug
    ├── 📊 Monitoramento
    └── 🚀 Build e Otimização Automatizada
```

---

## 🚀 GUIA DE INSTALAÇÃO E CONFIGURAÇÃO

### 📋 Pré-requisitos

- **Node.js** >= 16.0.0
- **PostgreSQL** >= 12.0
- **npm** ou **yarn**
- **Git**

### 🔧 Instalação

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd teste
```

2. **Instale as dependências:**
```bash
cd server
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transporte_escolar
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# Servidor
PORT=5000
NODE_ENV=development

# Segurança
JWT_SECRET=seu_jwt_secret_muito_seguro
BCRYPT_ROUNDS=12

# APIs Externas
GOOGLE_MAPS_API_KEY=sua_chave_google_maps
```

4. **Configure o banco de dados:**
```bash
# Criar tabelas
node scripts/criar-tabelas-completas.js

# Criar dados de teste (opcional)
node debug-tools.js create-test
```

5. **Inicie o servidor:**
```bash
npm start
# ou para desenvolvimento
npm run dev
```

### 🧪 Executar Testes

```bash
# Suite completa de testes
node test-suite.js

# Testes específicos
npm test
```

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### 📊 Tabelas Principais

#### 👥 usuarios
Armazena informações dos usuários do sistema.

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo_cadastro VARCHAR(50) NOT NULL,
    telefone VARCHAR(20),
    endereco TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 🛣️ rotas
Define as rotas dos motoristas.

```sql
CREATE TABLE rotas (
    id SERIAL PRIMARY KEY,
    motorista_id INTEGER REFERENCES usuarios(id),
    nome_rota VARCHAR(255) NOT NULL,
    origem VARCHAR(255),
    destino VARCHAR(255),
    horario_ida TIME,
    horario_volta TIME,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 👶 criancas
Informações das crianças cadastradas.

```sql
CREATE TABLE criancas (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email_responsavel VARCHAR(255) NOT NULL,
    idade VARCHAR(10),
    escola VARCHAR(255),
    endereco_embarque TEXT,
    endereco_desembarque TEXT,
    observacoes TEXT,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 🚌 viagens
Registra as viagens realizadas.

```sql
CREATE TABLE viagens (
    id SERIAL PRIMARY KEY,
    motorista_id INTEGER REFERENCES usuarios(id),
    rota_id INTEGER REFERENCES rotas(id),
    data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
    horario_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    horario_fim TIMESTAMP WITH TIME ZONE,
    tipo_viagem VARCHAR(50) DEFAULT 'ida',
    status VARCHAR(50) DEFAULT 'iniciada',
    distancia_total DECIMAL(8, 2),
    tempo_total INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 📍 localizacoes
Armazena pontos de rastreamento GPS.

```sql
CREATE TABLE localizacoes (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER REFERENCES viagens(id),
    motorista_id INTEGER REFERENCES usuarios(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude DECIMAL(8, 2),
    velocidade DECIMAL(5, 2),
    direcao INTEGER,
    precisao DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    endereco TEXT,
    tipo_ponto VARCHAR(50) DEFAULT 'tracking',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 DOCUMENTAÇÃO DAS APIs

### 🔐 Autenticação

Todas as rotas protegidas requerem token JWT:
```
Authorization: Bearer SEU_TOKEN_JWT
```

### 📱 APIs do Motorista Escolar

**Base URL:** `/api/motorista-escolar`

#### Listar Crianças
```http
GET /criancas
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "sucesso": true,
  "dados": [
    {
      "id": 1,
      "nome_completo": "Ana Silva",
      "idade": "8 anos",
      "escola": "Escola Municipal",
      "endereco_embarque": "Rua A, 123"
    }
  ]
}
```

#### Iniciar Viagem
```http
POST /iniciar-viagem
Authorization: Bearer {token}
Content-Type: application/json

{
  "rota_id": 1,
  "tipo_viagem": "ida"
}
```

#### Atualizar Localização
```http
POST /atualizar-localizacao
Authorization: Bearer {token}
Content-Type: application/json

{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "velocidade": 30,
  "direcao": 90
}
```

### 👨‍👩‍👧‍👦 APIs do Responsável

**Base URL:** `/api/responsavel`

#### Rastrear Criança
```http
GET /rastrear-crianca/:id
Authorization: Bearer {token}
```

#### Histórico de Viagens
```http
GET /historico-viagens/:crianca_id
Authorization: Bearer {token}
```

### 🗺️ APIs de Rastreamento

**Base URL:** `/api/tracking`

#### Localização Atual
```http
GET /localizacao-atual/:motorista_id
```

#### Histórico de Localizações
```http
GET /historico/:motorista_id?data_inicio=2024-01-01&data_fim=2024-01-31
```

---

## 🌐 SISTEMA DE TEMPO REAL (WebSocket)

### 🔌 Conexão WebSocket

```javascript
const ws = new WebSocket('ws://localhost:5000');

ws.onopen = function() {
    console.log('Conectado ao WebSocket');
    
    // Autenticar
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'seu_jwt_token'
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Mensagem recebida:', data);
};
```

### 📡 Tipos de Eventos

#### Atualização de Localização
```json
{
  "type": "location_update",
  "data": {
    "motorista_id": 1,
    "latitude": -23.5505,
    "longitude": -46.6333,
    "velocidade": 30,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Embarque/Desembarque
```json
{
  "type": "boarding_event",
  "data": {
    "crianca_id": 1,
    "tipo": "embarque",
    "localizacao": {
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "timestamp": "2024-01-15T07:30:00Z"
  }
}
```

#### Notificações
```json
{
  "type": "notification",
  "data": {
    "titulo": "Criança Embarcou",
    "mensagem": "Ana Silva embarcou no transporte",
    "tipo": "info",
    "timestamp": "2024-01-15T07:30:00Z"
  }
}
```

---

## 🔧 FERRAMENTAS DE DESENVOLVIMENTO

### 🧪 Suite de Testes (`test-suite.js`)

Script centralizado que executa todos os testes do sistema:

```bash
# Executar todos os testes
node test-suite.js

# Testes específicos disponíveis:
# - Conexão com banco de dados
# - Verificação de tabelas
# - Sistema de autenticação
# - Sistema de rastreamento
# - Testes de performance
# - Testes de segurança
```

**Exemplo de uso:**
```bash
cd server
node test-suite.js
```

**Saída esperada:**
```
🧪 [2024-01-15T10:30:00.000Z] Executando: Conexão com Banco de Dados
✅ [2024-01-15T10:30:01.000Z] Conexão com Banco de Dados - PASSOU
🧪 [2024-01-15T10:30:01.000Z] Executando: Verificação de Tabelas
✅ [2024-01-15T10:30:02.000Z] Verificação de Tabelas - PASSOU

📊 RELATÓRIO FINAL DE TESTES
Total de Testes: 8
✅ Passou: 8
❌ Falhou: 0
📈 Taxa de Sucesso: 100.0%
```

### 🔍 Ferramentas de Debug (`debug-tools.js`)

Script centralizado para debug e diagnóstico:

```bash
# Modo interativo
node debug-tools.js

# Comandos específicos
node debug-tools.js check              # Verificar conexão
node debug-tools.js tables             # Listar tabelas
node debug-tools.js analyze usuarios   # Analisar tabela específica
node debug-tools.js users              # Analisar usuários
node debug-tools.js tracking           # Analisar rastreamento
node debug-tools.js create-test        # Criar dados de teste
node debug-tools.js clean-test         # Limpar dados de teste
node debug-tools.js optimize           # Otimizar banco
```

**Menu Interativo:**
```
🔧 FERRAMENTAS DE DEBUG - MENU PRINCIPAL
==================================================
1. 📡 Verificar conexão com banco
2. 📋 Listar todas as tabelas
3. 🔍 Analisar tabela específica
4. 👥 Analisar usuários
5. 🗺️ Analisar rastreamento
6. 🧪 Criar dados de teste
7. 🗑️ Limpar dados de teste
8. ⚡ Otimizar banco de dados
9. 🚪 Sair
==================================================
```

---

## 🔒 SEGURANÇA

### 🛡️ Medidas Implementadas

1. **Autenticação JWT**
   - Tokens com expiração
   - Refresh tokens
   - Validação em todas as rotas protegidas

2. **Hash de Senhas**
   - bcrypt com 12 rounds
   - Salt automático

3. **Validação de Dados**
   - Sanitização de inputs
   - Validação de tipos
   - Proteção contra SQL injection

4. **Rate Limiting**
   - Limite de requisições por IP
   - Proteção contra ataques DDoS

5. **CORS Configurado**
   - Origens permitidas específicas
   - Headers controlados

### 🔐 Configurações de Segurança

```javascript
// Exemplo de configuração JWT
const jwtConfig = {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h',
    algorithm: 'HS256'
};

// Configuração bcrypt
const bcryptRounds = 12;
```

---

## 📊 MONITORAMENTO E LOGS

### 📈 Métricas do Sistema

O sistema coleta automaticamente:
- Número de conexões WebSocket ativas
- Latência do banco de dados
- Número de localizações processadas
- Tempo de resposta das APIs
- Erros e exceções

### 📝 Sistema de Logs

```javascript
// Exemplo de log estruturado
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Localização atualizada",
  "data": {
    "motorista_id": 1,
    "latitude": -23.5505,
    "longitude": -46.6333
  }
}
```

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### ❌ Problemas Comuns

#### 1. Erro de Conexão com Banco
```bash
# Verificar conexão
node debug-tools.js check

# Verificar variáveis de ambiente
cat .env
```

#### 2. WebSocket não Conecta
```bash
# Verificar se o servidor está rodando
curl http://localhost:5000/health

# Verificar logs do servidor
tail -f logs/server.log
```

#### 3. Testes Falhando
```bash
# Executar diagnóstico completo
node test-suite.js

# Verificar estrutura do banco
node debug-tools.js tables
```

### 🔧 Comandos de Manutenção

```bash
# Otimizar banco de dados
node debug-tools.js optimize

# Limpar dados antigos
node debug-tools.js clean-test

# Recriar tabelas (CUIDADO!)
node scripts/criar-tabelas-completas.js
```

---

## 📚 REFERÊNCIAS E RECURSOS

### 📖 Documentação Técnica

- [Node.js Documentation](https://nodejs.org/docs/)
- [Koa.js Guide](https://koajs.com/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### 🛠️ Ferramentas Utilizadas

- **Backend**: Node.js, Koa.js, PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Tempo Real**: WebSocket, Socket.IO
- **Mapas**: Google Maps API
- **Autenticação**: JWT, bcrypt
- **Testes**: Mocha, Chai
- **Monitoramento**: Custom logging system

### 📞 Suporte

Para suporte técnico ou dúvidas:
1. Consulte esta documentação
2. Execute as ferramentas de debug
3. Verifique os logs do sistema
4. Execute a suite de testes

---

## 🚀 MELHORIAS IMPLEMENTADAS

### 🖥️ Backend - Melhorias de Arquitetura

#### 📝 Sistema de Logging Configurável
- **Localização**: `server/utils/logger.js`
- **Funcionalidades**:
  - Múltiplos níveis de log (debug, info, warn, error)
  - Formatação consistente com timestamps
  - Configuração via variáveis de ambiente
  - Filtragem por nível de severidade
  - Logs estruturados para análise
  - Sanitização automática de dados sensíveis

#### 🔧 Centralização de Constantes
- **Localização**: `server/config/constants.js`
- **Constantes Organizadas**:
  - `USER_TYPES`: Tipos de usuário do sistema
  - `PAGINATION`: Configurações de paginação
  - `TRANSPORT_TYPES`: Tipos de transporte
  - `TRIP_STATUS`: Status de viagens
  - `NOTIFICATION_TYPES`: Tipos de notificação
  - `HTTP_STATUS`: Códigos de status HTTP
  - `FILE_CONFIG`: Configurações de arquivos
  - `CACHE_CONFIG`: Configurações de cache
  - `RATE_LIMIT`: Limites de requisições
  - `WEBSOCKET_CONFIG`: Configurações WebSocket
  - `SECURITY_CONFIG`: Configurações de segurança
  - `MESSAGES`: Mensagens padronizadas
  - `REGEX`: Expressões regulares reutilizáveis

#### 🧹 Remoção de Console.logs
- Substituição de `console.log` por sistema de logging estruturado
- Logs categorizados por contexto e severidade
- Melhor rastreabilidade e debugging

### 🌐 Frontend - Otimização de Assets

#### 📦 Reorganização de Arquivos
- **Nova Estrutura**:
  ```
  frontend/public/assets/
  ├── css/
  │   ├── core/          # CSS fundamental
  │   ├── components/    # Componentes reutilizáveis
  │   └── vendors/       # Bibliotecas externas
  ├── js/
  │   ├── core/          # JavaScript fundamental
  │   ├── components/    # Componentes reutilizáveis
  │   ├── animations/    # Animações
  │   ├── api/           # Integrações de API
  │   └── vendors/       # Bibliotecas externas
  └── images/            # Recursos visuais
  ```

#### ⚡ Otimização de Performance
- **Bundle Minificado**: CSS e JS concatenados e minificados
- **Cache Busting**: Versionamento automático de assets
- **Preload**: Carregamento otimizado de recursos críticos
- **Compressão**: Assets comprimidos para menor tamanho

#### 🎨 CSS Modular
- **Variáveis CSS**: Sistema de design tokens
- **Utilitários**: Classes reutilizáveis para espaçamento, cores, tipografia
- **Componentes**: Estilos modulares e reutilizáveis
- **Responsividade**: Design adaptativo para todos os dispositivos

#### 🔧 Build Automatizado
- **Script de Build**: `frontend/build-optimization.js`
- **Funcionalidades**:
  - Organização automática de arquivos
  - Concatenação e minificação
  - Atualização de referências HTML
  - Geração de manifesto de assets
  - Versionamento para cache

### 📊 Ferramentas de Debug Aprimoradas

#### 🧪 Sistema de Testes
- Suite completa de testes automatizados
- Testes de integração para APIs
- Validação de dados e segurança
- Cobertura de código

#### 🔍 Monitoramento
- Logs estruturados para análise
- Métricas de performance
- Rastreamento de erros
- Alertas automáticos

---

## 🔄 CHANGELOG

### Versão 1.1.0 (Atual)
- ✅ Sistema completo de rastreamento
- ✅ APIs RESTful implementadas
- ✅ WebSocket para tempo real
- ✅ Interface web responsiva
- ✅ Sistema de autenticação
- ✅ Ferramentas de debug e teste
- ✅ Documentação completa
- 🆕 **Sistema de logging configurável**
- 🆕 **Constantes centralizadas**
- 🆕 **Assets organizados e otimizados**
- 🆕 **CSS modular com variáveis**
- 🆕 **Build automatizado**
- 🆕 **Performance otimizada**

### Próximas Versões
- 🔄 Dashboard administrativo
- 🔄 Relatórios avançados
- 🔄 Notificações push
- 🔄 App mobile
- 🔄 Integração com APIs externas

---

*Documentação atualizada em: Janeiro 2024*
*Versão do Sistema: 1.0.0*