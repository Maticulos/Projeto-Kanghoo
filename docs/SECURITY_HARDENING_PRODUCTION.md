# 🔒 CONFIGURAÇÕES DE SEGURANÇA PARA PRODUÇÃO
## Sistema de Transporte Escolar

### 📋 ÍNDICE
1. [Configurações de Firewall](#firewall)
2. [Configurações de Sistema Operacional](#sistema-operacional)
3. [Configurações de Rede](#rede)
4. [Monitoramento de Segurança](#monitoramento)
5. [Backup e Recuperação](#backup)
6. [Auditoria e Logs](#auditoria)
7. [Checklist Final](#checklist)

---

## 🔥 CONFIGURAÇÕES DE FIREWALL {#firewall}

### Windows Firewall (Windows Server/Desktop)

```powershell
# Habilitar firewall para todos os perfis
netsh advfirewall set allprofiles state on

# Bloquear todas as conexões de entrada por padrão
netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound

# Permitir apenas portas necessárias
netsh advfirewall firewall add rule name="HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="HTTPS" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="SSH" dir=in action=allow protocol=TCP localport=22

# Bloquear portas de desenvolvimento
netsh advfirewall firewall add rule name="Block Dev Ports" dir=in action=block protocol=TCP localport=3000,5000,8080,9090
```

### Linux iptables/ufw

```bash
# Ubuntu/Debian - UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL - firewalld
sudo firewall-cmd --set-default-zone=public
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

---

## 💻 CONFIGURAÇÕES DE SISTEMA OPERACIONAL {#sistema-operacional}

### 1. Atualizações de Segurança

```powershell
# Windows - Configurar atualizações automáticas
# Via Group Policy ou Windows Update

# Verificar atualizações pendentes
Get-WindowsUpdate

# Instalar atualizações críticas
Install-WindowsUpdate -AcceptAll -AutoReboot
```

```bash
# Linux - Configurar atualizações automáticas
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# CentOS/RHEL
sudo yum update -y
sudo yum install yum-cron
sudo systemctl enable yum-cron
```

### 2. Configurações de Usuário

```powershell
# Windows - Criar usuário dedicado para aplicação
net user transporte-app /add /passwordreq:yes
net localgroup "Users" transporte-app /add

# Configurar política de senhas
net accounts /minpwlen:12 /maxpwage:90 /minpwage:1
```

```bash
# Linux - Criar usuário dedicado
sudo useradd -r -s /bin/false transporte-app
sudo usermod -L transporte-app  # Bloquear login direto

# Configurar sudo para administração
echo "admin ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose" | sudo tee /etc/sudoers.d/docker-admin
```

### 3. Configurações de Sistema

```bash
# Linux - Hardening do kernel
echo "net.ipv4.ip_forward = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.all.send_redirects = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.default.send_redirects = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.all.accept_source_route = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.all.accept_redirects = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.all.secure_redirects = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.all.log_martians = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 🌐 CONFIGURAÇÕES DE REDE {#rede}

### 1. Configuração de Proxy Reverso (Nginx)

```nginx
# Configurações de segurança adicionais para nginx.conf

# Rate limiting mais agressivo
limit_req_zone $binary_remote_addr zone=strict:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=api_strict:10m rate=5r/s;

# Bloqueio de IPs suspeitos
geo $blocked_ip {
    default 0;
    # Adicionar IPs maliciosos conhecidos
    # 192.168.1.100 1;
}

# Headers de segurança adicionais
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Configuração SSL mais restritiva
ssl_protocols TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_timeout 10m;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;

# Bloqueio de user agents suspeitos
if ($http_user_agent ~* (bot|crawler|spider|scraper)) {
    return 403;
}

# Bloqueio de métodos HTTP desnecessários
if ($request_method !~ ^(GET|POST|PUT|DELETE|OPTIONS)$) {
    return 405;
}
```

### 2. Configuração de DNS

```bash
# Configurar DNS seguro
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
echo "nameserver 9.9.9.9" | sudo tee -a /etc/resolv.conf
```

---

## 📊 MONITORAMENTO DE SEGURANÇA {#monitoramento}

### 1. Configuração de Fail2Ban (Linux)

```bash
# Instalar Fail2Ban
sudo apt install fail2ban  # Ubuntu/Debian
sudo yum install fail2ban  # CentOS/RHEL

# Configurar jail personalizado
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 2

[docker-auth]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Monitoramento de Logs

```bash
# Configurar logrotate para logs da aplicação
sudo tee /etc/logrotate.d/transporte-escolar << EOF
/var/log/transporte-escolar/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 transporte-app transporte-app
    postrotate
        docker-compose -f /path/to/docker-compose.prod.yml restart app
    endscript
}
EOF
```

### 3. Script de Monitoramento de Segurança

```powershell
# Windows - Script de monitoramento (security-monitor.ps1)
# Verificar tentativas de login falhadas
Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625} -MaxEvents 50 | 
    Select-Object TimeCreated, Id, LevelDisplayName, Message

# Verificar alterações em arquivos críticos
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "C:\path\to\app"
$watcher.Filter = "*.env"
$watcher.EnableRaisingEvents = $true

Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action {
    Write-Host "ALERTA: Arquivo .env foi modificado!" -ForegroundColor Red
    # Enviar notificação
}
```

---

## 💾 BACKUP E RECUPERAÇÃO {#backup}

### 1. Estratégia de Backup 3-2-1

```bash
# Script de backup completo (backup-complete.sh)
#!/bin/bash

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/complete/$BACKUP_DATE"
REMOTE_BACKUP="s3://your-bucket/backups/"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do banco de dados
docker exec transporte-escolar-db-prod pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/database.sql

# Backup de uploads
tar -czf $BACKUP_DIR/uploads.tar.gz /var/uploads/transporte-escolar/

# Backup de configurações
cp -r /path/to/app/.env $BACKUP_DIR/
cp -r /path/to/app/nginx/ $BACKUP_DIR/
cp -r /path/to/app/ssl/ $BACKUP_DIR/

# Backup de logs
tar -czf $BACKUP_DIR/logs.tar.gz /var/log/transporte-escolar/

# Sincronizar com backup remoto
aws s3 sync $BACKUP_DIR $REMOTE_BACKUP

# Limpeza de backups antigos (manter 30 dias)
find /backups/complete/ -type d -mtime +30 -exec rm -rf {} \;
```

### 2. Teste de Recuperação

```bash
# Script de teste de recuperação (test-recovery.sh)
#!/bin/bash

echo "Testando recuperação do backup..."

# Criar ambiente de teste
docker-compose -f docker-compose.test.yml up -d

# Restaurar backup mais recente
LATEST_BACKUP=$(ls -t /backups/complete/ | head -1)
docker exec test-db psql -U $DB_USER -d $DB_NAME < /backups/complete/$LATEST_BACKUP/database.sql

# Verificar integridade
docker exec test-app npm run test:integration

echo "Teste de recuperação concluído!"
```

---

## 📝 AUDITORIA E LOGS {#auditoria}

### 1. Configuração de Auditoria

```bash
# Linux - Configurar auditd
sudo apt install auditd audispd-plugins  # Ubuntu/Debian

# Configurar regras de auditoria
sudo tee -a /etc/audit/rules.d/transporte.rules << EOF
# Monitorar acesso a arquivos críticos
-w /path/to/app/.env -p wa -k config_change
-w /path/to/app/ssl/ -p wa -k ssl_change
-w /var/log/transporte-escolar/ -p wa -k log_access

# Monitorar comandos Docker
-w /usr/bin/docker -p x -k docker_exec
-w /usr/bin/docker-compose -p x -k docker_compose_exec

# Monitorar alterações de usuário
-w /etc/passwd -p wa -k user_change
-w /etc/group -p wa -k group_change
EOF

sudo systemctl restart auditd
```

### 2. Centralização de Logs

```yaml
# docker-compose.logging.yml - Adicionar ao compose principal
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - logging

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch
    networks:
      - logging

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - logging

volumes:
  elasticsearch_data:

networks:
  logging:
    driver: bridge
```

---

## ✅ CHECKLIST FINAL DE SEGURANÇA {#checklist}

### 🔒 Configurações de Sistema
- [ ] Firewall configurado e ativo
- [ ] Atualizações de segurança aplicadas
- [ ] Usuários desnecessários removidos
- [ ] Senhas fortes configuradas
- [ ] SSH configurado com chaves (Linux)
- [ ] Serviços desnecessários desabilitados

### 🌐 Configurações de Rede
- [ ] Nginx configurado com headers de segurança
- [ ] SSL/TLS configurado corretamente
- [ ] Rate limiting implementado
- [ ] IPs suspeitos bloqueados
- [ ] DNS seguro configurado

### 🐳 Configurações Docker
- [ ] Containers rodando como usuário não-root
- [ ] Imagens atualizadas e verificadas
- [ ] Volumes com permissões corretas
- [ ] Rede isolada configurada
- [ ] Secrets gerenciados adequadamente

### 📊 Monitoramento
- [ ] Logs centralizados
- [ ] Alertas configurados
- [ ] Fail2Ban ativo (Linux)
- [ ] Monitoramento de recursos
- [ ] Auditoria de segurança ativa

### 💾 Backup e Recuperação
- [ ] Backup automático configurado
- [ ] Backup testado e verificado
- [ ] Estratégia 3-2-1 implementada
- [ ] Plano de recuperação documentado
- [ ] Teste de recuperação realizado

### 🔍 Auditoria
- [ ] Logs de auditoria configurados
- [ ] Retenção de logs definida
- [ ] Monitoramento de alterações ativo
- [ ] Relatórios de segurança automatizados

---

## 🚨 COMANDOS DE EMERGÊNCIA

### Parar Todos os Serviços
```bash
docker-compose -f docker-compose.prod.yml down
```

### Backup de Emergência
```bash
./scripts/backup-emergency.sh
```

### Verificar Logs de Segurança
```bash
./scripts/security-check.sh
```

### Restaurar Backup
```bash
./scripts/restore-backup.sh [backup-date]
```

---

## 📞 CONTATOS DE EMERGÊNCIA

- **Administrador do Sistema**: [email/telefone]
- **Equipe de Segurança**: [email/telefone]
- **Provedor de Hospedagem**: [email/telefone]
- **Suporte Técnico**: [email/telefone]

---

**⚠️ IMPORTANTE**: Este documento contém informações sensíveis de segurança. Mantenha-o em local seguro e atualize regularmente conforme as necessidades do ambiente.