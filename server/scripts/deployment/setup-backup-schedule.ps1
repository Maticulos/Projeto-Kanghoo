# ===========================================
# CONFIGURAR AGENDAMENTO DE BACKUP
# ===========================================

# Verificar se está executando como administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERRO: Este script deve ser executado como Administrador" -ForegroundColor Red
    Write-Host "Clique com botão direito no PowerShell e selecione 'Executar como administrador'" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Configurando Agendamento de Backup ===" -ForegroundColor Green

# Configurações
$SCRIPT_PATH = "$PSScriptRoot\backup-database.ps1"
$TASK_NAME_DAILY = "TransporteEscolar-BackupDaily"
$TASK_NAME_WEEKLY = "TransporteEscolar-BackupWeekly"
$TASK_NAME_MONTHLY = "TransporteEscolar-BackupMonthly"

# Verificar se o script de backup existe
if (-not (Test-Path $SCRIPT_PATH)) {
    Write-Host "ERRO: Script de backup não encontrado: $SCRIPT_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Script de backup encontrado: $SCRIPT_PATH" -ForegroundColor Green

# Função para criar tarefa agendada
function New-BackupTask {
    param(
        [string]$TaskName,
        [string]$BackupType,
        [string]$Schedule,
        [string]$Time
    )
    
    Write-Host "Criando tarefa: $TaskName" -ForegroundColor Cyan
    
    # Remover tarefa existente se houver
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "Tarefa existente removida: $TaskName" -ForegroundColor Yellow
    } catch {
        # Ignorar erro se tarefa não existir
    }
    
    # Criar ação
    $Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$SCRIPT_PATH`" -BackupType $BackupType -Compress -Verbose"
    
    # Criar trigger baseado no tipo
    switch ($Schedule) {
        "Daily" {
            $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
        }
        "Weekly" {
            $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $Time
        }
        "Monthly" {
            $Trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek Sunday -At $Time
        }
    }
    
    # Configurações da tarefa
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    
    # Criar principal (usuário que executará)
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    # Registrar tarefa
    try {
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Backup automático do banco de dados - $BackupType"
        Write-Host "✅ Tarefa criada com sucesso: $TaskName" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ ERRO ao criar tarefa $TaskName`: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Criar tarefas agendadas
Write-Host "`nCriando tarefas agendadas..." -ForegroundColor Yellow

$tasks = @(
    @{ Name = $TASK_NAME_DAILY; Type = "daily"; Schedule = "Daily"; Time = "02:00" },
    @{ Name = $TASK_NAME_WEEKLY; Type = "weekly"; Schedule = "Weekly"; Time = "03:00" },
    @{ Name = $TASK_NAME_MONTHLY; Type = "monthly"; Schedule = "Monthly"; Time = "04:00" }
)

$successCount = 0
foreach ($task in $tasks) {
    if (New-BackupTask -TaskName $task.Name -BackupType $task.Type -Schedule $task.Schedule -Time $task.Time) {
        $successCount++
    }
}

Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Tarefas criadas com sucesso: $successCount de $($tasks.Count)" -ForegroundColor White

# Listar tarefas criadas
Write-Host "`nTarefas agendadas:" -ForegroundColor Yellow
try {
    Get-ScheduledTask | Where-Object { $_.TaskName -like "TransporteEscolar-Backup*" } | ForEach-Object {
        $nextRun = (Get-ScheduledTask -TaskName $_.TaskName | Get-ScheduledTaskInfo).NextRunTime
        Write-Host "  📅 $($_.TaskName) - Próxima execução: $nextRun" -ForegroundColor White
    }
} catch {
    Write-Host "ERRO ao listar tarefas: $($_.Exception.Message)" -ForegroundColor Red
}

# Criar script de monitoramento
$monitorScript = @"
# Script de Monitoramento de Backup
# Execute este script para verificar o status dos backups

Write-Host "=== STATUS DOS BACKUPS ===" -ForegroundColor Green

# Verificar tarefas agendadas
`$tasks = Get-ScheduledTask | Where-Object { `$_.TaskName -like "TransporteEscolar-Backup*" }

foreach (`$task in `$tasks) {
    `$info = Get-ScheduledTaskInfo -TaskName `$task.TaskName
    `$status = `$task.State
    `$lastRun = `$info.LastRunTime
    `$nextRun = `$info.NextRunTime
    `$lastResult = `$info.LastTaskResult
    
    Write-Host "`n📋 `$(`$task.TaskName)" -ForegroundColor Cyan
    Write-Host "   Status: `$status" -ForegroundColor White
    Write-Host "   Última execução: `$lastRun" -ForegroundColor White
    Write-Host "   Próxima execução: `$nextRun" -ForegroundColor White
    Write-Host "   Resultado: `$lastResult" -ForegroundColor $(if (`$lastResult -eq 0) { "Green" } else { "Red" })
}

# Verificar backups recentes
`$backupDir = "C:\backup\transporte_escolar"
if (Test-Path `$backupDir) {
    Write-Host "`n📁 BACKUPS RECENTES:" -ForegroundColor Yellow
    
    `$recentBackups = Get-ChildItem `$backupDir -Recurse -File | 
        Where-Object { `$_.CreationTime -gt (Get-Date).AddDays(-7) } |
        Sort-Object CreationTime -Descending |
        Select-Object -First 10
    
    foreach (`$backup in `$recentBackups) {
        `$size = [math]::Round(`$backup.Length / 1MB, 2)
        Write-Host "   `$(`$backup.Name) - `$size MB - `$(`$backup.CreationTime)" -ForegroundColor White
    }
} else {
    Write-Host "`n❌ Diretório de backup não encontrado: `$backupDir" -ForegroundColor Red
}
"@

$monitorScriptPath = "$PSScriptRoot\monitor-backups.ps1"
$monitorScript | Out-File -FilePath $monitorScriptPath -Encoding UTF8

Write-Host "`n📊 Script de monitoramento criado: $monitorScriptPath" -ForegroundColor Green

# Instruções finais
Write-Host "`n=== PRÓXIMOS PASSOS ===" -ForegroundColor Cyan
Write-Host "1. Configure a senha do banco no arquivo .env" -ForegroundColor White
Write-Host "2. Teste o backup manualmente:" -ForegroundColor White
Write-Host "   PowerShell -ExecutionPolicy Bypass -File `"$SCRIPT_PATH`" -BackupType daily -Verbose" -ForegroundColor Gray
Write-Host "3. Monitore os backups com:" -ForegroundColor White
Write-Host "   PowerShell -ExecutionPolicy Bypass -File `"$monitorScriptPath`"" -ForegroundColor Gray
Write-Host "4. Verifique os logs em: C:\backup\transporte_escolar\backup.log" -ForegroundColor White

Write-Host "`n✅ Configuração de backup concluída!" -ForegroundColor Green