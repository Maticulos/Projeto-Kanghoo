# Guia Completo do Sistema de Transporte Escolar

## 1. Visão Geral

### 1.1 Objetivo
Sistema de gerenciamento de transporte escolar com rastreamento em tempo real, notificações e gestão de rotas.

### 1.2 Arquitetura
- **Backend**: Node.js + Koa
- **Frontend**: HTML5 + JavaScript
- **Banco de Dados**: PostgreSQL
- **Cache**: Redis
- **Comunicação Real-time**: WebSocket
- **Proxy Reverso**: Nginx
- **Monitoramento**: Grafana + Prometheus

## 2. Configuração do Ambiente

### 2.1 Requisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker e Docker Compose (opcional)
- Git

### 2.2 Configuração Inicial
1. Clone o repositório
2. Copie `.env.example` para `.env`
3. Configure as variáveis de ambiente
4. Instale dependências: `npm install`
5. Configure o banco de dados
6. Inicie o servidor: `node server.js`

### 2.3 Variáveis de Ambiente
```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transporte_escolar_prod
DB_USER=transporte_user
DB_PASSWORD=sua_senha

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Maps
GOOGLE_MAPS_API_KEY=sua_chave

# JWT
JWT_SECRET=seu_secret
JWT_EXPIRATION=24h

# WebSocket
WS_PATH=/ws
WS_HEARTBEAT=30000
```

## 3. Estrutura do Projeto

### 3.1 Diretórios Principais
```
/server
  /config      # Configurações
  /middleware  # Middlewares Koa
  /routes      # Rotas da API
  /realtime    # WebSocket e eventos
  /utils       # Utilitários
  /tests       # Testes
  /docs        # Documentação

/database      # Scripts SQL
/frontend      # Interface web
/nginx         # Configuração Nginx
/monitoring    # Grafana/Prometheus
/scripts       # Scripts utilitários
```

### 3.2 Componentes Principais
- **server.js**: Ponto de entrada
- **realtime/**: Sistema de tempo real
- **routes/**: APIs REST
- **database/**: Estrutura do banco

## 4. Desenvolvimento

### 4.1 Padrões de Código
- Usar ESLint
- Documentar funções complexas
- Seguir padrão de commits
- Manter testes atualizados

### 4.2 Fluxo de Trabalho
1. Criar branch feature/bugfix
2. Desenvolver e testar
3. Criar PR com descrição
4. Aguardar review
5. Merge após aprovação

### 4.3 Testes
- Executar `test-suite.js`
- Manter cobertura > 80%
- Testar cenários críticos
- Documentar casos de teste

## 5. Banco de Dados

### 5.1 Estrutura Principal
```sql
-- Principais tabelas
usuarios
criancas
viagens
localizacoes
rotas
criancas_viagens
```

### 5.2 Manutenção
- Backup diário automático
- Verificar índices
- Monitorar performance
- Manter documentação

## 6. Sistema Real-time

### 6.1 WebSocket
- Conexão em `/ws`
- Autenticação via token
- Heartbeat a cada 30s
- Reconexão automática

### 6.2 Eventos
- crianca_embarcou
- crianca_desembarcou
- posicao_atualizada
- alerta_emergencia

### 6.3 Notificações
- Push notifications
- E-mail (eventos críticos)
- SMS (emergências)
- In-app alerts

## 7. Segurança

### 7.1 Autenticação
- JWT tokens
- Refresh tokens
- Rate limiting
- CORS configurado

### 7.2 Dados
- Criptografia em trânsito
- Backup criptografado
- Sanitização de inputs
- Validação de dados

### 7.3 Monitoramento
- Logs centralizados
- Alertas automáticos
- Métricas em tempo real
- Auditoria de ações

## 8. Deploy e Produção

### 8.1 Ambiente
- Usar Docker em prod
- SSL/TLS obrigatório
- Backup automatizado
- Monitoramento 24/7

### 8.2 Processo
1. Testes completos
2. Build de produção
3. Backup pré-deploy
4. Deploy gradual
5. Verificação pós-deploy

### 8.3 Monitoramento
- Dashboard Grafana
- Métricas Prometheus
- Logs centralizados
- Alertas configurados

## 9. Manutenção

### 9.1 Rotina
- Backup diário
- Verificar logs
- Monitorar métricas
- Atualizar deps

### 9.2 Problemas Comuns
- Erro de conexão
- Timeout WebSocket
- Erro de permissão
- Cache inconsistente

## 10. Recomendações

### 10.1 Performance
- Usar cache Redis
- Otimizar queries
- Comprimir assets
- Lazy loading

### 10.2 Escalabilidade
- Arquitetura modular
- Cache distribuído
- Load balancing
- Microserviços

### 10.3 Melhores Práticas
- Code review
- Documentação clara
- Testes automatizados
- CI/CD pipeline

## 11. Recursos Adicionais

### 11.1 Documentação
- API docs: `/docs/api`
- Arquitetura: `/docs/arch`
- Deployment: `/docs/deploy`
- Troubleshooting: `/docs/debug`

### 11.2 Ferramentas
- Postman collection
- Scripts utilitários
- Ambiente Docker
- Testes automatizados

## 12. Considerações Finais

### 12.1 Prioridades
1. Segurança dos dados
2. Confiabilidade
3. Performance
4. UX/UI
5. Manutenibilidade

### 12.2 Próximos Passos
- Migração para TypeScript
- Testes E2E
- PWA support
- Analytics
- Internacionalização