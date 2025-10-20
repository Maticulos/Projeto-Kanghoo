# 🔍 Guia da Suite de Verificação de Banco de Dados

## 📋 Visão Geral

A **Suite de Verificação** é um sistema centralizado que reúne todos os testes desenvolvidos durante nossa investigação de problemas de persistência de dados no PostgreSQL. Este sistema permite executar verificações completas ou específicas para diagnosticar problemas de banco de dados.

## 🎯 Funcionalidades Incluídas

### ✅ **Testes Implementados:**

1. **🔄 Teste de Isolamento de Transações**
   - Verifica se transações são commitadas corretamente
   - Testa visibilidade de dados antes e após commit
   - Valida isolamento entre conexões diferentes

2. **🔗 Teste de Isolamento de Conexões**
   - Testa múltiplas conexões simultâneas
   - Verifica visibilidade cruzada de dados
   - Valida funcionamento do pool de conexões

3. **📊 Monitoramento em Tempo Real**
   - Monitora mudanças no banco em tempo real
   - Detecta remoções automáticas de dados
   - Testa cadastro via API com monitoramento

4. **⚙️ Verificação de Triggers e Constraints**
   - Lista todos os triggers do banco
   - Verifica constraints problemáticas
   - Analisa foreign keys com CASCADE DELETE
   - Identifica procedures/functions suspeitas

## 🚀 Instruções de Execução

### 📦 **Pré-requisitos**

```bash
# 1. Certifique-se de estar no diretório correto
cd C:\Users\Mateus\Desktop\Teste Backend Koa\teste\server

# 2. Instale as dependências (se necessário)
npm install axios dotenv pg

# 3. Configure as variáveis de ambiente no arquivo .env
#    DATABASE_URL ou DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
```

### 🎮 **Modos de Execução**

#### 1️⃣ **EXECUÇÃO COMPLETA** (Todos os testes)
```bash
node test-verification-suite.js
```
**O que faz:**
- ✅ Executa todos os 4 testes sequencialmente
- ✅ Gera relatório completo
- ✅ Salva resultados em arquivo JSON
- ✅ Mostra estatísticas finais

---

#### 2️⃣ **EXECUÇÃO ESPECÍFICA** (Um teste por vez)

##### 🔄 **Teste de Transações:**
```bash
node test-verification-suite.js --test=transaction
```
**Verifica:**
- ✅ Início e commit de transações
- ✅ Visibilidade de dados na mesma conexão
- ✅ Isolamento entre conexões diferentes
- ✅ Persistência após commit

##### 🔗 **Teste de Conexões:**
```bash
node test-verification-suite.js --test=connection
```
**Verifica:**
- ✅ Múltiplas conexões simultâneas
- ✅ Inserção paralela de dados
- ✅ Visibilidade cruzada entre conexões
- ✅ Funcionamento do pool

##### 📊 **Monitoramento em Tempo Real:**
```bash
node test-verification-suite.js --test=monitor
```
**Verifica:**
- ✅ Cadastro via API HTTP
- ✅ Monitoramento contínuo (10 segundos)
- ✅ Detecção de remoções automáticas
- ✅ Persistência de dados

##### ⚙️ **Triggers e Constraints:**
```bash
node test-verification-suite.js --test=triggers
```
**Verifica:**
- ✅ Lista todos os triggers
- ✅ Identifica triggers problemáticos
- ✅ Analisa constraints CHECK
- ✅ Verifica foreign keys CASCADE

---

#### 3️⃣ **MODOS DE SAÍDA**

##### 🔍 **Modo Verboso** (Logs detalhados):
```bash
node test-verification-suite.js --verbose
```
**Mostra:**
- 🔍 Logs de debug detalhados
- 🔍 Informações de conexões
- 🔍 Queries executadas
- 🔍 Estados intermediários

##### 🤫 **Modo Silencioso** (Apenas resultados):
```bash
node test-verification-suite.js --quiet
```
**Mostra:**
- ✅ Apenas resultados finais
- ✅ Estatísticas de aprovação/falha
- ✅ Relatório resumido

##### 🔍 **Combinações:**
```bash
# Teste específico com logs detalhados
node test-verification-suite.js --test=monitor --verbose

# Teste específico silencioso
node test-verification-suite.js --test=transaction --quiet

# Execução completa silenciosa
node test-verification-suite.js --quiet
```

## 📊 Interpretação dos Resultados

### ✅ **Resultados de Sucesso**

```
✅ Teste de Isolamento de Transações: PASSOU
✅ Teste de Isolamento de Conexões: PASSOU  
✅ Monitoramento em Tempo Real: PASSOU
✅ Verificação de Triggers e Constraints: PASSOU
```

**Significado:** Seu banco está funcionando corretamente!

### ❌ **Resultados de Falha**

```
❌ Teste de Isolamento de Transações: FALHOU
   └── Usuário não persistiu após commit
```

**Possíveis Causas:**
- 🔍 Problema na configuração do banco
- 🔍 Transações não sendo commitadas
- 🔍 Pool de conexões mal configurado
- 🔍 Triggers interferindo nos dados

### ⚠️ **Avisos Importantes**

```
⚠️  Elementos potencialmente problemáticos encontrados
   └── Encontrados triggers, constraints ou FKs que podem afetar dados
```

**Ação Recomendada:**
- 🔍 Revisar triggers listados
- 🔍 Verificar foreign keys CASCADE
- 🔍 Analisar constraints CHECK

## 📁 Arquivos Gerados

### 📄 **Relatório JSON**
```
verification-report-2024-01-15T10-30-45-123Z.json
```

**Conteúdo:**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "duration": 15420,
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0
  },
  "results": {
    "transaction": {
      "success": true,
      "details": "Transação funcionou corretamente"
    }
  }
}
```

## 🔧 Configurações Avançadas

### ⚙️ **Modificar Configurações**

Edite o arquivo `test-verification-suite.js` na seção `CONFIG`:

```javascript
const CONFIG = {
    // Configuração do banco
    database: {
        connectionString: process.env.DATABASE_URL,
        pool: {
            max: 20,                    // Máximo de conexões
            idleTimeoutMillis: 30000,   // Timeout de idle
            connectionTimeoutMillis: 2000 // Timeout de conexão
        }
    },
    
    // Configuração da API
    api: {
        baseUrl: 'http://localhost:3000', // URL da sua API
        timeout: 5000                     // Timeout das requisições
    },
    
    // Configuração dos testes
    tests: {
        monitorDuration: 10000,  // Duração do monitoramento (ms)
        retryAttempts: 3,        // Tentativas de retry
        retryDelay: 1000         // Delay entre tentativas (ms)
    }
};
```

## 🚨 Solução de Problemas

### ❌ **Erro: Cannot find module 'axios'**
```bash
npm install axios
```

### ❌ **Erro: Cannot find module 'pg'**
```bash
npm install pg
```

### ❌ **Erro: Cannot find module 'dotenv'**
```bash
npm install dotenv
```

### ❌ **Erro de Conexão com Banco**
1. ✅ Verifique se o PostgreSQL está rodando
2. ✅ Confirme as credenciais no `.env`
3. ✅ Teste a conexão manualmente

### ❌ **Erro de Timeout na API**
1. ✅ Verifique se o servidor está rodando (`npm start`)
2. ✅ Confirme a URL da API no CONFIG
3. ✅ Aumente o timeout se necessário

### ❌ **Falha nos Testes**
1. ✅ Execute com `--verbose` para mais detalhes
2. ✅ Verifique os logs do PostgreSQL
3. ✅ Execute testes individuais para isolar o problema

## 📚 Exemplos de Uso Prático

### 🔍 **Cenário 1: Investigação de Bug**
```bash
# 1. Execute monitoramento para verificar se dados desaparecem
node test-verification-suite.js --test=monitor --verbose

# 2. Se falhar, verifique triggers
node test-verification-suite.js --test=triggers

# 3. Teste isolamento de transações
node test-verification-suite.js --test=transaction
```

### 🔍 **Cenário 2: Validação Após Mudanças**
```bash
# Execute suite completa após alterações no banco
node test-verification-suite.js --quiet
```

### 🔍 **Cenário 3: Debug Detalhado**
```bash
# Execute com máximo de informações
node test-verification-suite.js --verbose
```

## 🎯 Próximos Passos

Após executar os testes:

1. **✅ Se todos passaram:** Seu banco está funcionando corretamente
2. **❌ Se algum falhou:** Use os detalhes para investigar o problema específico
3. **⚠️ Se há avisos:** Revise os elementos identificados como potencialmente problemáticos

---

## 📞 Suporte

Se encontrar problemas ou precisar de ajuda:

1. 🔍 Execute com `--verbose` para logs detalhados
2. 🔍 Verifique o arquivo de relatório JSON gerado
3. 🔍 Analise os logs do PostgreSQL
4. 🔍 Teste componentes individuais

**Lembre-se:** Esta suite foi desenvolvida especificamente para diagnosticar problemas de persistência de dados e isolamento de transações no PostgreSQL!