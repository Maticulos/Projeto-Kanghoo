# Guia de Suporte e QA - Sistema de Transporte Escolar

## 1. Visão Geral do Sistema

O sistema de transporte escolar é composto por:
- Backend Node.js com Koa
- Frontend com HTML/CSS/JavaScript
- Banco de dados PostgreSQL
- WebSocket para comunicação em tempo real
- Integração com Google Maps
- Sistema de notificações em tempo real

## 2. Ambiente de Testes

### 2.1 Configuração Inicial
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure o arquivo `.env` baseado no `.env.example`
4. Configure o banco de dados usando os scripts em `/database`
5. Execute `node server.js` para iniciar o servidor

### 2.2 Suíte de Testes
- **Testes Principais**: `/server/tests/test-suite.js`
- **Testes de Integração**: `/server/tests/integration.test.js`
- **Testes de Notificação**: `/server/tests/notification-hub.test.js`
- **Testes de WebSocket**: `/server/tests/websocket-manager.test.js`
- **Testes de Segurança**: `/server/tests/security-manager.test.js`

Para executar os testes:
```bash
# Todos os testes
node test-suite.js

# Testes específicos
node test-suite.js integration
node test-suite.js notification
node test-suite.js security
node test-suite.js websocket
```

## 3. Procedimentos de Verificação

### 3.1 Verificação de Conexão WebSocket
1. Acesse `/tests/manual/test-websocket.html`
2. Verifique se o status muda para "Conectado"
3. Teste o envio e recebimento de mensagens
4. Verifique logs no console do navegador

### 3.2 Verificação de Rastreamento
1. Inicie uma viagem através da interface do motorista
2. Verifique se as atualizações de posição são recebidas
3. Confirme se os responsáveis recebem notificações
4. Verifique se o mapa atualiza em tempo real

### 3.3 Verificação de Notificações
1. Teste notificações de embarque/desembarque
2. Verifique notificações de emergência
3. Confirme recebimento em diferentes dispositivos
4. Valide persistência das notificações

## 4. Resolução de Problemas Comuns

### 4.1 Problemas de Conexão
- **Erro de WebSocket**: Verifique se o servidor está rodando e a porta está correta
- **Erro de Banco**: Verifique permissões do usuário `transporte_user`
- **Erro de Autenticação**: Limpe tokens e faça login novamente

### 4.2 Problemas de Rastreamento
- **GPS não atualiza**: Verifique permissões de localização
- **Mapa não carrega**: Confirme chave da API do Google Maps
- **Rota não aparece**: Verifique coordenadas e formato dos dados

### 4.3 Problemas de Notificação
- **Notificações não chegam**: Verifique conexão WebSocket
- **Atrasos nas notificações**: Monitore performance do servidor
- **Notificações duplicadas**: Verifique listeners duplicados

## 5. Monitoramento

### 5.1 Logs
- Logs do servidor: `/logs/`
- Logs de deploy: `/logs/deploy-*.log`
- Logs de monitoramento: `/logs/monitoring-*.log`
- Logs de segurança: `/logs/security-validation.log`

### 5.2 Métricas
- Dashboard Grafana: `/monitoring/grafana/dashboards`
- Métricas Prometheus: `/monitoring/prometheus.yml`
- Relatórios de teste: `/server/test-report.json`

## 6. Segurança

### 6.1 Verificações de Segurança
1. Execute `security-validation.ps1`
2. Verifique certificados SSL
3. Monitore tentativas de login
4. Verifique logs de segurança

### 6.2 Backup e Recuperação
1. Backups automáticos: `/backups/`
2. Script de backup: `backup-database.ps1`
3. Procedimento de restauração em `/docs/BACKUP_RESTORE.md`

## 7. Checklist de Qualidade

### 7.1 Pré-Deploy
- [ ] Todos os testes passando
- [ ] Sem erros nos logs
- [ ] Backups atualizados
- [ ] Documentação atualizada
- [ ] Certificados SSL válidos

### 7.2 Pós-Deploy
- [ ] Serviços iniciando corretamente
- [ ] WebSocket funcionando
- [ ] Notificações chegando
- [ ] Rastreamento ativo
- [ ] Monitoramento configurado

## 8. Contatos e Suporte

### 8.1 Equipe
- **Desenvolvimento**: dev@empresa.com
- **Infraestrutura**: infra@empresa.com
- **Suporte 24/7**: suporte@empresa.com

### 8.2 Documentação Adicional
- Documentação completa: `/DOCUMENTACAO_SISTEMA_COMPLETA.md`
- Guia de produção: `/README_PRODUCAO.md`
- Configurações: `/RESUMO_CONFIGURACOES_PRODUCAO.md`