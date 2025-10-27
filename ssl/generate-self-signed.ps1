# Script para Gerar Certificados SSL Auto-Assinados
# Para uso em desenvolvimento local

param(
    [string]$Domain = "localhost",
    [string]$OutputDir = "dev"
)

Write-Host "=== Gerador de Certificados SSL Auto-Assinados ===" -ForegroundColor Green
Write-Host "Dominio: $Domain" -ForegroundColor Yellow
Write-Host "Diretorio de saida: $OutputDir" -ForegroundColor Yellow

# Criar diretório de desenvolvimento se não existir
$devDir = Join-Path $PSScriptRoot $OutputDir
if (-not (Test-Path $devDir)) {
    New-Item -ItemType Directory -Path $devDir -Force | Out-Null
    Write-Host "Diretorio criado: $devDir" -ForegroundColor Green
}

# Verificar se OpenSSL está disponível
try {
    $null = Get-Command openssl -ErrorAction Stop
    Write-Host "OpenSSL encontrado" -ForegroundColor Green
} catch {
    Write-Host "ERRO: OpenSSL nao encontrado. Instalando..." -ForegroundColor Red
    
    # Tentar instalar OpenSSL via Chocolatey
    try {
        choco install openssl -y
        Write-Host "OpenSSL instalado via Chocolatey" -ForegroundColor Green
    } catch {
        Write-Host "ERRO: Nao foi possivel instalar OpenSSL automaticamente." -ForegroundColor Red
        Write-Host "Por favor, instale manualmente:" -ForegroundColor Yellow
        Write-Host "1. Chocolatey: choco install openssl" -ForegroundColor Yellow
        Write-Host "2. Manual: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
        exit 1
    }
}

# Configuração do certificado
$certPath = Join-Path $devDir "cert.pem"
$keyPath = Join-Path $devDir "key.pem"
$configPath = Join-Path $devDir "openssl.conf"

# Criar arquivo de configuração OpenSSL
$opensslConfig = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=BR
ST=SP
L=Sao Paulo
O=Sistema Transporte Escolar
OU=Desenvolvimento
CN=$Domain

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $Domain
DNS.2 = *.$Domain
DNS.3 = localhost
DNS.4 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
"@

$opensslConfig | Out-File -FilePath $configPath -Encoding UTF8

Write-Host "Gerando certificado SSL auto-assinado..." -ForegroundColor Yellow

# Gerar chave privada e certificado
$opensslCmd = "openssl req -x509 -newkey rsa:2048 -keyout `"$keyPath`" -out `"$certPath`" -days 365 -nodes -config `"$configPath`""

try {
    Invoke-Expression $opensslCmd
    
    if (Test-Path $certPath -and Test-Path $keyPath) {
        Write-Host "Certificados gerados com sucesso!" -ForegroundColor Green
        Write-Host "Certificado: $certPath" -ForegroundColor Cyan
        Write-Host "Chave privada: $keyPath" -ForegroundColor Cyan
        
        # Exibir informações do certificado
        Write-Host "`nInformacoes do certificado:" -ForegroundColor Yellow
        $certInfo = openssl x509 -in $certPath -text -noout | Select-String "Subject:", "Not Before", "Not After", "DNS:"
        $certInfo | ForEach-Object { Write-Host $_.Line -ForegroundColor Cyan }
        
        # Criar link simbólico para facilitar uso
        $mainCertPath = Join-Path $PSScriptRoot "cert.pem"
        $mainKeyPath = Join-Path $PSScriptRoot "key.pem"
        
        if (Test-Path $mainCertPath) { Remove-Item $mainCertPath -Force }
        if (Test-Path $mainKeyPath) { Remove-Item $mainKeyPath -Force }
        
        Copy-Item $certPath $mainCertPath
        Copy-Item $keyPath $mainKeyPath
        
        Write-Host "`nCertificados copiados para o diretorio principal" -ForegroundColor Green
        
        # Instruções de uso
        Write-Host "`n=== INSTRUCOES DE USO ===" -ForegroundColor Green
        Write-Host "1. Para usar no navegador, adicione o certificado como confiavel" -ForegroundColor Yellow
        Write-Host "2. No Chrome: chrome://settings/certificates > Autoridades > Importar" -ForegroundColor Yellow
        Write-Host "3. No Firefox: about:preferences#privacy > Certificados > Ver certificados" -ForegroundColor Yellow
        Write-Host "4. Acesse: https://$Domain" -ForegroundColor Yellow
        
    } else {
        Write-Host "ERRO: Falha ao gerar certificados" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Limpar arquivo de configuração temporário
    if (Test-Path $configPath) {
        Remove-Item $configPath -Force
    }
}

Write-Host "`nCertificados SSL auto-assinados gerados com sucesso!" -ForegroundColor Green
Write-Host "AVISO: Use apenas para desenvolvimento. Para producao, use certificados validos." -ForegroundColor Yellow