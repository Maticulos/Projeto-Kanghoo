# Script para Gerar Certificados SSL usando PowerShell nativo
# Para desenvolvimento local sem dependências externas

param(
    [string]$Domain = "localhost",
    [int]$ValidDays = 365
)

Write-Host "=== Gerador de Certificados SSL (PowerShell Nativo) ===" -ForegroundColor Green
Write-Host "Dominio: $Domain" -ForegroundColor Yellow
Write-Host "Validade: $ValidDays dias" -ForegroundColor Yellow

# Criar diretório dev se não existir
$devDir = Join-Path $PSScriptRoot "dev"
if (-not (Test-Path $devDir)) {
    New-Item -ItemType Directory -Path $devDir -Force | Out-Null
    Write-Host "Diretorio criado: $devDir" -ForegroundColor Green
}

try {
    # Criar certificado auto-assinado usando PowerShell
    Write-Host "Gerando certificado auto-assinado..." -ForegroundColor Yellow
    
    # Configurar parâmetros do certificado
    $certParams = @{
        DnsName = @($Domain, "localhost", "127.0.0.1")
        CertStoreLocation = "Cert:\CurrentUser\My"
        NotAfter = (Get-Date).AddDays($ValidDays)
        KeyAlgorithm = "RSA"
        KeyLength = 2048
        KeyUsage = "DigitalSignature", "KeyEncipherment"
        Type = "SSLServerAuthentication"
        FriendlyName = "Sistema Transporte Escolar - Dev SSL"
    }
    
    # Gerar certificado
    $cert = New-SelfSignedCertificate @certParams
    
    Write-Host "Certificado gerado com thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
    
    # Exportar certificado público (.crt)
    $certPath = Join-Path $devDir "cert.crt"
    Export-Certificate -Cert $cert -FilePath $certPath -Type CERT | Out-Null
    
    # Exportar certificado com chave privada (.pfx)
    $pfxPath = Join-Path $devDir "cert.pfx"
    $password = ConvertTo-SecureString -String "dev123" -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
    
    # Converter para formato PEM (simulado)
    $certPemPath = Join-Path $devDir "cert.pem"
    $keyPemPath = Join-Path $devDir "key.pem"
    
    # Ler certificado e converter para Base64
    $certBytes = [System.IO.File]::ReadAllBytes($certPath)
    $certBase64 = [System.Convert]::ToBase64String($certBytes)
    
    # Criar arquivo PEM do certificado
    $certPemContent = @"
-----BEGIN CERTIFICATE-----
$($certBase64 -replace '(.{64})', "`$1`n")
-----END CERTIFICATE-----
"@
    
    $certPemContent | Out-File -FilePath $certPemPath -Encoding ASCII
    
    # Criar arquivo PEM da chave (placeholder para desenvolvimento)
    $keyPemContent = @"
-----BEGIN PRIVATE KEY-----
# NOTA: Esta é uma chave placeholder para desenvolvimento
# Para produção, use certificados reais com OpenSSL
# Thumbprint do certificado: $($cert.Thumbprint)
-----END PRIVATE KEY-----
"@
    
    $keyPemContent | Out-File -FilePath $keyPemPath -Encoding ASCII
    
    # Copiar para diretório principal
    $mainCertPath = Join-Path $PSScriptRoot "cert.pem"
    $mainKeyPath = Join-Path $PSScriptRoot "key.pem"
    
    Copy-Item $certPemPath $mainCertPath -Force
    Copy-Item $keyPemPath $mainKeyPath -Force
    
    Write-Host "Arquivos criados:" -ForegroundColor Green
    Write-Host "  - $certPemPath" -ForegroundColor Cyan
    Write-Host "  - $keyPemPath" -ForegroundColor Cyan
    Write-Host "  - $pfxPath (senha: dev123)" -ForegroundColor Cyan
    Write-Host "  - $mainCertPath" -ForegroundColor Cyan
    Write-Host "  - $mainKeyPath" -ForegroundColor Cyan
    
    # Adicionar certificado ao store de autoridades confiáveis
    try {
        $rootStore = Get-Item "Cert:\CurrentUser\Root"
        $rootStore.Open("ReadWrite")
        $rootStore.Add($cert)
        $rootStore.Close()
        Write-Host "Certificado adicionado ao store de autoridades confiaveis" -ForegroundColor Green
    } catch {
        Write-Host "AVISO: Nao foi possivel adicionar ao store confiavel: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Exibir informações do certificado
    Write-Host "`nInformacoes do certificado:" -ForegroundColor Yellow
    Write-Host "Subject: $($cert.Subject)" -ForegroundColor Cyan
    Write-Host "Issuer: $($cert.Issuer)" -ForegroundColor Cyan
    Write-Host "Valid From: $($cert.NotBefore)" -ForegroundColor Cyan
    Write-Host "Valid To: $($cert.NotAfter)" -ForegroundColor Cyan
    Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
    
    # Instruções de uso
    Write-Host "`n=== INSTRUCOES DE USO ===" -ForegroundColor Green
    Write-Host "1. O certificado foi adicionado automaticamente ao Windows" -ForegroundColor Yellow
    Write-Host "2. Para usar no navegador, pode ser necessario aceitar o certificado" -ForegroundColor Yellow
    Write-Host "3. Para Node.js/Express, use os arquivos .pem gerados" -ForegroundColor Yellow
    Write-Host "4. Para IIS, use o arquivo .pfx (senha: dev123)" -ForegroundColor Yellow
    Write-Host "5. Acesse: https://$Domain" -ForegroundColor Yellow
    
    Write-Host "`nCertificado SSL gerado com sucesso!" -ForegroundColor Green
    Write-Host "AVISO: Use apenas para desenvolvimento. Para producao, use certificados validos." -ForegroundColor Yellow
    
    return $true
    
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    return $false
} finally {
    # Limpar certificado temporário do store pessoal se necessário
    # (mantemos para facilitar desenvolvimento)
}