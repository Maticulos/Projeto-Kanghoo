# ========================================
# SCRIPT DE GERENCIAMENTO DO STACK DE MONITORAMENTO
# Sistema de Transporte Escolar
# ========================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs")]
    [string]$Action,
    
    [string]$Service = "all"
)

# Configurações
$PROJECT_NAME = "transporte-escolar"
$DOCKER_COMPOSE_FILE = "docker-compose.yml"
$MONITORING_PROFILE = "monitoring"

# Função para logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    
    # Log para arquivo
    $logFile = "logs\monitoring-$(Get-Date -Format 'yyyyMMdd').log"
    if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" -Force | Out-Null }
    Add-Content -Path $logFile -Value $logMessage
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-Log "Verificando pré-requisitos..."
    
    # Verificar Docker
    try {
        $dockerVersion = docker --version
        Write-Log "Docker encontrado: $dockerVersion"
    }
    catch {
        Write-Log "ERRO: Docker não encontrado. Instale o Docker Desktop." "ERROR"
        exit 1
    }
    
    # Verificar Docker Compose
    try {
        $composeVersion = docker-compose --version
        Write-Log "Docker Compose encontrado: $composeVersion"
    }
    catch {
        Write-Log "ERRO: Docker Compose não encontrado." "ERROR"
        exit 1
    }
    
    # Verificar arquivo de configuração
    if (!(Test-Path $DOCKER_COMPOSE_FILE)) {
        Write-Log "ERRO: Arquivo $DOCKER_COMPOSE_FILE não encontrado." "ERROR"
        exit 1
    }
    
    Write-Log "Pré-requisitos verificados com sucesso." "SUCCESS"
}

# Função para iniciar o stack de monitoramento
function Start-MonitoringStack {
    Write-Log "Iniciando stack de monitoramento..."
    
    try {
        # Iniciar serviços de monitoramento
        Write-Log "Iniciando Prometheus, Grafana e Exporters..."
        docker-compose -f $DOCKER_COMPOSE_FILE --profile $MONITORING_PROFILE up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Stack de monitoramento iniciado com sucesso!" "SUCCESS"
            
            # Aguardar serviços ficarem prontos
            Write-Log "Aguardando serviços ficarem prontos..."
            Start-Sleep -Seconds 30
            
            # Verificar status dos serviços
            Show-MonitoringStatus
            
            # Mostrar URLs de acesso
            Write-Log "URLs de acesso:" "INFO"
            Write-Log "  Grafana: http://localhost:3001 (admin/admin123)" "INFO"
            Write-Log "  Prometheus: http://localhost:9090" "INFO"
            Write-Log "  Node Exporter: http://localhost:9100" "INFO"
            Write-Log "  Postgres Exporter: http://localhost:9187" "INFO"
            Write-Log "  Redis Exporter: http://localhost:9121" "INFO"
        }
        else {
            Write-Log "ERRO: Falha ao iniciar stack de monitoramento." "ERROR"
            exit 1
        }
    }
    catch {
        Write-Log "ERRO: Exceção ao iniciar stack: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# Função para parar o stack de monitoramento
function Stop-MonitoringStack {
    Write-Log "Parando stack de monitoramento..."
    
    try {
        docker-compose -f $DOCKER_COMPOSE_FILE --profile $MONITORING_PROFILE down
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Stack de monitoramento parado com sucesso!" "SUCCESS"
        }
        else {
            Write-Log "ERRO: Falha ao parar stack de monitoramento." "ERROR"
            exit 1
        }
    }
    catch {
        Write-Log "ERRO: Exceção ao parar stack: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# Função para reiniciar o stack
function Restart-MonitoringStack {
    Write-Log "Reiniciando stack de monitoramento..."
    Stop-MonitoringStack
    Start-Sleep -Seconds 5
    Start-MonitoringStack
}

# Função para mostrar status dos serviços
function Show-MonitoringStatus {
    Write-Log "Status dos serviços de monitoramento:"
    
    $services = @(
        "transporte-escolar-prometheus",
        "transporte-escolar-grafana", 
        "transporte-escolar-node-exporter",
        "transporte-escolar-postgres-exporter",
        "transporte-escolar-redis-exporter"
    )
    
    foreach ($service in $services) {
        try {
            $status = docker ps --filter "name=$service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            if ($status -match $service) {
                Write-Log "[OK] $service RUNNING" "SUCCESS"
            }
            else {
                Write-Log "[FAIL] $service STOPPED" "WARNING"
            }
        }
        catch {
            Write-Log "[ERROR] $service ERROR" "ERROR"
        }
    }
    
    # Verificar conectividade
    Write-Log "Verificando conectividade dos serviços..."
    
    $endpoints = @{
        "Grafana" = "http://localhost:3001"
        "Prometheus" = "http://localhost:9090"
        "Node Exporter" = "http://localhost:9100"
        "Postgres Exporter" = "http://localhost:9187"
        "Redis Exporter" = "http://localhost:9121"
    }
    
    foreach ($endpoint in $endpoints.GetEnumerator()) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.Value -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Log "[OK] $($endpoint.Key) Acessivel" "SUCCESS"
            }
            else {
                Write-Log "[WARN] $($endpoint.Key) Status $($response.StatusCode)" "WARNING"
            }
        }
        catch {
            Write-Log "[FAIL] $($endpoint.Key) Nao acessivel" "WARNING"
        }
    }
}

# Função para mostrar logs
function Show-MonitoringLogs {
    Write-Log "Mostrando logs do stack de monitoramento..."
    
    if ($Service -eq "all") {
        docker-compose -f $DOCKER_COMPOSE_FILE --profile $MONITORING_PROFILE logs -f
    }
    else {
        docker-compose -f $DOCKER_COMPOSE_FILE logs -f $Service
    }
}

# ========================================
# EXECUÇÃO PRINCIPAL
# ========================================

Write-Log "=== GERENCIAMENTO DO STACK DE MONITORAMENTO ===" "INFO"
Write-Log "Ação: $Action" "INFO"

# Verificar pré-requisitos
Test-Prerequisites

# Executar ação solicitada
switch ($Action) {
    "start" {
        Start-MonitoringStack
    }
    "stop" {
        Stop-MonitoringStack
    }
    "restart" {
        Restart-MonitoringStack
    }
    "status" {
        Show-MonitoringStatus
    }
    "logs" {
        Show-MonitoringLogs
    }
    default {
        Write-Log "ERRO: Ação inválida: $Action" "ERROR"
        Write-Log "Ações válidas: start, stop, restart, status, logs" "INFO"
        exit 1
    }
}

Write-Log "=== OPERAÇÃO CONCLUÍDA ===" "INFO"