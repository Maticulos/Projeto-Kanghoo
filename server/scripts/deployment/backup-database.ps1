# ===========================================
# SCRIPT DE BACKUP AUTOMÁTICO - POSTGRESQL
# ===========================================

param(
    [string]$BackupType = "daily",
    [string]$RetentionDays = "30",
    [switch]$Compress = $true,
    [switch]$Verbose = $false
)

# Configurações
$DB_NAME = "transporte_escolar_prod"
$DB_USER = "transporte_user"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$BACKUP_DIR = "C:\backup\transporte_escolar"
$LOG_FILE = "$BACKUP_DIR\backup.log"

# Criar diretórios se não existirem
$directories = @(
    $BACKUP_DIR,
    "$BACKUP_DIR\daily",
    "$BACKUP_DIR\weekly", 
    "$BACKUP_DIR\monthly",
    "$BACKUP_DIR\logs"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Função de log
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    if ($Verbose) {
        Write-Host $logEntry -ForegroundColor $(
            switch ($Level) {
                "ERROR" { "Red" }
                "WARN" { "Yellow" }
                "SUCCESS" { "Green" }
                default { "White" }
            }
        )
    }
    
    Add-Content -Path $LOG_FILE -Value $logEntry
}

# Verificar se pg_dump está disponível
try {
    $pgDumpPath = Get-Command pg_dump -ErrorAction Stop
    Write-Log "pg_dump encontrado: $($pgDumpPath.Source)"
} catch {
    Write-Log "ERRO: pg_dump não encontrado. Instale o PostgreSQL client tools." "ERROR"
    exit 1
}

# Solicitar senha se não estiver definida
if (-not $env:PGPASSWORD) {
    Write-Log "Solicitando senha do banco de dados..."
    $securePassword = Read-Host "Digite a senha do usuário $DB_USER" -AsSecureString
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
}

# Gerar nome do arquivo
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "${DB_NAME}_${BackupType}_${timestamp}"

# Determinar diretório de destino
$destDir = switch ($BackupType) {
    "daily" { "$BACKUP_DIR\daily" }
    "weekly" { "$BACKUP_DIR\weekly" }
    "monthly" { "$BACKUP_DIR\monthly" }
    default { $BACKUP_DIR }
}

$backupFile = "$destDir\$backupFileName.sql"

Write-Log "=== INICIANDO BACKUP $($BackupType.ToUpper()) ==="
Write-Log "Banco: $DB_NAME"
Write-Log "Usuário: $DB_USER"
Write-Log "Arquivo: $backupFile"

# Executar backup
try {
    Write-Log "Executando pg_dump..."
    
    $pgDumpArgs = @(
        "-h", $DB_HOST,
        "-p", $DB_PORT,
        "-U", $DB_USER,
        "-d", $DB_NAME,
        "--verbose",
        "--clean",
        "--if-exists",
        "--create",
        "--format=custom",
        "--file=$backupFile.backup"
    )
    
    # Backup em formato custom (binário)
    & pg_dump @pgDumpArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Backup binário criado com sucesso" "SUCCESS"
        
        # Criar também backup em SQL texto
        $pgDumpArgsText = @(
            "-h", $DB_HOST,
            "-p", $DB_PORT,
            "-U", $DB_USER,
            "-d", $DB_NAME,
            "--clean",
            "--if-exists",
            "--create",
            "--file=$backupFile"
        )
        
        & pg_dump @pgDumpArgsText
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Backup SQL criado com sucesso" "SUCCESS"
        } else {
            Write-Log "ERRO ao criar backup SQL" "ERROR"
        }
    } else {
        Write-Log "ERRO no backup: código de saída $LASTEXITCODE" "ERROR"
        exit 1
    }
} catch {
    Write-Log "ERRO durante backup: $($_.Exception.Message)" "ERROR"
    exit 1
}

# Comprimir arquivos se solicitado
if ($Compress) {
    Write-Log "Comprimindo arquivos de backup..."
    
    try {
        # Comprimir backup binário
        Compress-Archive -Path "$backupFile.backup" -DestinationPath "$backupFile.backup.zip" -Force
        Remove-Item "$backupFile.backup" -Force
        
        # Comprimir backup SQL
        Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip" -Force
        Remove-Item $backupFile -Force
        
        Write-Log "Arquivos comprimidos com sucesso" "SUCCESS"
    } catch {
        Write-Log "ERRO na compressão: $($_.Exception.Message)" "ERROR"
    }
}

# Verificar tamanho do backup
$backupFiles = Get-ChildItem "$destDir\$backupFileName*"
$totalSize = ($backupFiles | Measure-Object -Property Length -Sum).Sum
$sizeInMB = [math]::Round($totalSize / 1MB, 2)

Write-Log "Tamanho total do backup: $sizeInMB MB"

# Limpeza de backups antigos
Write-Log "Limpando backups antigos (retenção: $RetentionDays dias)..."

try {
    $cutoffDate = (Get-Date).AddDays(-[int]$RetentionDays)
    $oldBackups = Get-ChildItem $destDir -File | Where-Object { $_.CreationTime -lt $cutoffDate }
    
    foreach ($oldBackup in $oldBackups) {
        Remove-Item $oldBackup.FullName -Force
        Write-Log "Removido backup antigo: $($oldBackup.Name)"
    }
    
    Write-Log "Limpeza concluída. Removidos $($oldBackups.Count) arquivos antigos" "SUCCESS"
} catch {
    Write-Log "ERRO na limpeza: $($_.Exception.Message)" "ERROR"
}

# Verificar integridade do backup
Write-Log "Verificando integridade do backup..."

try {
    if ($Compress) {
        $testFile = "$backupFile.backup.zip"
        $testResult = Test-Path $testFile
    } else {
        $testFile = "$backupFile.backup"
        $testResult = Test-Path $testFile
    }
    
    if ($testResult) {
        Write-Log "Verificação de integridade: OK" "SUCCESS"
    } else {
        Write-Log "ERRO: Arquivo de backup não encontrado após criação" "ERROR"
    }
} catch {
    Write-Log "ERRO na verificação: $($_.Exception.Message)" "ERROR"
}

# Estatísticas finais
$endTime = Get-Date
Write-Log "=== BACKUP CONCLUÍDO ==="
Write-Log "Horário de término: $endTime"
Write-Log "Arquivos criados: $($backupFiles.Count)"
Write-Log "Tamanho total: $sizeInMB MB"

# Limpar variável de senha
Remove-Variable env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Log "Script de backup finalizado com sucesso" "SUCCESS"

# Retornar informações do backup
return @{
    Success = $true
    BackupFile = $backupFile
    Size = $sizeInMB
    Timestamp = $timestamp
}