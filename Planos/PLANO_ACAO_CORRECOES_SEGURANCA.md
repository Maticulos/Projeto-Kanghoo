# 🔒 PLANO DE AÇÃO: CORREÇÕES DE SEGURANÇA CRÍTICAS

## 📋 OBJETIVO
Implementar correções de segurança críticas identificadas na varredura, mantendo a integridade do esquema de dados de teste e todas as ferramentas existentes do sistema.

---

## 🎯 PRINCÍPIOS DE IMPLEMENTAÇÃO

### ✅ Garantias
- **Preservação de dados**: Nenhum dado de teste será perdido
- **Compatibilidade**: Todas as funcionalidades existentes continuarão funcionando
- **Backward compatibility**: Mudanças não quebrarão integrações existentes
- **Ambiente de teste**: Funcionalidades de desenvolvimento/teste serão mantidas com proteções adequadas

### ⚠️ Estratégia
1. **Correções graduais**: Implementar em fases para validar cada mudança
2. **Flags de ambiente**: Usar variáveis de ambiente para controlar comportamentos
3. **Validação rigorosa**: Testar cada correção antes de avançar
4. **Documentação**: Documentar todas as mudanças e configurações necessárias

---

## 📊 PRIORIZAÇÃO DAS CORREÇÕES

### 🔴 FASE 1: CRÍTICAS - URGENTE (Implementar Imediatamente)
**Duração estimada:** 2-3 dias

#### 1.1. Remover Fallback de Senha em Texto Plano
**Arquivo:** `teste/server/controllers/auth.controller.js`
**Severidade:** 🔴 CRÍTICA
**Impacto:** Permite bypass de segurança de senhas

**Ação:**
- Remover completamente o fallback de comparação em texto plano
- Adicionar migração para garantir que todas as senhas no banco sejam hasheadas
- Implementar validação que detecta senhas não-hasheadas e força rehash
- Manter apenas validação via bcrypt

**Código atual (linhas 32-33):**
```javascript
// REMOVER ESTE CÓDIGO:
if (!ok) ok = String(user.senha) === String(senha);
```

**Código corrigido:**
```javascript
// Apenas bcrypt, sem fallback
if (!ok) {
  ctx.status = 401;
  return send(ctx, validationError(['Credenciais inválidas'], 'Falha na autenticação'));
}
```

**Migração de dados:**
- Criar script para identificar e re-hashear senhas em texto plano (apenas em desenvolvimento/teste)
- Em produção, forçar reset de senha para usuários com senhas não-hasheadas

---

#### 1.2. Corrigir Token de Desenvolvimento Hardcoded
**Arquivo:** `teste/server/middleware/auth-utils.js`
**Severidade:** 🔴 CRÍTICA
**Impacto:** Bypass de autenticação em produção se NODE_ENV não estiver configurado

**Ação:**
- Manter token de desenvolvimento APENAS em ambiente de desenvolvimento explícito
- Adicionar validação adicional que verifica múltiplas condições
- Adicionar logging de segurança quando token de dev é usado
- Criar variável de ambiente específica para habilitar token de dev

**Código atual (linhas 34-44):**
```javascript
if (token === 'dev_token_responsavel_teste' && process.env.NODE_ENV !== 'production')
```

**Código corrigido:**
```javascript
// Token de desenvolvimento - APENAS se explicitamente habilitado
const DEV_TOKEN_ENABLED = process.env.ALLOW_DEV_TOKEN === 'true';
const DEV_TOKEN = process.env.DEV_TOKEN || 'dev_token_responsavel_teste';

if (token === DEV_TOKEN && DEV_TOKEN_ENABLED && process.env.NODE_ENV !== 'production') {
  // Log de segurança
  logger.warn('⚠️  Token de desenvolvimento usado', {
    ip: ctx.ip,
    path: ctx.path,
    timestamp: new Date().toISOString()
  });
  
  ctx.user = {
    id: 1,
    email: 'ana.responsavel@teste.kanghoo.com',
    tipo: 'responsavel',
    nome: 'Responsável Teste'
  };
  await next();
  return;
}
```

**Configuração necessária:**
- Adicionar `ALLOW_DEV_TOKEN=false` no `.env` de produção
- Adicionar `ALLOW_DEV_TOKEN=true` no `.env.local` de desenvolvimento

---

#### 1.3. Corrigir JWT_SECRET Aleatório
**Arquivo:** `teste/server/config/security-config.js`
**Severidade:** 🔴 CRÍTICA
**Impacto:** Tokens inválidos a cada restart em desenvolvimento

**Ação:**
- Gerar JWT_SECRET persistente em desenvolvimento (salvar em arquivo)
- Validar obrigatoriedade em produção
- Criar script de geração de JWT_SECRET seguro

**Código atual (linhas 36-46):**
```javascript
return 'temp_key_' + Math.random().toString(36).substring(2, 15);
```

**Código corrigido:**
```javascript
secret: (() => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET é obrigatório em produção');
    }
    
    // Em desenvolvimento, usar chave persistente de arquivo
    const fs = require('fs');
    const path = require('path');
    const secretFile = path.join(__dirname, '../../.jwt-secret-dev');
    
    try {
      // Tentar ler chave existente
      if (fs.existsSync(secretFile)) {
        const existingSecret = fs.readFileSync(secretFile, 'utf8').trim();
        if (existingSecret) {
          logger.info('Usando JWT_SECRET persistente de desenvolvimento');
          return existingSecret;
        }
      }
      
      // Gerar nova chave e salvar
      const crypto = require('crypto');
      const newSecret = 'dev_' + crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(secretFile, newSecret, { mode: 0o600 }); // Permissões restritas
      logger.warn('⚠️  Novo JWT_SECRET de desenvolvimento gerado e salvo');
      return newSecret;
    } catch (error) {
      logger.error('Erro ao gerenciar JWT_SECRET de desenvolvimento:', error);
      throw new Error('Não foi possível configurar JWT_SECRET. Configure JWT_SECRET no .env');
    }
  }
  return s;
})(),
```

**Arquivo a adicionar ao .gitignore:**
```
.jwt-secret-dev
```

---

#### 1.4. Adicionar Helmet nas Dependências
**Arquivo:** `teste/server/package.json`
**Severidade:** 🟡 MÉDIA (mas crítico para produção)
**Impacto:** Middleware de segurança não funciona em produção

**Ação:**
- Adicionar `helmet` como dependência de produção
- Verificar se o código já está preparado para usar helmet

**Comando:**
```bash
cd teste/server && npm install helmet --save
```

**Verificação:**
- O código em `security-middleware.js` já importa helmet
- Apenas precisa estar instalado

---

### 🟡 FASE 2: IMPORTANTES - Implementar em Breve
**Duração estimada:** 3-4 dias

#### 2.1. Implementar Tratamento de Erros do Pool de Conexões
**Arquivo:** `teste/server/config/db.js`
**Severidade:** 🟡 MÉDIA
**Impacto:** Conexões quebradas não são tratadas adequadamente

**Ação:**
- Adicionar event listeners para erros do pool
- Implementar reconexão automática
- Adicionar health check do pool
- Logging adequado de erros

**Código a adicionar:**
```javascript
const pool = new Pool(poolConfig);

// Event listeners para tratamento de erros
pool.on('error', (err, client) => {
  logger.error('Erro inesperado no pool de conexões PostgreSQL:', {
    error: err.message,
    stack: err.stack,
    client: client ? 'client exists' : 'no client'
  });
  
  // Não encerrar o processo, apenas logar
  // O pool tentará reconectar automaticamente
});

pool.on('connect', (client) => {
  logger.info('Nova conexão PostgreSQL estabelecida');
});

pool.on('remove', (client) => {
  logger.info('Conexão PostgreSQL removida do pool');
});

// Health check do pool
async function checkPoolHealth() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    logger.error('Health check do pool falhou:', error);
    return { healthy: false, error: error.message };
  }
}

// Verificar saúde do pool periodicamente (a cada 5 minutos)
setInterval(async () => {
  const health = await checkPoolHealth();
  if (!health.healthy) {
    logger.warn('Pool de conexões não está saudável:', health);
  }
}, 5 * 60 * 1000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exportar pool para acesso direto se necessário
  checkPoolHealth
};
```

---

#### 2.2. Melhorar Rate Limiting Sem Redis
**Arquivo:** `teste/server/middleware/security-middleware.js`
**Severidade:** 🟡 MÉDIA
**Impacto:** Sem proteção contra brute force/DDoS sem Redis

**Ação:**
- Implementar fallback em memória para rate limiting
- Adicionar aviso claro quando Redis não está disponível
- Documentar limitações do fallback em memória

**Código a modificar (linhas 134-138):**
```javascript
function generalRateLimit() {
  if (!redisClient) {
    logger.warn('⚠️  Redis não configurado. Usando rate limiting em memória (limitado a este processo)');
    
    // Fallback em memória usando Map
    const memoryStore = new Map();
    
    return rateLimit({
      driver: 'memory',
      db: memoryStore,
      duration: SECURITY_CONFIG.rateLimit.general.duration,
      errorMessage: SECURITY_CONFIG.rateLimit.general.message,
      id: (ctx) => ctx.ip,
      headers: {
        remaining: 'Rate-Limit-Remaining',
        reset: 'Rate-Limit-Reset',
        total: 'Rate-Limit-Total'
      },
      max: SECURITY_CONFIG.rateLimit.general.max,
      disableHeader: false,
      whitelist: (ctx) => {
        const allowedIPs = (process.env.ALLOWED_IPS || '127.0.0.1').split(',');
        return allowedIPs.includes(ctx.ip);
      }
    });
  }
  
  // ... código existente com Redis
}
```

**Aplicar mesma lógica para:**
- `loginRateLimit()`
- `apiRateLimit()`

---

#### 2.3. Revisar e Restringir CORS
**Arquivo:** `teste/server/app.js`
**Severidade:** 🟡 MÉDIA
**Impacto:** Permite qualquer origem se NODE_ENV não estiver configurado

**Ação:**
- Melhorar validação de ambiente
- Adicionar lista padrão segura de origens
- Validar CORS_ORIGINS obrigatório em produção

**Código atual (linhas 50-73):**
```javascript
: (isProd ? [] : ['*']);
```

**Código corrigido:**
```javascript
function buildCorsOptions() {
  // Detectar ambiente de forma mais robusta
  const isProd = process.env.NODE_ENV === 'production' || 
                 process.env.NODE_ENV === 'prod' ||
                 process.env.ENVIRONMENT === 'production';
  
  const fromEnv = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '').trim();
  
  let origins;
  if (fromEnv) {
    origins = fromEnv.split(',').map(s => s.trim()).filter(Boolean);
  } else if (isProd) {
    // Em produção SEM CORS_ORIGINS configurado, usar lista padrão restritiva
    logger.warn('⚠️  CORS_ORIGINS não configurado em produção. Usando lista padrão restritiva.');
    origins = [
      'https://kanghoo.com',
      'https://www.kanghoo.com'
    ];
  } else {
    // Desenvolvimento: permitir localhost e IPs locais
    origins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5000'
    ];
  }

  const originFn = (ctx) => {
    if (!isProd) {
      const reqOrigin = ctx.get('Origin');
      // Em desenvolvimento, permitir se estiver na lista ou se for localhost
      if (origins.includes('*') || origins.includes(reqOrigin) || 
          (reqOrigin && reqOrigin.includes('localhost'))) {
        return reqOrigin || '*';
      }
    }
    
    const reqOrigin = ctx.get('Origin');
    if (origins.includes(reqOrigin)) {
      return reqOrigin;
    }
    
    // Bloquear se não estiver na lista
    logger.warn(`CORS bloqueado para origem: ${reqOrigin}`, {
      ip: ctx.ip,
      path: ctx.path
    });
    return null; // Bloqueia
  };

  return {
    origin: originFn,
    allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowHeaders: ['Content-Type','Authorization','Accept'],
    credentials: true,
    maxAge: 86400 // 24 horas
  };
}
```

---

#### 2.4. Melhorar CSP Removendo unsafe-inline e unsafe-eval
**Arquivo:** `teste/server/config/security-config.js` e `teste/server/middleware/security-middleware.js`
**Severidade:** 🟡 MÉDIA
**Impacto:** Desabilita proteções XSS do CSP

**Ação:**
- Remover `unsafe-inline` e `unsafe-eval` do CSP
- Usar nonces para scripts inline necessários
- Mover scripts inline para arquivos externos
- Testar todas as funcionalidades após mudança

**Estratégia:**
1. Identificar todos os scripts inline no frontend
2. Mover para arquivos externos
3. Implementar sistema de nonces se necessário
4. Atualizar CSP gradualmente

**Código a modificar:**
```javascript
// Em security-config.js
csp: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      // Remover 'unsafe-inline' e 'unsafe-eval'
      "https://maps.googleapis.com",
      "https://maps.gstatic.com",
      "https://cdn.jsdelivr.net"
    ],
    // ... resto das diretivas
  }
}
```

**Nota:** Esta correção requer mudanças no frontend também. Implementar em conjunto com equipe frontend.

---

### 🟢 FASE 3: MELHORIAS - Implementar Quando Possível
**Duração estimada:** 2-3 dias

#### 3.1. Melhorar Senha do Redis no Docker
**Arquivo:** `teste/docker-compose.yml`
**Severidade:** 🟡 MÉDIA
**Impacto:** Senha padrão fraca se REDIS_PASSWORD não estiver configurado

**Ação:**
- Validar que REDIS_PASSWORD está configurado em produção
- Gerar senha forte como padrão se não configurada
- Adicionar validação no startup

**Código a modificar (linha 81):**
```yaml
redis:
  image: redis:7-alpine
  container_name: transporte-escolar-redis
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-${REDIS_AUTO_PASSWORD}}
  # ... resto da configuração
```

**Adicionar script de validação:**
```javascript
// Em scripts/validate-env.js
function validateRedisPassword() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.REDIS_PASSWORD || process.env.REDIS_PASSWORD.length < 16) {
      throw new Error('REDIS_PASSWORD deve ter pelo menos 16 caracteres em produção');
    }
  }
}
```

---

#### 3.2. Melhorar Tratamento de Erros de Limpeza de Arquivos
**Arquivo:** `teste/server/app.js`
**Severidade:** 🟢 BAIXA
**Impacto:** Erros na limpeza são ignorados silenciosamente

**Ação:**
- Adicionar logging adequado
- Implementar retry logic
- Notificar administradores em caso de falhas repetidas

**Código atual (linhas 141-143):**
```javascript
try { cleanupOldFiles(24); } catch(e) { /* noop */ }
```

**Código corrigido:**
```javascript
async function performCleanup() {
  try {
    const result = await cleanupOldFiles(24);
    logger.info('Limpeza de arquivos antigos concluída', {
      filesRemoved: result?.filesRemoved || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro na limpeza de arquivos antigos:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Se falhar 3 vezes consecutivas, alertar
    cleanupErrorCount = (cleanupErrorCount || 0) + 1;
    if (cleanupErrorCount >= 3) {
      logger.error('⚠️  Limpeza de arquivos falhou 3 vezes consecutivas. Verificar sistema de arquivos.');
      // Aqui poderia enviar notificação para administradores
    }
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
let cleanupErrorCount = 0;

setInterval(performCleanup, DAY_MS);
// Executar imediatamente na inicialização
setTimeout(performCleanup, 60000); // Após 1 minuto
```

---

#### 3.3. Melhorar Proteção de WebSocket
**Arquivo:** `teste/server/realtime/realtime-server.js`
**Severidade:** 🟡 MÉDIA
**Impacto:** null permite conexões diretas sem origem

**Ação:**
- Remover `null` da lista de origens permitidas
- Validar origem em todas as conexões
- Adicionar logging de conexões rejeitadas

**Código atual (linha 118):**
```javascript
allowedOrigins: ['http://localhost:3000', 'http://localhost:3001', null],
```

**Código corrigido:**
```javascript
allowedOrigins: (() => {
  const envOrigins = process.env.WS_ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // Padrão baseado no ambiente
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://kanghoo.com',
      'https://www.kanghoo.com'
    ];
  }
  
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];
})(),
```

---

#### 3.4. Melhorar Tratamento de Métricas Prometheus
**Arquivo:** `teste/server/app.js`
**Severidade:** 🟢 BAIXA
**Impacto:** Falhas silenciosas de métricas

**Ação:**
- Adicionar logging quando métricas não estão disponíveis
- Implementar fallback graceful
- Documentar dependência opcional

**Código atual (linhas 127-137):**
```javascript
try {
  const metrics = require('./utils/metrics');
  // ...
} catch (_err) {
  // prom-client não instalado; ignorar
}
```

**Código corrigido:**
```javascript
let metricsAvailable = false;
try {
  const metrics = require('./utils/metrics');
  metricsAvailable = true;
  
  const metricsRouter = new Router();
  metricsRouter.get('/metrics', async (ctx) => {
    try {
      ctx.set('Content-Type', metrics.contentType);
      ctx.body = await metrics.getMetrics();
    } catch (error) {
      logger.error('Erro ao obter métricas:', error);
      ctx.status = 503;
      ctx.body = '# Métricas temporariamente indisponíveis\n';
    }
  });
  app.use(metricsRouter.routes());
  
  logger.info('Métricas Prometheus habilitadas');
} catch (err) {
  logger.warn('Métricas Prometheus não disponíveis (prom-client não instalado). Funcionalidade desabilitada.');
  metricsAvailable = false;
}
```

---

## 📝 VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE

### Script de Validação
Criar arquivo `teste/server/scripts/validate-env.js`:

```javascript
const logger = require('../utils/logger');

function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const isProd = process.env.NODE_ENV === 'production';

  // Validações obrigatórias em produção
  if (isProd) {
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET é obrigatório em produção');
    }
    
    if (!process.env.REDIS_PASSWORD || process.env.REDIS_PASSWORD.length < 16) {
      errors.push('REDIS_PASSWORD deve ter pelo menos 16 caracteres em produção');
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
```

**Integrar no `server.js`:**
```javascript
// No início do server.js, após carregar dotenv
const { validateEnvironment } = require('./scripts/validate-env');
validateEnvironment();
```

---

## 🔄 CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1: Fase 1 (Críticas)
- **Dia 1-2:** Correções 1.1, 1.2, 1.3
- **Dia 3:** Correção 1.4 + Testes
- **Dia 4-5:** Validação completa e ajustes

### Semana 2: Fase 2 (Importantes)
- **Dia 1-2:** Correções 2.1, 2.2
- **Dia 3:** Correções 2.3, 2.4 (início)
- **Dia 4-5:** Finalização 2.4 + Testes integrados

### Semana 3: Fase 3 (Melhorias)
- **Dia 1-2:** Correções 3.1, 3.2, 3.3
- **Dia 3:** Correção 3.4 + Script de validação
- **Dia 4-5:** Testes finais e documentação

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Após cada fase:
- [ ] Todos os testes existentes passam
- [ ] Dados de teste preservados
- [ ] Funcionalidades existentes funcionam
- [ ] Logs de segurança funcionando
- [ ] Documentação atualizada

### Testes específicos:
- [ ] Login funciona com senhas hasheadas
- [ ] Token de desenvolvimento funciona apenas quando habilitado
- [ ] JWT_SECRET persistente em desenvolvimento
- [ ] Rate limiting funciona com e sem Redis
- [ ] CORS bloqueia origens não autorizadas
- [ ] Pool de conexões se recupera de erros
- [ ] WebSocket valida origens corretamente

---

## 📚 DOCUMENTAÇÃO NECESSÁRIA

### Arquivos a criar/atualizar:
1. **`.env.example`** - Template com todas as variáveis necessárias
2. **`SECURITY_CONFIG.md`** - Documentação de configurações de segurança
3. **`MIGRATION_GUIDE.md`** - Guia de migração para as mudanças
4. **`CHANGELOG.md`** - Registro de todas as mudanças

---

## 🚨 PONTOS DE ATENÇÃO

### ⚠️ Breaking Changes Potenciais:
1. **Senhas em texto plano**: Usuários com senhas não-hasheadas precisarão resetar senha
2. **Token de desenvolvimento**: Requer configuração explícita via `ALLOW_DEV_TOKEN`
3. **CORS**: Pode bloquear requisições de origens não configuradas

### 🔄 Rollback Plan:
- Manter branch com código anterior
- Scripts de rollback para cada mudança crítica
- Backup de configurações antes de mudanças

---

## 📞 SUPORTE E MONITORAMENTO

### Após implementação:
- Monitorar logs de segurança por 1 semana
- Verificar métricas de erro
- Validar que nenhuma funcionalidade foi quebrada
- Coletar feedback da equipe

---

**Documento criado em:** 2025-01-XX  
**Versão:** 1.0  
**Autor:** Assistente IA (baseado em análise de segurança)

