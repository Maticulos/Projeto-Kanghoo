# Configuração de Domínio e SSL/TLS para Produção

## 1. Registro de Domínio

### Opções Recomendadas:
- **Registro.br** (para .com.br): https://registro.br/
- **GoDaddy**: https://godaddy.com/
- **Namecheap**: https://namecheap.com/
- **Cloudflare Registrar**: https://cloudflare.com/

### Sugestões de Domínio:
- `transporteescolar.com.br`
- `rotasegura.com.br`
- `escolatransporte.com.br`
- `mobilidadeescolar.com.br`

## 2. Configuração de DNS

### Registros DNS Necessários:

#### Registro A (IPv4):
```
@ (root)    A    SEU_IP_SERVIDOR
www         A    SEU_IP_SERVIDOR
api         A    SEU_IP_SERVIDOR
```

#### Registro AAAA (IPv6) - Opcional:
```
@ (root)    AAAA    SEU_IPv6_SERVIDOR
www         AAAA    SEU_IPv6_SERVIDOR
```

#### Registro CNAME:
```
www         CNAME    seudominio.com
```

### Verificar Propagação:
```bash
# Verificar DNS
nslookup seudominio.com
dig seudominio.com

# Verificar propagação global
# Use: https://dnschecker.org/
```

## 3. Certificado SSL/TLS

### Opção 1: Let's Encrypt (Gratuito)

#### Instalar Certbot:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx

# Windows (via Chocolatey)
choco install certbot
```

#### Obter Certificado:
```bash
# Para Nginx
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Para Apache
sudo certbot --apache -d seudominio.com -d www.seudominio.com

# Standalone (sem servidor web)
sudo certbot certonly --standalone -d seudominio.com -d www.seudominio.com
```

#### Renovação Automática:
```bash
# Adicionar ao crontab
sudo crontab -e

# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Opção 2: Cloudflare SSL (Recomendado)

#### Vantagens:
- ✅ Gratuito
- ✅ Configuração simples
- ✅ CDN incluído
- ✅ Proteção DDoS
- ✅ Cache automático

#### Configuração:
1. Criar conta no Cloudflare
2. Adicionar seu domínio
3. Alterar nameservers no registrador
4. Ativar SSL/TLS (Full Strict)
5. Configurar regras de página

## 4. Configuração do Nginx (Proxy Reverso)

### Instalar Nginx:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# Windows
# Download: http://nginx.org/en/download.html
```

### Configuração do Site:
```nginx
# /etc/nginx/sites-available/transporte-escolar
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/seudominio.crt;
    ssl_certificate_key /etc/ssl/private/seudominio.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Static Files
    location /static/ {
        alias /var/www/transporte-escolar/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        root /var/www/transporte-escolar/frontend;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Error Pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

### Ativar Site:
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/transporte-escolar /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

## 5. Configuração do Firewall

### UFW (Ubuntu):
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (apenas localhost)
sudo ufw enable
```

### Windows Firewall:
```powershell
# Permitir HTTP
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Permitir HTTPS
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

## 6. Monitoramento SSL

### Verificar Certificado:
```bash
# Verificar validade
openssl x509 -in /etc/ssl/certs/seudominio.crt -text -noout

# Testar conexão SSL
openssl s_client -connect seudominio.com:443 -servername seudominio.com
```

### Ferramentas Online:
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **SSL Checker**: https://www.sslchecker.com/
- **Security Headers**: https://securityheaders.com/

## 7. Configuração no Sistema

### Atualizar .env:
```bash
# Domínio
CORS_ORIGIN=https://seudominio.com
SSL_CERT_PATH=/etc/ssl/certs/seudominio.crt
SSL_KEY_PATH=/etc/ssl/private/seudominio.key

# URLs
API_BASE_URL=https://seudominio.com/api
WS_URL=wss://seudominio.com/ws
```

### Atualizar Frontend:
```javascript
// config/api.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://seudominio.com/api'
  : 'http://localhost:3000/api';

const WS_URL = process.env.NODE_ENV === 'production'
  ? 'wss://seudominio.com/ws'
  : 'ws://localhost:3001';
```

## 8. Backup de Certificados

### Script de Backup:
```bash
#!/bin/bash
# backup-ssl.sh

BACKUP_DIR="/backup/ssl"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup certificados
cp /etc/ssl/certs/seudominio.crt $BACKUP_DIR/cert_$DATE.crt
cp /etc/ssl/private/seudominio.key $BACKUP_DIR/key_$DATE.key

# Backup configuração Nginx
cp /etc/nginx/sites-available/transporte-escolar $BACKUP_DIR/nginx_$DATE.conf

echo "Backup SSL concluído: $BACKUP_DIR"
```

## 9. Troubleshooting

### Problemas Comuns:

#### "Certificate not trusted"
- Verificar cadeia de certificados
- Instalar certificados intermediários

#### "Mixed content warnings"
- Garantir que todos os recursos usem HTTPS
- Atualizar URLs no frontend

#### "SSL handshake failed"
- Verificar configuração de ciphers
- Testar compatibilidade TLS

### Logs Úteis:
```bash
# Nginx error log
sudo tail -f /var/log/nginx/error.log

# SSL debug
openssl s_client -debug -connect seudominio.com:443
```

## 10. Checklist Final

### Antes de ir para produção:
- [ ] Domínio registrado e DNS configurado
- [ ] Certificado SSL válido e instalado
- [ ] Nginx configurado como proxy reverso
- [ ] Firewall configurado
- [ ] Headers de segurança implementados
- [ ] Redirecionamento HTTP → HTTPS
- [ ] Teste de velocidade e performance
- [ ] Monitoramento SSL configurado
- [ ] Backup de certificados
- [ ] Renovação automática configurada

---

**🔒 IMPORTANTE**: Sempre use HTTPS em produção e mantenha os certificados atualizados!