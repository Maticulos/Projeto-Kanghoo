# ========================================
# SCRIPT DE MONITORAMENTO PARA PRODUÇÃO
# Sistema de Transporte Escolar
# ========================================

param(
    [int]$IntervalSeconds = 60,
    [switch]$Continuous = $false,
    [switch]$SendAlerts = $false,
    [string]$LogFile = "logs/monitoring-$(Get-Date -Format 'yyyyMMdd').log"
)

# Configurações
$DOCKER_COMPOSE_FILE = "docker-compose.prod.yml"
$HEALTH_ENDPOINT = "http://localhost:5000/api/health"
$ALERT_EMAIL = $env:ALERT_EMAIL
$THRESHOLDS = @{
    CPU_PERCENT = 80
    MEMORY_PERCENT = 85
    DISK_PERCENT = 90
    RESPONSE_TIME_MS = 5000
}

# Cores para output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"

# Função para logging
function Write-MonitorLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Criar diretório de logs se não existir
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    }
    
    # Escrever no arquivo de log
    Add-Content -Path $LogFile -Value $logMessage
    
    # Escrever no console com cores
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor $RED }
        "WARN"  { Write-Host $logMessage -ForegroundColor $YELLOW }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor $GREEN }
        default { Write-Host $logMessage -ForegroundColor $BLUE }
    }
}

# Função para verificar saúde dos containers
function Test-ContainerHealth {
    Write-MonitorLog "Verificando saúde dos containers..."
    
    try {
        $containers = docker-compose -f $DOCKER_COMPOSE_FILE ps --format json | ConvertFrom-Json
        $healthStatus = @{}
        
        foreach ($container in $containers) {
            $containerName = $container.Name
            $status = $container.State
            $health = $container.Health
            
            $healthStatus[$containerName] = @{
                Status = $status
                Health = $health
                IsHealthy = ($status -eq "running" -and ($health -eq "healthy" -or $health -eq ""))
            }
            
            if ($healthStatus[$containerName].IsHealthy) {
                Write-MonitorLog "✓ $containerName: $status" "SUCCESS"
            } else {
                Write-MonitorLog "✗ $containerName: $status ($health)" "ERROR"
            }
        }
        
        return $healthStatus
    }
    catch {
        Write-MonitorLog "Erro ao verificar containers: $_" "ERROR"
        return @{}
    }
}

# Função para verificar recursos do sistema
function Test-SystemResources {
    Write-MonitorLog "Verificando recursos do sistema..."
    
    try {
        # CPU Usage
        $cpuUsage = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
        
        # Memory Usage
        $memory = Get-WmiObject -Class Win32_OperatingSystem
        $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        $usedMemory = $totalMemory - $freeMemory
        $memoryPercent = [math]::Round(($usedMemory / $totalMemory) * 100, 2)
        
        # Disk Usage
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $diskPercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
        
        $resources = @{
            CPU = @{
                Percent = $cpuUsage
                Status = if ($cpuUsage -gt $THRESHOLDS.CPU_PERCENT) { "CRITICAL" } elseif ($cpuUsage -gt ($THRESHOLDS.CPU_PERCENT * 0.8)) { "WARNING" } else { "OK" }
            }
            Memory = @{
                Percent = $memoryPercent
                Used = $usedMemory
                Total = $totalMemory
                Status = if ($memoryPercent -gt $THRESHOLDS.MEMORY_PERCENT) { "CRITICAL" } elseif ($memoryPercent -gt ($THRESHOLDS.MEMORY_PERCENT * 0.8)) { "WARNING" } else { "OK" }
            }
            Disk = @{
                Percent = $diskPercent
                Status = if ($diskPercent -gt $THRESHOLDS.DISK_PERCENT) { "CRITICAL" } elseif ($diskPercent -gt ($THRESHOLDS.DISK_PERCENT * 0.8)) { "WARNING" } else { "OK" }
            }
        }
        
        # Log dos recursos
        Write-MonitorLog "CPU: $($resources.CPU.Percent)% [$($resources.CPU.Status)]" $(if ($resources.CPU.Status -eq "OK") { "SUCCESS" } elseif ($resources.CPU.Status -eq "WARNING") { "WARN" } else { "ERROR" })
        Write-MonitorLog "Memória: $($resources.Memory.Percent)% ($($resources.Memory.Used)GB/$($resources.Memory.Total)GB) [$($resources.Memory.Status)]" $(if ($resources.Memory.Status -eq "OK") { "SUCCESS" } elseif ($resources.Memory.Status -eq "WARNING") { "WARN" } else { "ERROR" })
        Write-MonitorLog "Disco: $($resources.Disk.Percent)% [$($resources.Disk.Status)]" $(if ($resources.Disk.Status -eq "OK") { "SUCCESS" } elseif ($resources.Disk.Status -eq "WARNING") { "WARN" } else { "ERROR" })
        
        return $resources
    }
    catch {
        Write-MonitorLog "Erro ao verificar recursos: $_" "ERROR"
        return @{}
    }
}

# Função para verificar aplicação
function Test-ApplicationHealth {
    Write-MonitorLog "Verificando saúde da aplicação..."
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $HEALTH_ENDPOINT -TimeoutSec 10
        $stopwatch.Stop()
        
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        $appHealth = @{
            StatusCode = $response.StatusCode
            ResponseTime = $responseTime
            IsHealthy = ($response.StatusCode -eq 200)
            Status = if ($response.StatusCode -eq 200) {
                if ($responseTime -gt $THRESHOLDS.RESPONSE_TIME_MS) { "SLOW" } else { "OK" }
            } else { "ERROR" }
        }
        
        if ($appHealth.IsHealthy) {
            Write-MonitorLog "✓ Aplicação: HTTP $($appHealth.StatusCode) em $($responseTime)ms [$($appHealth.Status)]" $(if ($appHealth.Status -eq "OK") { "SUCCESS" } else { "WARN" })
        } else {
            Write-MonitorLog "✗ Aplicação: HTTP $($appHealth.StatusCode)" "ERROR"
        }
        
        return $appHealth
    }
    catch {
        Write-MonitorLog "✗ Aplicação: Não responsiva - $_" "ERROR"
        return @{
            StatusCode = 0
            ResponseTime = 0
            IsHealthy = $false
            Status = "ERROR"
        }
    }
}

# Função para verificar logs de erro
function Test-ErrorLogs {
    Write-MonitorLog "Verificando logs de erro recentes..."
    
    try {
        # Verificar logs da aplicação
        $appLogs = docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=50 app 2>&1
        $errorCount = ($appLogs | Select-String -Pattern "ERROR|FATAL|Exception" | Measure-Object).Count
        
        if ($errorCount -gt 0) {
            Write-MonitorLog "⚠ Encontrados $errorCount erros nos logs recentes" "WARN"
            
            # Mostrar últimos erros
            $recentErrors = $appLogs | Select-String -Pattern "ERROR|FATAL|Exception" | Select-Object -Last 3
            foreach ($error in $recentErrors) {
                Write-MonitorLog "  → $error" "WARN"
            }
        } else {
            Write-MonitorLog "✓ Nenhum erro encontrado nos logs recentes" "SUCCESS"
        }
        
        return $errorCount
    }
    catch {
        Write-MonitorLog "Erro ao verificar logs: $_" "ERROR"
        return -1
    }
}

# Função para verificar conectividade do banco
function Test-DatabaseConnection {
    Write-MonitorLog "Verificando conectividade do banco de dados..."
    
    try {
        $dbContainer = docker-compose -f $DOCKER_COMPOSE_FILE ps -q postgres
        
        if ($dbContainer) {
            $dbCheck = docker exec $dbContainer pg_isready -q
            
            if ($LASTEXITCODE -eq 0) {
                Write-MonitorLog "✓ Banco de dados: Conectado" "SUCCESS"
                return $true
            } else {
                Write-MonitorLog "✗ Banco de dados: Não responsivo" "ERROR"
                return $false
            }
        } else {
            Write-MonitorLog "✗ Container do banco não encontrado" "ERROR"
            return $false
        }
    }
    catch {
        Write-MonitorLog "Erro ao verificar banco: $_" "ERROR"
        return $false
    }
}

# Função para enviar alertas
function Send-Alert {
    param([string]$Subject, [string]$Body)
    
    if (!$SendAlerts -or !$ALERT_EMAIL) {
        return
    }
    
    try {
        # Aqui você pode implementar envio de email, Slack, etc.
        Write-MonitorLog "ALERTA: $Subject" "ERROR"
        Write-MonitorLog "Detalhes: $Body" "ERROR"
        
        # Exemplo de implementação com email (requer configuração SMTP)
        # Send-MailMessage -To $ALERT_EMAIL -Subject $Subject -Body $Body -SmtpServer "smtp.gmail.com"
        
    }
    catch {
        Write-MonitorLog "Erro ao enviar alerta: $_" "ERROR"
    }
}

# Função para gerar relatório
function New-MonitoringReport {
    param($ContainerHealth, $SystemResources, $AppHealth, $ErrorCount, $DbHealth)
    
    $report = @"
========================================
RELATÓRIO DE MONITORAMENTO
$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
========================================

CONTAINERS:
$(foreach ($container in $ContainerHealth.Keys) {
    "  $container: $($ContainerHealth[$container].Status) ($($ContainerHealth[$container].Health))"
})

RECURSOS DO SISTEMA:
  CPU: $($SystemResources.CPU.Percent)% [$($SystemResources.CPU.Status)]
  Memória: $($SystemResources.Memory.Percent)% [$($SystemResources.Memory.Status)]
  Disco: $($SystemResources.Disk.Percent)% [$($SystemResources.Disk.Status)]

APLICAÇÃO:
  Status: HTTP $($AppHealth.StatusCode) [$($AppHealth.Status)]
  Tempo de Resposta: $($AppHealth.ResponseTime)ms
  Banco de Dados: $(if ($DbHealth) { "Conectado" } else { "Desconectado" })

LOGS:
  Erros Recentes: $ErrorCount

========================================
"@

    return $report
}

# Função principal de monitoramento
function Start-Monitoring {
    do {
        Write-MonitorLog "========================================" 
        Write-MonitorLog "INICIANDO VERIFICAÇÃO DE MONITORAMENTO"
        Write-MonitorLog "========================================"
        
        # Executar todas as verificações
        $containerHealth = Test-ContainerHealth
        $systemResources = Test-SystemResources
        $appHealth = Test-ApplicationHealth
        $errorCount = Test-ErrorLogs
        $dbHealth = Test-DatabaseConnection
        
        # Gerar relatório
        $report = New-MonitoringReport -ContainerHealth $containerHealth -SystemResources $systemResources -AppHealth $appHealth -ErrorCount $errorCount -DbHealth $dbHealth
        
        # Verificar se há problemas críticos
        $criticalIssues = @()
        
        if (!$appHealth.IsHealthy) {
            $criticalIssues += "Aplicação não responsiva"
        }
        
        if (!$dbHealth) {
            $criticalIssues += "Banco de dados desconectado"
        }
        
        if ($systemResources.CPU.Status -eq "CRITICAL") {
            $criticalIssues += "CPU em uso crítico ($($systemResources.CPU.Percent)%)"
        }
        
        if ($systemResources.Memory.Status -eq "CRITICAL") {
            $criticalIssues += "Memória em uso crítico ($($systemResources.Memory.Percent)%)"
        }
        
        if ($systemResources.Disk.Status -eq "CRITICAL") {
            $criticalIssues += "Disco em uso crítico ($($systemResources.Disk.Percent)%)"
        }
        
        # Enviar alertas se necessário
        if ($criticalIssues.Count -gt 0) {
            $alertSubject = "ALERTA CRÍTICO - Sistema de Transporte Escolar"
            $alertBody = "Problemas detectados:`n" + ($criticalIssues -join "`n") + "`n`n$report"
            Send-Alert -Subject $alertSubject -Body $alertBody
        }
        
        Write-MonitorLog "Verificação concluída. Próxima em $IntervalSeconds segundos..."
        
        if ($Continuous) {
            Start-Sleep -Seconds $IntervalSeconds
        }
        
    } while ($Continuous)
}

# Executar monitoramento
Write-MonitorLog "Iniciando monitoramento de produção..."
Write-MonitorLog "Intervalo: $IntervalSeconds segundos"
Write-MonitorLog "Contínuo: $Continuous"
Write-MonitorLog "Alertas: $SendAlerts"

Start-Monitoring