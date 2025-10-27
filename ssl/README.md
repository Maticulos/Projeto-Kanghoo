# Configuração de Certificados SSL

## 📋 Visão Geral
Esta pasta contém os certificados SSL necessários para executar o sistema em produção com HTTPS.

## 🔐 Estrutura de Arquivos

```
ssl/
├── README.md                    # Este arquivo
├── generate-self-signed.ps1     # Script para certificados de desenvolvimento
├── install-production-certs.ps1 # Script para instalar certificados de produção
├── cert.pem                     # Certificado público (produção)
├── key.pem                      # Chave privada (produção)
├── fullchain.pem               # Cadeia completa de certificados
├── dhparam.pem                 # Parâmetros Diffie-Hellman
└── dev/                        # Certificados de desenvolvimento
    ├── cert.pem
    └── key.pem
```

## 🚀 Configuração para Produção

### 1. Certificados Let's Encrypt (Recomendado)

```powershell
# Instalar Certbot
winget install Certbot.Certbot

# Gerar certificados
certbot certonly --standalone -d seutransporte.com.br -d www.seutransporte.com.br

# Copiar certificados
Copy-Item "C:\Certbot\live\seutransporte.com.br\fullchain.pem" ".\ssl\fullchain.pem"
Copy-Item "C:\Certbot\live\seutransporte.com.br\privkey.pem" ".\ssl\key.pem"
Copy-Item "C:\Certbot\live\seutransporte.com.br\cert.pem" ".\ssl\cert.pem"
```

### 2. Certificados Comerciais

Se você possui certificados comerciais (Comodo, DigiCert, etc.):

1. Coloque o certificado público em `ssl/cert.pem`
2. Coloque a chave privada em `ssl/key.pem`
3. Coloque a cadeia completa em `ssl/fullchain.pem`

### 3. Gerar Parâmetros DH

```powershell
# Gerar parâmetros Diffie-Hellman (pode demorar alguns minutos)
openssl dhparam -out ssl/dhparam.pem 2048
```

## 🛠️ Desenvolvimento Local

Para desenvolvimento local, use certificados auto-assinados:

```powershell
# Executar script de geração
.\ssl\generate-self-signed.ps1
```

## 🔧 Configuração no Nginx

O arquivo `nginx/nginx.prod.conf` já está configurado para usar os certificados:

```nginx
ssl_certificate /etc/ssl/certs/fullchain.pem;
ssl_certificate_key /etc/ssl/private/key.pem;
ssl_dhparam /etc/ssl/certs/dhparam.pem;
```

## 📝 Renovação Automática (Let's Encrypt)

Configurar tarefa agendada para renovação:

```powershell
# Criar script de renovação
$script = @"
certbot renew --quiet
if ($LASTEXITCODE -eq 0) {
    Copy-Item "C:\Certbot\live\seutransporte.com.br\*" "C:\path\to\project\ssl\" -Force
    docker-compose -f docker-compose.prod.yml restart nginx
}
"@

$script | Out-File -FilePath "C:\Scripts\renew-ssl.ps1"

# Agendar execução mensal
schtasks /create /tn "SSL Renewal" /tr "powershell.exe -File C:\Scripts\renew-ssl.ps1" /sc monthly /mo 1
```

## ⚠️ Segurança

- **NUNCA** commite chaves privadas no Git
- Mantenha permissões restritivas nos arquivos de certificado
- Use certificados válidos em produção
- Configure renovação automática

## 🔍 Validação

Para validar os certificados:

```powershell
# Verificar certificado
openssl x509 -in ssl/cert.pem -text -noout

# Testar conexão SSL
openssl s_client -connect seutransporte.com.br:443 -servername seutransporte.com.br
```

## 📞 Suporte

- **Let's Encrypt**: https://letsencrypt.org/docs/
- **OpenSSL**: https://www.openssl.org/docs/
- **Nginx SSL**: https://nginx.org/en/docs/http/configuring_https_servers.html