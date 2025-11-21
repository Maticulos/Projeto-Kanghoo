# Scripts do Sistema de Transporte Escolar

Esta pasta contém scripts organizados por categoria para facilitar a manutenção e desenvolvimento do sistema.

## 📁 Estrutura de Pastas

### `/database/`
Scripts relacionados ao banco de dados:
- **migrations/**: Scripts de migração de schema
- **seeds/**: Scripts para popular dados iniciais
- **maintenance/**: Scripts de manutenção e limpeza
- **backups/**: Scripts de backup e restore

### `/deployment/`
Scripts para deploy e configuração:
- **production/**: Scripts específicos para produção
- **staging/**: Scripts para ambiente de teste
- **docker/**: Scripts relacionados ao Docker
- **nginx/**: Configurações do servidor web

### `/development/`
Scripts para auxiliar no desenvolvimento:
- **setup/**: Scripts de configuração inicial
- **testing/**: Scripts para testes automatizados
- **mock-data/**: Scripts para gerar dados de teste
- **utils/**: Utilitários diversos

### `/monitoring/`
Scripts para monitoramento e análise:
- **health-check/**: Scripts de verificação de saúde
- **performance/**: Scripts de análise de performance
- **logs/**: Scripts para análise de logs
- **alerts/**: Scripts de alertas e notificações

### `/security/`
Scripts relacionados à segurança:
- **audit/**: Scripts de auditoria
- **cleanup/**: Scripts de limpeza de dados sensíveis
- **encryption/**: Scripts de criptografia
- **backup-keys/**: Scripts para backup de chaves

## 🚀 Como Usar

1. **Desenvolvimento**: Use scripts em `/development/` para configurar ambiente
2. **Database**: Use scripts em `/database/` para gerenciar schema e dados
3. **Deploy**: Use scripts em `/deployment/` para publicar aplicação
4. **Monitoramento**: Use scripts em `/monitoring/` para acompanhar sistema
5. **Segurança**: Use scripts em `/security/` para manter sistema seguro

## 📋 Convenções

- Todos os scripts devem ter documentação no cabeçalho
- Use nomes descritivos e em kebab-case
- Inclua logs informativos durante execução
- Trate erros adequadamente
- Teste scripts antes de usar em produção

## 🔧 Execução

```bash
# Executar script de criação de usuários de teste (centralizado)
node test-users-manager.js [comando]

# Comandos disponíveis para usuários de teste:
# node test-users-manager.js single   - Criar um único usuário
# node test-users-manager.js basic    - Criar usuários básicos (padrão)
# node test-users-manager.js complete - Criar usuários completos
# node test-users-manager.js clean    - Remover usuários de teste
# node test-users-manager.js list     - Listar usuários existentes

# Executar migração de banco
node scripts/database/migrations/001-create-users-table.js

# Executar deploy
node scripts/deployment/production/deploy.js
```

## ⚠️ Importante

- **NUNCA** execute scripts de produção em desenvolvimento
- **SEMPRE** faça backup antes de executar scripts de database
- **VERIFIQUE** as variáveis de ambiente antes da execução
- **TESTE** scripts em ambiente de staging primeiro

## 🧭 Wrappers recomendados (criados em `teste/scripts/`)

Coloquei wrappers de conveniência em `teste/scripts/` para operações comuns:

- `iniciar-desenvolvimento.sh` / `iniciar-desenvolvimento.cmd`: inicia o servidor em modo desenvolvimento com `DEMO_MODE=true` e CORS ajustado para `localhost`.
- `iniciar-producao.sh`: sobe stack de produção via `docker-compose.prod.yml`.
- `db/migrar.sh`: executa `knex migrate:latest` no backend.
- `db/reverter-migracoes.sh`: reverte última batch de migrations.
- `db/seed.sh`: executa `database/run-seed.js` (se presente).
- `backup-bd.sh`: cria dump do Postgres para `teste/backups/` com timestamp.
- `limpar-logs.sh`: compacta logs antigos (padrão 30 dias).
- `verificar-saude.sh`: healthcheck simples (usa `/api/health`).
- `deploy-cd.sh`: fluxo simples para CI/CD (testes -> build -> docker-compose up).

Use estes wrappers como ponto único de entrada para tarefas operacionais. Leia e audite cada script antes de executar em produção.