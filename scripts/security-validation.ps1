# Script de Validacao de Seguranca para Producao
param([switch]$Detailed = $false)

function Write-ValidationLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    }
    Add-Content -Path "logs\security-validation.log" -Value $logMessage
}

function Test-Firewall {
    Write-ValidationLog "Verificando configuracoes do firewall..." "INFO"
    $results = @()
    
    try {
        $firewallStatus = Get-NetFirewallProfile | Select-Object Name, Enabled
        foreach ($profile in $firewallStatus) {
            if ($profile.Enabled) {
                $results += "Firewall $($profile.Name) - ATIVO"
            } else {
                $results += "Firewall $($profile.Name) - INATIVO - CRITICO"
            }
        }
        return $results
    } catch {
        return @("Erro ao verificar firewall - $($_.Exception.Message)")
    }
}

function Test-Users {
    Write-ValidationLog "Verificando usuarios do sistema..." "INFO"
    $results = @()
    
    try {
        $adminUsers = Get-LocalGroupMember -Group "Administrators" -ErrorAction SilentlyContinue
        if ($adminUsers) {
            $results += "Usuarios administradores encontrados - $($adminUsers.Count)"
            foreach ($user in $adminUsers) {
                $results += "  - $($user.Name)"
            }
        } else {
            $results += "Nenhum usuario administrador encontrado"
        }
        return $results
    } catch {
        return @("Erro ao verificar usuarios - $($_.Exception.Message)")
    }
}

function Test-Services {
    Write-ValidationLog "Verificando servicos criticos..." "INFO"
    $criticalServices = @("Winmgmt", "EventLog")
    $results = @()
    
    foreach ($serviceName in $criticalServices) {
        try {
            $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if ($service) {
                if ($service.Status -eq "Running") {
                    $results += "Servico $serviceName - RODANDO"
                } else {
                    $results += "Servico $serviceName - PARADO - ATENCAO"
                }
            } else {
                $results += "Servico $serviceName - NAO ENCONTRADO"
            }
        } catch {
            $results += "Erro ao verificar servico $serviceName"
        }
    }
    return $results
}

function Test-ConfigFiles {
    Write-ValidationLog "Verificando arquivos de configuracao..." "INFO"
    $configFiles = @(
        ".env.security",
        "docker-compose.prod.yml",
        "Dockerfile.prod",
        "nginx\nginx.prod.conf"
    )
    
    $results = @()
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            $results += "Arquivo $file - ENCONTRADO"
        } else {
            $results += "Arquivo $file - NAO ENCONTRADO - CRITICO"
        }
    }
    return $results
}

function Test-Docker {
    Write-ValidationLog "Verificando Docker..." "INFO"
    $results = @()
    
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            $results += "Docker - INSTALADO - $dockerVersion"
        } else {
            $results += "Docker - NAO INSTALADO - CRITICO"
        }
        
        $composeVersion = docker-compose --version 2>$null
        if ($composeVersion) {
            $results += "Docker Compose - INSTALADO - $composeVersion"
        } else {
            $results += "Docker Compose - NAO INSTALADO - CRITICO"
        }
    } catch {
        $results += "Erro ao verificar Docker - $($_.Exception.Message)"
    }
    return $results
}

function Test-Network {
    Write-ValidationLog "Verificando configuracoes de rede..." "INFO"
    $results = @()
    
    try {
        $ping = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet
        if ($ping) {
            $results += "Conectividade de rede - OK"
        } else {
            $results += "Conectividade de rede - FALHA - CRITICO"
        }
        
        $ports = @(80, 443, 5000, 5432, 6379)
        foreach ($port in $ports) {
            $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if ($connection) {
                $results += "Porta $port - EM USO"
            } else {
                $results += "Porta $port - LIVRE"
            }
        }
    } catch {
        $results += "Erro ao verificar rede - $($_.Exception.Message)"
    }
    return $results
}

function Start-SecurityValidation {
    Write-ValidationLog "========================================"
    Write-ValidationLog "INICIANDO VALIDACAO DE SEGURANCA"
    Write-ValidationLog "========================================"
    
    $criticalIssues = @()
    
    $tests = @{
        "Firewall" = Test-Firewall
        "Usuarios" = Test-Users
        "Servicos" = Test-Services
        "Arquivos de Configuracao" = Test-ConfigFiles
        "Docker" = Test-Docker
        "Rede" = Test-Network
    }
    
    foreach ($testName in $tests.Keys) {
        Write-ValidationLog "----------------------------------------"
        Write-ValidationLog "TESTE - $testName"
        Write-ValidationLog "----------------------------------------"
        
        $results = $tests[$testName]
        
        foreach ($result in $results) {
            Write-ValidationLog $result
            
            if ($result -like "*CRITICO*") {
                $criticalIssues += "$testName - $result"
            }
        }
        Write-ValidationLog ""
    }
    
    Write-ValidationLog "========================================"
    Write-ValidationLog "RELATORIO FINAL"
    Write-ValidationLog "========================================"
    
    if ($criticalIssues.Count -eq 0) {
        Write-ValidationLog "STATUS GERAL - APROVADO PARA PRODUCAO" "SUCCESS"
        Write-ValidationLog "Nenhum problema critico encontrado." "SUCCESS"
    } else {
        Write-ValidationLog "STATUS GERAL - REQUER ATENCAO" "WARNING"
        Write-ValidationLog "Problemas criticos encontrados:" "WARNING"
        foreach ($issue in $criticalIssues) {
            Write-ValidationLog "  - $issue" "ERROR"
        }
    }
    
    Write-ValidationLog "========================================"
    Write-ValidationLog "Log salvo em - logs\security-validation.log"
    Write-ValidationLog "========================================"
}

Start-SecurityValidation