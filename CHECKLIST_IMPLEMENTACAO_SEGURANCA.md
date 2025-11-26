# ✅ CHECKLIST DE IMPLEMENTAÇÃO: CORREÇÕES DE SEGURANÇA

## 📋 INSTRUÇÕES DE USO

Marque cada item conforme for implementado e testado. Use este checklist para acompanhar o progresso das correções.

---

## 🔴 FASE 1: CORREÇÕES CRÍTICAS (URGENTE)

### 1.1 Remover Fallback de Senha em Texto Plano
- [ ] Fazer backup do arquivo `teste/server/controllers/auth.controller.js`
- [ ] Remover linha 33: `if (!ok) ok = String(user.senha) === String(senha);`
- [ ] Adicionar validação que apenas usa bcrypt
- [ ] Criar script de migração para identificar senhas não-hasheadas
- [ ] Testar login com senha hasheada (deve funcionar)
- [ ] Testar login com senha em texto plano (deve falhar)
- [ ] Verificar logs de erro são adequados
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/controllers/auth.controller.js`  
**Linhas:** 32-33

---

### 1.2 Corrigir Token de Desenvolvimento
- [ ] Fazer backup do arquivo `teste/server/middleware/auth-utils.js`
- [ ] Modificar validação do token de dev (linhas 34-44)
- [ ] Adicionar verificação de `ALLOW_DEV_TOKEN`
- [ ] Adicionar logging de segurança quando token de dev é usado
- [ ] Adicionar `ALLOW_DEV_TOKEN=false` no `.env` de produção
- [ ] Adicionar `ALLOW_DEV_TOKEN=true` no `.env.local` de desenvolvimento
- [ ] Testar token de dev em desenvolvimento (deve funcionar)
- [ ] Testar token de dev em produção (deve falhar)
- [ ] Verificar logs de segurança são gerados
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/middleware/auth-utils.js`  
**Linhas:** 34-44

---

### 1.3 Corrigir JWT_SECRET Aleatório
- [ ] Fazer backup do arquivo `teste/server/config/security-config.js`
- [ ] Modificar função de geração de JWT_SECRET (linhas 36-46)
- [ ] Implementar leitura/escrita de arquivo `.jwt-secret-dev`
- [ ] Adicionar `.jwt-secret-dev` ao `.gitignore`
- [ ] Testar que JWT_SECRET persiste entre restarts
- [ ] Testar que tokens continuam válidos após restart
- [ ] Verificar permissões do arquivo (0o600)
- [ ] Validar que produção exige JWT_SECRET no .env
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/config/security-config.js`  
**Linhas:** 36-46

---

### 1.4 Adicionar Helmet nas Dependências
- [ ] Executar `cd teste/server && npm install helmet --save`
- [ ] Verificar que `helmet` aparece em `package.json`
- [ ] Verificar que `node_modules/helmet` existe
- [ ] Testar que servidor inicia sem erros
- [ ] Verificar que headers de segurança são aplicados
- [ ] Testar em ambiente de desenvolvimento
- [ ] Testar em ambiente de produção
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/package.json`

---

## 🟡 FASE 2: CORREÇÕES IMPORTANTES

### 2.1 Tratamento de Erros do Pool de Conexões
- [ ] Fazer backup do arquivo `teste/server/config/db.js`
- [ ] Adicionar event listeners para `error`, `connect`, `remove`
- [ ] Implementar função `checkPoolHealth()`
- [ ] Adicionar verificação periódica de saúde (5 minutos)
- [ ] Testar desconexão forçada do banco (deve logar erro)
- [ ] Testar reconexão automática
- [ ] Verificar logs de erro são adequados
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/config/db.js`

---

### 2.2 Rate Limiting Sem Redis
- [ ] Fazer backup do arquivo `teste/server/middleware/security-middleware.js`
- [ ] Modificar `generalRateLimit()` (linhas 134-138)
- [ ] Implementar fallback em memória usando Map
- [ ] Modificar `loginRateLimit()` com mesmo fallback
- [ ] Modificar `apiRateLimit()` com mesmo fallback
- [ ] Testar rate limiting sem Redis (deve funcionar)
- [ ] Testar rate limiting com Redis (deve funcionar)
- [ ] Verificar logs de aviso quando Redis não está disponível
- [ ] Documentar limitações do fallback em memória
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/middleware/security-middleware.js`  
**Linhas:** 134-138, 164-178, 183-197

---

### 2.3 Revisar e Restringir CORS
- [ ] Fazer backup do arquivo `teste/server/app.js`
- [ ] Modificar função `buildCorsOptions()` (linhas 50-73)
- [ ] Melhorar detecção de ambiente de produção
- [ ] Adicionar lista padrão restritiva para produção
- [ ] Adicionar lista padrão para desenvolvimento
- [ ] Adicionar logging quando CORS bloqueia requisição
- [ ] Testar requisição de origem autorizada (deve funcionar)
- [ ] Testar requisição de origem não autorizada (deve bloquear)
- [ ] Verificar logs de bloqueio CORS
- [ ] Atualizar `.env.example` com `CORS_ORIGINS`
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/app.js`  
**Linhas:** 50-73

---

### 2.4 Melhorar CSP
- [ ] Identificar todos os scripts inline no frontend
- [ ] Mover scripts inline para arquivos externos
- [ ] Remover `'unsafe-inline'` de `script-src` em `security-config.js`
- [ ] Remover `'unsafe-eval'` de `script-src` em `security-config.js`
- [ ] Testar todas as funcionalidades do frontend
- [ ] Verificar que Google Maps ainda funciona
- [ ] Verificar que Leaflet ainda funciona
- [ ] Implementar nonces se necessário
- [ ] Testar em diferentes navegadores
- [ ] Documentar mudança no CHANGELOG

**Arquivos:** 
- `teste/server/config/security-config.js:25`
- `teste/server/middleware/security-middleware.js:39-46`
- Frontend (scripts inline)

---

## 🟢 FASE 3: MELHORIAS

### 3.1 Melhorar Senha do Redis
- [ ] Fazer backup do arquivo `teste/docker-compose.yml`
- [ ] Adicionar validação de REDIS_PASSWORD em produção
- [ ] Criar script de geração de senha forte
- [ ] Atualizar `.env.example` com REDIS_PASSWORD
- [ ] Testar que Redis inicia com senha forte
- [ ] Testar que aplicação conecta ao Redis com senha
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/docker-compose.yml:81`

---

### 3.2 Melhorar Limpeza de Arquivos
- [ ] Fazer backup do arquivo `teste/server/app.js`
- [ ] Modificar função de limpeza (linhas 141-143)
- [ ] Adicionar logging de sucesso e erro
- [ ] Implementar contador de erros consecutivos
- [ ] Adicionar alerta após 3 falhas consecutivas
- [ ] Testar limpeza manual
- [ ] Testar que erros são logados adequadamente
- [ ] Verificar logs de limpeza
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/app.js`  
**Linhas:** 141-143

---

### 3.3 Melhorar Proteção de WebSocket
- [ ] Fazer backup do arquivo `teste/server/realtime/realtime-server.js`
- [ ] Remover `null` da lista de origens permitidas (linha 118)
- [ ] Implementar lista de origens baseada em ambiente
- [ ] Adicionar validação de origem em todas as conexões
- [ ] Adicionar logging de conexões rejeitadas
- [ ] Testar conexão WebSocket de origem autorizada
- [ ] Testar conexão WebSocket de origem não autorizada (deve falhar)
- [ ] Verificar logs de conexões rejeitadas
- [ ] Atualizar `.env.example` com `WS_ALLOWED_ORIGINS`
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/realtime/realtime-server.js`  
**Linha:** 118

---

### 3.4 Melhorar Métricas Prometheus
- [ ] Fazer backup do arquivo `teste/server/app.js`
- [ ] Modificar bloco try-catch de métricas (linhas 127-137)
- [ ] Adicionar flag `metricsAvailable`
- [ ] Adicionar logging quando métricas não estão disponíveis
- [ ] Adicionar tratamento de erro no endpoint `/metrics`
- [ ] Testar endpoint `/metrics` com prom-client instalado
- [ ] Testar endpoint `/metrics` sem prom-client (deve retornar 503)
- [ ] Verificar logs de métricas
- [ ] Documentar mudança no CHANGELOG

**Arquivo:** `teste/server/app.js`  
**Linhas:** 127-137

---

## 📝 TAREFAS GERAIS

### Script de Validação de Ambiente
- [ ] Criar arquivo `teste/server/scripts/validate-env.js`
- [ ] Implementar validação de variáveis obrigatórias
- [ ] Implementar validação de variáveis opcionais
- [ ] Adicionar logging de erros e avisos
- [ ] Integrar validação no `server.js`
- [ ] Testar validação com variáveis faltando
- [ ] Testar validação com variáveis corretas
- [ ] Documentar uso do script

---

### Documentação
- [ ] Criar/atualizar `.env.example` com todas as variáveis
- [ ] Criar `SECURITY_CONFIG.md` com configurações de segurança
- [ ] Criar `MIGRATION_GUIDE.md` com guia de migração
- [ ] Atualizar `CHANGELOG.md` com todas as mudanças
- [ ] Atualizar `README.md` com instruções de segurança
- [ ] Documentar breaking changes (se houver)

---

### Testes Finais
- [ ] Executar todos os testes existentes
- [ ] Verificar que dados de teste estão preservados
- [ ] Testar todas as funcionalidades principais
- [ ] Testar login/logout
- [ ] Testar autenticação de API
- [ ] Testar rate limiting
- [ ] Testar CORS
- [ ] Testar WebSocket
- [ ] Testar em ambiente de desenvolvimento
- [ ] Testar em ambiente de produção (staging)

---

### Validação de Segurança
- [ ] Verificar que senhas não podem ser comparadas em texto plano
- [ ] Verificar que token de dev não funciona em produção
- [ ] Verificar que JWT_SECRET é persistente
- [ ] Verificar que rate limiting funciona
- [ ] Verificar que CORS bloqueia origens não autorizadas
- [ ] Verificar que WebSocket valida origens
- [ ] Verificar que headers de segurança são aplicados
- [ ] Verificar que CSP está ativo (se habilitado)

---

## 📊 PROGRESSO GERAL

**Fase 1 (Críticas):** [ ] 0/4 completas  
**Fase 2 (Importantes):** [ ] 0/4 completas  
**Fase 3 (Melhorias):** [ ] 0/4 completas  
**Tarefas Gerais:** [ ] 0/3 completas

**Total:** [ ] 0/15 correções implementadas

---

## 🚨 NOTAS IMPORTANTES

1. **Sempre faça backup** antes de modificar arquivos
2. **Teste cada correção isoladamente** antes de avançar
3. **Valide em ambiente de desenvolvimento** antes de produção
4. **Documente todas as mudanças** no CHANGELOG
5. **Monitore logs** após cada implementação

---

**Última atualização:** [Data]  
**Responsável:** [Nome]

