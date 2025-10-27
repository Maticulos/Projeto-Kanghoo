# ========================================
# SCRIPT DE DEPLOY PARA PRODUÇÃO
# Sistema de Transporte Escolar
# ========================================

param(
    [string]$Environment = "production",
    [switch]$SkipBackup = $false,
    [switch]$SkipTests = $false,
    [switch]$Force = $false
)

# Configurações
$PROJECT_NAME = "transporte-escolar"
$DOCKER_COMPOSE_FILE = "docker-compose.prod.yml"
$BACKUP_DIR = "backups"
$LOG_FILE = "logs/deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Cores para output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"

# Função para logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Criar diretório de logs se não existir
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    }
    
    # Escrever no arquivo de log
    Add-Content -Path $LOG_FILE -Value $logMessage
    
    # Escrever no console com cores
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor $RED }
        "WARN"  { Write-Host $logMessage -ForegroundColor $YELLOW }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor $GREEN }
        default { Write-Host $logMessage -ForegroundColor $BLUE }
    }
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-Log "Verificando pré-requisitos..."
    
    # Verificar Docker
    try {
        $dockerVersion = docker --version
        Write-Log "Docker encontrado: $dockerVersion" "SUCCESS"
    }
    catch {
        Write-Log "Docker não encontrado. Instale o Docker Desktop." "ERROR"
        exit 1
    }
    
    # Verificar Docker Compose
    try {
        $composeVersion = docker-compose --version
        Write-Log "Docker Compose encontrado: $composeVersion" "SUCCESS"
    }
    catch {
        Write-Log "Docker Compose não encontrado." "ERROR"
        exit 1
    }
    
    # Verificar arquivo .env
    if (!(Test-Path ".env")) {
        Write-Log "Arquivo .env não encontrado. Execute o setup primeiro." "ERROR"
        exit 1
    }
    
    # Verificar variáveis críticas
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^[^#]" }
    $criticalVars = @("JWT_SECRET", "DB_PASSWORD", "GOOGLE_MAPS_API_KEY")
    
    foreach ($var in $criticalVars) {
        if (!($envContent | Where-Object { $_ -match "^$var=" })) {
            Write-Log "Variável crítica $var não encontrada no .env" "ERROR"
            exit 1
        }
    }
    
    Write-Log "Pré-requisitos verificados com sucesso!" "SUCCESS"
}

# Função para executar testes
function Invoke-Tests {
    if ($SkipTests) {
        Write-Log "Testes ignorados conforme solicitado." "WARN"
        return
    }
    
    Write-Log "Executando testes..."
    
    try {
        Set-Location "server"
        $testResult = npm test
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Testes falharam! Deploy cancelado." "ERROR"
            exit 1
        }
        
        Write-Log "Todos os testes passaram!" "SUCCESS"
    }
    catch {
        Write-Log "Erro ao executar testes: $_" "ERROR"
        exit 1
    }
    finally {
        Set-Location ".."
    }
}

# Função para fazer backup
function Invoke-Backup {
    if ($SkipBackup) {
        Write-Log "Backup ignorado conforme solicitado." "WARN"
        return
    }
    
    Write-Log "Criando backup antes do deploy..."
    
    # Criar diretório de backup
    $backupPath = "$BACKUP_DIR/pre-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    
    try {
        # Backup do banco de dados se estiver rodando
        $containers = docker ps --format "table {{.Names}}" | Select-String "transporte.*db"
        
        if ($containers) {
            Write-Log "Fazendo backup do banco de dados..."
            $dbContainer = $containers[0].ToString().Trim()
            
            # Ler variáveis do .env
            $envVars = @{}
            Get-Content ".env" | ForEach-Object {
                if ($_ -match "^([^#][^=]+)=(.*)$") {
                    $envVars[$matches[1]] = $matches[2]
                }
            }
            
            $dbName = $envVars["DB_NAME"]
            $dbUser = $envVars["DB_USER"]
            
            docker exec $dbContainer pg_dump -U $dbUser -d $dbName > "$backupPath/database-backup.sql"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Backup do banco criado com sucesso!" "SUCCESS"
            } else {
                Write-Log "Falha no backup do banco de dados" "WARN"
            }
        }
        
        # Backup de uploads se existir
        if (Test-Path "server/uploads") {
            Copy-Item -Path "server/uploads" -Destination "$backupPath/uploads" -Recurse
            Write-Log "Backup de uploads criado!" "SUCCESS"
        }
        
        # Backup de logs se existir
        if (Test-Path "server/logs") {
            Copy-Item -Path "server/logs" -Destination "$backupPath/logs" -Recurse
            Write-Log "Backup de logs criado!" "SUCCESS"
        }
        
    }
    catch {
        Write-Log "Erro durante backup: $_" "WARN"
    }
}

# Função para build da imagem
function Invoke-Build {
    Write-Log "Construindo imagem Docker para produção..."
    
    try {
        # Build da imagem usando Dockerfile de produção
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        docker build -f Dockerfile.prod -t "${PROJECT_NAME}:latest" -t "${PROJECT_NAME}:${timestamp}" .
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Falha no build da imagem Docker!" "ERROR"
            exit 1
        }
        
        Write-Log "Imagem Docker construída com sucesso!" "SUCCESS"
    }
    catch {
        Write-Log "Erro durante build: $_" "ERROR"
        exit 1
    }
}

# Função para deploy
function Invoke-Deploy {
    Write-Log "Iniciando deploy em produção..."
    
    try {
        # Parar containers existentes
        Write-Log "Parando containers existentes..."
        docker-compose -f $DOCKER_COMPOSE_FILE down
        
        # Criar volumes necessários
        Write-Log "Criando volumes necessários..."
        $volumes = @(
            "/var/lib/docker/volumes/transporte_postgres_data_prod",
            "/var/backups/transporte-escolar",
            "/var/uploads/transporte-escolar",
            "/var/log/transporte-escolar"
        )
        
        foreach ($volume in $volumes) {
            if (!(Test-Path $volume)) {
                New-Item -ItemType Directory -Path $volume -Force | Out-Null
                Write-Log "Volume criado: $volume"
            }
        }
        
        # Iniciar serviços
        Write-Log "Iniciando serviços em produção..."
        docker-compose -f $DOCKER_COMPOSE_FILE up -d
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Falha ao iniciar serviços!" "ERROR"
            exit 1
        }
        
        # Aguardar serviços ficarem prontos
        Write-Log "Aguardando serviços ficarem prontos..."
        Start-Sleep -Seconds 30
        
        # Verificar health checks
        $healthyServices = docker-compose -f $DOCKER_COMPOSE_FILE ps --services --filter "status=running"
        Write-Log "Serviços em execução: $($healthyServices -join ', ')" "SUCCESS"
        
        Write-Log "Deploy concluído com sucesso!" "SUCCESS"
        
    }
    catch {
        Write-Log "Erro durante deploy: $_" "ERROR"
        exit 1
    }
}

# Função para verificar deploy
function Test-Deployment {
    Write-Log "Verificando deploy..."
    
    try {
        # Aguardar um pouco mais para estabilização
        Start-Sleep -Seconds 10
        
        # Verificar se a aplicação está respondendo
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 30
        
        if ($response.StatusCode -eq 200) {
            Write-Log "Aplicação está respondendo corretamente!" "SUCCESS"
        } else {
            Write-Log "Aplicação não está respondendo adequadamente" "WARN"
        }
        
        # Mostrar status dos containers
        Write-Log "Status dos containers:"
        docker-compose -f $DOCKER_COMPOSE_FILE ps
        
        # Mostrar logs recentes
        Write-Log "Logs recentes da aplicação:"
        docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=20 app
        
    }
    catch {
        Write-Log "Erro ao verificar deploy: $_" "WARN"
        Write-Log "Verifique os logs dos containers para mais detalhes"
    }
}

# Função principal
function Main {
    Write-Log "========================================" 
    Write-Log "INICIANDO DEPLOY PARA PRODUÇÃO"
    Write-Log "Ambiente: $Environment"
    Write-Log "========================================"
    
    # Verificar se é produção e pedir confirmação
    if ($Environment -eq "production" -and !$Force) {
        $confirmation = Read-Host "Você está fazendo deploy em PRODUÇÃO. Tem certeza? (sim/não)"
        if ($confirmation -ne "sim") {
            Write-Log "Deploy cancelado pelo usuário." "WARN"
            exit 0
        }
    }
    
    try {
        Test-Prerequisites
        Invoke-Tests
        Invoke-Backup
        Invoke-Build
        Invoke-Deploy
        Test-Deployment
        
        Write-Log "========================================" "SUCCESS"
        Write-Log "DEPLOY CONCLUÍDO COM SUCESSO!" "SUCCESS"
        Write-Log "========================================" "SUCCESS"
        Write-Log "Aplicação disponível em: http://localhost:5000" "SUCCESS"
        Write-Log "Logs de deploy salvos em: $LOG_FILE" "SUCCESS"
        
    }
    catch {
        Write-Log "========================================" "ERROR"
        Write-Log "DEPLOY FALHOU!" "ERROR"
        Write-Log "Erro: $_" "ERROR"
        Write-Log "========================================" "ERROR"
        exit 1
    }
}

# Executar script principal
Main