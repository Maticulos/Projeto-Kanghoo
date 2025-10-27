# Sistema de Transporte Escolar - Guia de Produção

## 📋 Visão Geral

Este documento fornece instruções completas para deploy e configuração do Sistema de Transporte Escolar em ambiente de produção.

## 🚀 Pré-requisitos

### Sistema Operacional
- Windows Server 2019/2022 ou Windows 10/11 Pro
- Ubuntu 20.04 LTS ou superior (alternativo)

### Software Necessário
- Docker Desktop 4.0+ ou Docker Engine 20.10+
- Docker Compose 2.0+
- PowerShell 5.1+ (Windows)
- Git 2.30+
- Certificados SSL válidos

### Hardware Mínimo
- **CPU**: 4 cores (8 recomendado)
- **RAM**: 8GB (16GB recomendado)
- **Armazenamento**: 100GB SSD
- **Rede**: Conexão estável de internet

## 📁 Estrutura do Projeto

```
projeto/
├── server/                     # Backend Koa.js
├── frontend/                   # Frontend (se aplicável)
├── nginx/                      # Configurações Nginx
├── scripts/                    # Scripts de automação
├── logs/                       # Logs do sistema
├── backups/                    # Backups automáticos
├── docker-compose.prod.yml     # Configuração Docker produção
├── Dockerfile.prod             # Dockerfile otimizado
├── .env.security              # Variáveis de segurança
└── README_PRODUCAO.md         # Este arquivo
```

## 🔧 Configuração Inicial

### 1. Preparação do Ambiente

```powershell
# Clone o repositório
git clone <url-do-repositorio>
cd sistema-transporte-escolar

# Criar diretórios necessários
mkdir logs, backups, uploads, ssl

# Configurar permissões (Linux)
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### 2. Configuração de Segurança

```powershell
# Executar script de configuração de segurança
.\scripts\security-setup.ps1

# Validar configurações
.\scripts\security-validation.ps1 -Detailed
```

### 3. Configuração de Variáveis de Ambiente

Copie e configure o arquivo `.env.security`:

```bash
# Configurações críticas que DEVEM ser alteradas
SESSION_SECRET=sua_chave_secreta_super_forte_aqui
JWT_SECRET=sua_chave_jwt_super_forte_aqui
REDIS_PASSWORD=sua_senha_redis_forte_aqui

# Configurações do banco de dados
POSTGRES_DB=transporte_escolar
POSTGRES_USER=app_user
POSTGRES_PASSWORD=senha_super_forte_aqui

# Configurações de produção
NODE_ENV=production
DEBUG=false
DEVELOPMENT_MODE=false
```

## 🐳 Deploy com Docker

### 1. Build da Aplicação

```powershell
# Build da imagem de produção
docker build -f Dockerfile.prod -t transporte-escolar:latest .

# Verificar imagem criada
docker images | grep transporte-escolar
```

### 2. Deploy Completo

```powershell
# Executar script de deploy automatizado
.\scripts\deploy-production.ps1

# OU deploy manual
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Verificação do Deploy

```powershell
# Verificar containers
docker-compose -f docker-compose.prod.yml ps

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f app

# Verificar saúde dos serviços
docker-compose -f docker-compose.prod.yml exec app curl http://localhost:5000/health
```

## 🔒 Configuração SSL/HTTPS

### 1. Certificados SSL

```powershell
# Colocar certificados na pasta ssl/
ssl/
├── certificate.crt
├── private.key
└── ca-bundle.crt
```

### 2. Configuração Nginx

O arquivo `nginx/nginx.prod.conf` já está configurado para HTTPS. Certifique-se de que:

- Os certificados estão no local correto
- O domínio está configurado corretamente
- O DNS aponta para o servidor

## 📊 Monitoramento

### 1. Logs

```powershell
# Visualizar logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Logs específicos por serviço
docker-compose -f docker-compose.prod.yml logs app
docker-compose -f docker-compose.prod.yml logs nginx
docker-compose -f docker-compose.prod.yml logs postgres
```

### 2. Métricas (Prometheus + Grafana)

```powershell
# Iniciar serviços de monitoramento
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Acessar Grafana
# URL: https://seu-dominio.com:3000
# Usuário: admin
# Senha: definida em .env.security
```

### 3. Script de Monitoramento

```powershell
# Executar monitoramento contínuo
.\scripts\monitor-production.ps1 -Continuous
```

## 💾 Backup e Recuperação

### 1. Backup Automático

O sistema está configurado para backup automático:

- **Banco de dados**: Diário às 02:00
- **Uploads**: Diário às 03:00
- **Logs**: Semanal aos domingos
- **Configurações**: Antes de cada deploy

### 2. Backup Manual

```powershell
# Backup completo
docker-compose -f docker-compose.prod.yml exec backup /backup.sh

# Backup apenas do banco
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql
```

### 3. Recuperação

```powershell
# Parar aplicação
docker-compose -f docker-compose.prod.yml down

# Restaurar banco de dados
docker-compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER $POSTGRES_DB < backup_YYYYMMDD.sql

# Reiniciar aplicação
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Manutenção

### 1. Atualizações

```powershell
# Atualizar código
git pull origin main

# Rebuild e redeploy
.\scripts\deploy-production.ps1
```

### 2. Limpeza

```powershell
# Limpar containers antigos
docker system prune -f

# Limpar volumes não utilizados
docker volume prune -f

# Limpar logs antigos
Get-ChildItem logs\ -Filter "*.log" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Aplicação não inicia
```powershell
# Verificar logs
docker-compose -f docker-compose.prod.yml logs app

# Verificar variáveis de ambiente
docker-compose -f docker-compose.prod.yml exec app env | grep NODE_ENV
```

#### 2. Banco de dados não conecta
```powershell
# Verificar status do PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Verificar logs do banco
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. Nginx não responde
```powershell
# Verificar configuração
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Recarregar configuração
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Comandos de Diagnóstico

```powershell
# Status geral do sistema
.\scripts\monitor-production.ps1 -HealthCheck

# Validação de segurança
.\scripts\security-validation.ps1

# Teste de conectividade
Test-NetConnection seu-dominio.com -Port 443
```

## 📞 Contatos de Emergência

### Equipe Técnica
- **DevOps**: devops@empresa.com
- **Desenvolvimento**: dev@empresa.com
- **Suporte**: suporte@empresa.com

### Procedimentos de Emergência
1. **Aplicação fora do ar**: Executar `.\scripts\deploy-production.ps1`
2. **Banco corrompido**: Restaurar último backup
3. **Ataque de segurança**: Executar `.\scripts\security-setup.ps1` e notificar equipe

## 📚 Documentação Adicional

- [Checklist de Produção](CHECKLIST_PRODUCAO_FINAL.md)
- [Guia de Segurança](SECURITY_HARDENING_PRODUCTION.md)
- [Configurações Docker](docker-compose.prod.yml)
- [Configurações Nginx](nginx/nginx.prod.conf)

## 🔄 Versionamento

- **v1.0.0**: Release inicial de produção
- **Data**: $(Get-Date -Format "yyyy-MM-dd")
- **Ambiente**: Produção
- **Status**: Ativo

---

**⚠️ IMPORTANTE**: Este sistema está configurado para produção. Sempre teste mudanças em ambiente de desenvolvimento antes de aplicar em produção.

**📧 Suporte**: Para dúvidas ou problemas, entre em contato com a equipe técnica.