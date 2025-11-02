# GUIA PARA MIGRAÇÃO MANUAL NO PgAdmin4

## Objetivo
Executar a migração da coluna `ativa` para `ativo` na tabela `rotas_escolares` nos três bancos de dados.

## Bancos de Dados Alvo
1. **kanghoo_db_teste** (Banco de Teste)
2. **postgres** (Banco Padrão)
3. **kanghoo_db_prod** (Banco de Produção)

## Arquivo de Migração
📁 **Localização**: `C:\Users\Mateus\Desktop\Teste Backend Koa\teste\database\migracao_ativa_para_ativo.sql`

## Passos para Execução no PgAdmin4

### 1. Abrir o PgAdmin4
- Abra o PgAdmin4 (já está aberto conforme a imagem)
- Conecte-se ao servidor PostgreSQL 17

### 2. Para Cada Banco de Dados (kanghoo_db_teste, postgres, kanghoo_db_prod):

#### Passo 2.1: Selecionar o Banco
- Clique com o botão direito no banco de dados
- Selecione **"Query Tool"** ou **"Ferramenta de Consulta"**

#### Passo 2.2: Carregar o Script
- Na janela do Query Tool, clique no ícone **"Open File"** (📁)
- Navegue até: `C:\Users\Mateus\Desktop\Teste Backend Koa\teste\database\`
- Selecione o arquivo: **`migracao_ativa_para_ativo.sql`**

#### Passo 2.3: Executar a Migração
- Clique no botão **"Execute"** (▶️) ou pressione **F5**
- Aguarde a execução completa
- Verifique se não há erros na aba **"Messages"**

#### Passo 2.4: Verificar Resultado
O script deve exibir mensagens como:
```
✅ Verificação inicial concluída
✅ Backup da coluna criado
✅ Nova coluna 'ativo' criada
✅ Dados copiados com sucesso
✅ Índice atualizado
✅ Coluna antiga removida
🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!
```

### 3. Verificação Final
Após executar em todos os bancos, execute esta consulta para verificar:

```sql
-- Verificar se a coluna 'ativo' existe e 'ativa' foi removida
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'rotas_escolares' 
  AND column_name IN ('ativo', 'ativa')
ORDER BY column_name;

-- Verificar alguns registros
SELECT id, nome, ativo FROM rotas_escolares LIMIT 5;
```

## Ordem Recomendada de Execução

1. **PRIMEIRO**: `kanghoo_db_teste` (Ambiente de Teste)
   - Execute e verifique se tudo funciona corretamente
   
2. **SEGUNDO**: `postgres` (Banco Padrão)
   - Execute após confirmar sucesso no teste
   
3. **TERCEIRO**: `kanghoo_db_prod` (Produção)
   - Execute por último, após confirmar nos outros ambientes

## ⚠️ Pontos de Atenção

- **BACKUP**: O script já faz backup automático, mas considere fazer backup manual antes
- **VERIFICAÇÃO**: Sempre verifique os resultados antes de prosseguir para o próximo banco
- **ROLLBACK**: Se algo der errado, o script inclui instruções de rollback no final

## 🔧 Solução de Problemas

### Se aparecer erro "tabela não existe":
- Verifique se você está no banco correto
- A tabela `rotas_escolares` pode não existir neste banco específico

### Se aparecer erro "coluna já existe":
- O script é idempotente, pode executar novamente sem problemas
- Verifique se a migração já foi executada anteriormente

### Se aparecer erro de permissão:
- Certifique-se de estar conectado com usuário que tem privilégios de ALTER TABLE

## 📊 Relatório de Execução

Após executar em cada banco, anote:

| Banco | Status | Hora | Observações |
|-------|--------|------|-------------|
| kanghoo_db_teste | ⏳ Pendente | | |
| postgres | ⏳ Pendente | | |
| kanghoo_db_prod | ⏳ Pendente | | |

**Legenda**: ✅ Sucesso | ❌ Erro | ⏳ Pendente

---

## 🚀 Próximos Passos

Após completar a migração em todos os bancos:
1. Testar a criação de rota escolar
2. Verificar se o backend funciona corretamente
3. Confirmar que não há erros nos logs do servidor