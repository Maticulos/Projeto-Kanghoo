# Script para Instalar Certificados SSL de Produção
# Suporta Let's Encrypt, certificados comerciais e geração de parâmetros DH

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [string]$CertPath,
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath,
    
    [Parameter(Mandatory=$false)]
    [string]$ChainPath,
    
    [switch]$LetsEncrypt,
    [switch]$GenerateDH,
    [switch]$SetupRenewal
)

Write-Host "=== Instalador de Certificados SSL de Producao ===" -ForegroundColor Green

# Função para verificar se está executando como administrador
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Verificar privilégios de administrador
if (-not (Test-Administrator)) {
    Write-Host "AVISO: Execute como administrador para funcionalidade completa" -ForegroundColor Yellow
}

# Diretório SSL
$sslDir = $PSScriptRoot
$certFile = Join-Path $sslDir "cert.pem"
$keyFile = Join-Path $sslDir "key.pem"
$fullchainFile = Join-Path $sslDir "fullchain.pem"
$dhparamFile = Join-Path $sslDir "dhparam.pem"

# Função para instalar certificados Let's Encrypt
function Install-LetsEncryptCerts {
    param([string]$Domain)
    
    Write-Host "Configurando certificados Let's Encrypt para: $Domain" -ForegroundColor Yellow
    
    # Verificar se Certbot está instalado
    try {
        $null = Get-Command certbot -ErrorAction Stop
        Write-Host "Certbot encontrado" -ForegroundColor Green
    } catch {
        Write-Host "Instalando Certbot..." -ForegroundColor Yellow
        try {
            winget install Certbot.Certbot
            Write-Host "Certbot instalado com sucesso" -ForegroundColor Green
        } catch {
            Write-Host "ERRO: Falha ao instalar Certbot" -ForegroundColor Red
            Write-Host "Instale manualmente: winget install Certbot.Certbot" -ForegroundColor Yellow
            return $false
        }
    }
    
    # Gerar certificados
    Write-Host "Gerando certificados Let's Encrypt..." -ForegroundColor Yellow
    Write-Host "IMPORTANTE: Certifique-se de que as portas 80 e 443 estao abertas" -ForegroundColor Yellow
    
    $certbotCmd = "certbot certonly --standalone -d $Domain"
    if ($Domain -notlike "www.*") {
        $certbotCmd += " -d www.$Domain"
    }
    
    try {
        Invoke-Expression $certbotCmd
        
        # Localizar certificados gerados
        $letsEncryptPath = "C:\Certbot\live\$Domain"
        if (-not (Test-Path $letsEncryptPath)) {
            $letsEncryptPath = "$env:ProgramData\Certbot\live\$Domain"
        }
        
        if (Test-Path $letsEncryptPath) {
            # Copiar certificados
            Copy-Item (Join-Path $letsEncryptPath "cert.pem") $certFile -Force
            Copy-Item (Join-Path $letsEncryptPath "privkey.pem") $keyFile -Force
            Copy-Item (Join-Path $letsEncryptPath "fullchain.pem") $fullchainFile -Force
            
            Write-Host "Certificados Let's Encrypt instalados com sucesso!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "ERRO: Certificados nao encontrados em $letsEncryptPath" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "ERRO: Falha ao gerar certificados: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para instalar certificados comerciais
function Install-CommercialCerts {
    param([string]$CertPath, [string]$KeyPath, [string]$ChainPath)
    
    Write-Host "Instalando certificados comerciais..." -ForegroundColor Yellow
    
    # Verificar arquivos
    if (-not (Test-Path $CertPath)) {
        Write-Host "ERRO: Arquivo de certificado nao encontrado: $CertPath" -ForegroundColor Red
        return $false
    }
    
    if (-not (Test-Path $KeyPath)) {
        Write-Host "ERRO: Arquivo de chave privada nao encontrado: $KeyPath" -ForegroundColor Red
        return $false
    }
    
    # Copiar certificados
    Copy-Item $CertPath $certFile -Force
    Copy-Item $KeyPath $keyFile -Force
    
    if ($ChainPath -and (Test-Path $ChainPath)) {
        Copy-Item $ChainPath $fullchainFile -Force
    } else {
        # Se não há cadeia separada, usar o certificado principal
        Copy-Item $CertPath $fullchainFile -Force
    }
    
    Write-Host "Certificados comerciais instalados com sucesso!" -ForegroundColor Green
    return $true
}

# Função para gerar parâmetros Diffie-Hellman
function Generate-DHParams {
    Write-Host "Gerando parametros Diffie-Hellman (pode demorar alguns minutos)..." -ForegroundColor Yellow
    
    try {
        $null = Get-Command openssl -ErrorAction Stop
    } catch {
        Write-Host "ERRO: OpenSSL nao encontrado. Instale primeiro." -ForegroundColor Red
        return $false
    }
    
    $dhCmd = "openssl dhparam -out `"$dhparamFile`" 2048"
    
    try {
        Invoke-Expression $dhCmd
        
        if (Test-Path $dhparamFile) {
            Write-Host "Parametros DH gerados com sucesso!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "ERRO: Falha ao gerar parametros DH" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para configurar renovação automática
function Setup-AutoRenewal {
    param([string]$Domain)
    
    Write-Host "Configurando renovacao automatica..." -ForegroundColor Yellow
    
    $scriptDir = "C:\Scripts"
    if (-not (Test-Path $scriptDir)) {
        New-Item -ItemType Directory -Path $scriptDir -Force | Out-Null
    }
    
    $renewalScript = Join-Path $scriptDir "renew-ssl.ps1"
    $projectPath = Split-Path $PSScriptRoot -Parent
    
    $renewalContent = @"
# Script de Renovacao Automatica SSL
`$ErrorActionPreference = "Stop"

try {
    Write-Host "Iniciando renovacao de certificados SSL..." -ForegroundColor Yellow
    
    # Renovar certificados
    certbot renew --quiet
    
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "Certificados renovados com sucesso" -ForegroundColor Green
        
        # Copiar novos certificados
        `$letsEncryptPath = "C:\Certbot\live\$Domain"
        if (-not (Test-Path `$letsEncryptPath)) {
            `$letsEncryptPath = "`$env:ProgramData\Certbot\live\$Domain"
        }
        
        if (Test-Path `$letsEncryptPath) {
            Copy-Item (Join-Path `$letsEncryptPath "cert.pem") "$certFile" -Force
            Copy-Item (Join-Path `$letsEncryptPath "privkey.pem") "$keyFile" -Force
            Copy-Item (Join-Path `$letsEncryptPath "fullchain.pem") "$fullchainFile" -Force
            
            # Reiniciar containers
            Set-Location "$projectPath"
            docker-compose -f docker-compose.prod.yml restart nginx
            
            Write-Host "Certificados atualizados e servicos reiniciados" -ForegroundColor Green
        }
    } else {
        Write-Host "Nenhum certificado precisava ser renovado" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERRO na renovacao: `$(`$_.Exception.Message)" -ForegroundColor Red
    # Enviar notificação de erro (implementar conforme necessário)
}
"@

    $renewalContent | Out-File -FilePath $renewalScript -Encoding UTF8
    
    # Criar tarefa agendada
    try {
        $taskName = "SSL Certificate Renewal"
        $taskExists = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        
        if ($taskExists) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        }
        
        $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"$renewalScript`""
        $trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1)
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
        
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal
        
        Write-Host "Renovacao automatica configurada (execucao diaria as 02:00)" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "AVISO: Falha ao configurar tarefa agendada: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Configure manualmente a execucao de: $renewalScript" -ForegroundColor Yellow
        return $false
    }
}

# Função para validar certificados
function Test-Certificates {
    Write-Host "Validando certificados instalados..." -ForegroundColor Yellow
    
    $valid = $true
    
    # Verificar arquivos
    @($certFile, $keyFile, $fullchainFile) | ForEach-Object {
        if (-not (Test-Path $_)) {
            Write-Host "ERRO: Arquivo nao encontrado: $_" -ForegroundColor Red
            $valid = $false
        } else {
            Write-Host "OK: $(Split-Path $_ -Leaf)" -ForegroundColor Green
        }
    }
    
    if ($valid -and (Get-Command openssl -ErrorAction SilentlyContinue)) {
        try {
            # Verificar validade do certificado
            $certInfo = openssl x509 -in $certFile -text -noout | Select-String "Subject:", "Not Before", "Not After"
            Write-Host "`nInformacoes do certificado:" -ForegroundColor Cyan
            $certInfo | ForEach-Object { Write-Host $_.Line -ForegroundColor White }
            
            # Verificar se chave e certificado combinam
            $certHash = openssl x509 -noout -modulus -in $certFile | openssl md5
            $keyHash = openssl rsa -noout -modulus -in $keyFile | openssl md5
            
            if ($certHash -eq $keyHash) {
                Write-Host "`nCertificado e chave privada combinam!" -ForegroundColor Green
            } else {
                Write-Host "`nERRO: Certificado e chave privada nao combinam!" -ForegroundColor Red
                $valid = $false
            }
            
        } catch {
            Write-Host "AVISO: Nao foi possivel validar certificados: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    return $valid
}

# Execução principal
try {
    Write-Host "Iniciando instalacao de certificados SSL..." -ForegroundColor Green
    
    $success = $false
    
    # Instalar certificados
    if ($LetsEncrypt -and $Domain) {
        $success = Install-LetsEncryptCerts -Domain $Domain
    } elseif ($CertPath -and $KeyPath) {
        $success = Install-CommercialCerts -CertPath $CertPath -KeyPath $KeyPath -ChainPath $ChainPath
    } else {
        Write-Host "Uso:" -ForegroundColor Yellow
        Write-Host "  Let's Encrypt: .\install-production-certs.ps1 -LetsEncrypt -Domain 'seudominio.com'" -ForegroundColor Yellow
        Write-Host "  Comercial:     .\install-production-certs.ps1 -CertPath 'cert.crt' -KeyPath 'private.key'" -ForegroundColor Yellow
        Write-Host "  Parametros DH: .\install-production-certs.ps1 -GenerateDH" -ForegroundColor Yellow
        exit 1
    }
    
    # Gerar parâmetros DH se solicitado
    if ($GenerateDH) {
        Generate-DHParams | Out-Null
    }
    
    # Configurar renovação automática se Let's Encrypt
    if ($success -and $LetsEncrypt -and $SetupRenewal -and $Domain) {
        Setup-AutoRenewal -Domain $Domain | Out-Null
    }
    
    # Validar certificados
    if ($success) {
        $valid = Test-Certificates
        
        if ($valid) {
            Write-Host "`n=== CERTIFICADOS SSL INSTALADOS COM SUCESSO ===" -ForegroundColor Green
            Write-Host "Arquivos criados:" -ForegroundColor Yellow
            Write-Host "  - $certFile" -ForegroundColor Cyan
            Write-Host "  - $keyFile" -ForegroundColor Cyan
            Write-Host "  - $fullchainFile" -ForegroundColor Cyan
            if (Test-Path $dhparamFile) {
                Write-Host "  - $dhparamFile" -ForegroundColor Cyan
            }
            
            Write-Host "`nProximos passos:" -ForegroundColor Yellow
            Write-Host "1. Execute o deploy: .\scripts\deploy-production.ps1" -ForegroundColor White
            Write-Host "2. Teste HTTPS: https://$Domain" -ForegroundColor White
            
        } else {
            Write-Host "`nERRO: Problemas encontrados na validacao dos certificados" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "`nERRO: Falha na instalacao dos certificados" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}