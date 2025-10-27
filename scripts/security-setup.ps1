# ========================================
# SCRIPT DE CONFIGURAÇÃO DE SEGURANÇA
# Sistema de Transporte Escolar - Produção
# ========================================

param(
    [switch]$SkipFirewall = $false,
    [switch]$SkipUpdates = $false,
    [switch]$Force = $false
)

# Configurações
$LOG_FILE = "logs/security-setup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Cores para output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"

# Função para logging
function Write-SecurityLog {
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

# Função para verificar se está executando como administrador
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Função para configurar firewall do Windows
function Set-WindowsFirewall {
    if ($SkipFirewall) {
        Write-SecurityLog "Configuração de firewall ignorada conforme solicitado." "WARN"
        return
    }
    
    Write-SecurityLog "Configurando Windows Firewall..."
    
    try {
        # Habilitar firewall para todos os perfis
        netsh advfirewall set allprofiles state on
        Write-SecurityLog "Firewall habilitado para todos os perfis" "SUCCESS"
        
        # Configurar política padrão
        netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound
        Write-SecurityLog "Política padrão configurada: bloquear entrada, permitir saída" "SUCCESS"
        
        # Permitir portas necessárias
        $allowedPorts = @(
            @{Name="HTTP"; Port=80; Protocol="TCP"},
            @{Name="HTTPS"; Port=443; Protocol="TCP"},
            @{Name="SSH"; Port=22; Protocol="TCP"}
        )
        
        foreach ($portRule in $allowedPorts) {
            netsh advfirewall firewall delete rule name=$portRule.Name 2>$null
            netsh advfirewall firewall add rule name=$portRule.Name dir=in action=allow protocol=$portRule.Protocol localport=$portRule.Port
            Write-SecurityLog "Porta $($portRule.Port)/$($portRule.Protocol) ($($portRule.Name)) permitida" "SUCCESS"
        }
        
        # Bloquear portas de desenvolvimento
        $blockedPorts = @(3000, 5000, 8080, 9090, 3001, 8000)
        foreach ($port in $blockedPorts) {
            netsh advfirewall firewall delete rule name="Block Dev Port $port" 2>$null
            netsh advfirewall firewall add rule name="Block Dev Port $port" dir=in action=block protocol=TCP localport=$port
            Write-SecurityLog "Porta de desenvolvimento $port bloqueada" "SUCCESS"
        }
        
        Write-SecurityLog "Configuração de firewall concluída!" "SUCCESS"
    }
    catch {
        Write-SecurityLog "Erro ao configurar firewall: $_" "ERROR"
    }
}

# Função para aplicar atualizações de segurança
function Install-SecurityUpdates {
    if ($SkipUpdates) {
        Write-SecurityLog "Atualizações ignoradas conforme solicitado." "WARN"
        return
    }
    
    Write-SecurityLog "Verificando e instalando atualizações de segurança..."
    
    try {
        # Verificar se o módulo PSWindowsUpdate está disponível
        if (!(Get-Module -ListAvailable -Name PSWindowsUpdate)) {
            Write-SecurityLog "Instalando módulo PSWindowsUpdate..."
            Install-Module -Name PSWindowsUpdate -Force -Scope CurrentUser
        }
        
        Import-Module PSWindowsUpdate
        
        # Verificar atualizações disponíveis
        $updates = Get-WindowsUpdate -Category "Security Updates"
        
        if ($updates.Count -gt 0) {
            Write-SecurityLog "Encontradas $($updates.Count) atualizações de segurança"
            
            # Instalar atualizações críticas
            Install-WindowsUpdate -Category "Security Updates" -AcceptAll -AutoReboot:$false
            Write-SecurityLog "Atualizações de segurança instaladas" "SUCCESS"
        } else {
            Write-SecurityLog "Nenhuma atualização de segurança pendente" "SUCCESS"
        }
    }
    catch {
        Write-SecurityLog "Erro ao verificar/instalar atualizações: $_" "WARN"
        Write-SecurityLog "Execute Windows Update manualmente" "WARN"
    }
}

# Função para configurar políticas de senha
function Set-PasswordPolicy {
    Write-SecurityLog "Configurando políticas de senha..."
    
    try {
        # Configurar política de senhas
        net accounts /minpwlen:12 /maxpwage:90 /minpwage:1 /uniquepw:5
        Write-SecurityLog "Política de senhas configurada: mín 12 chars, máx 90 dias" "SUCCESS"
        
        # Configurar política de bloqueio de conta
        net accounts /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30
        Write-SecurityLog "Política de bloqueio configurada: 5 tentativas, 30 min bloqueio" "SUCCESS"
    }
    catch {
        Write-SecurityLog "Erro ao configurar políticas de senha: $_" "ERROR"
    }
}

# Função para configurar usuário da aplicação
function New-ApplicationUser {
    Write-SecurityLog "Configurando usuário da aplicação..."
    
    try {
        $username = "transporte-app"
        $password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | % {[char]$_})
        
        # Verificar se usuário já existe
        try {
            Get-LocalUser -Name $username -ErrorAction Stop
            Write-SecurityLog "Usuário $username já existe" "WARN"
        }
        catch {
            # Criar usuário
            $securePassword = ConvertTo-SecureString $password -AsPlainText -Force
            New-LocalUser -Name $username -Password $securePassword -Description "Usuario da aplicacao de transporte escolar" -PasswordNeverExpires
            
            # Adicionar ao grupo Users
            Add-LocalGroupMember -Group "Users" -Member $username
            
            Write-SecurityLog "Usuário $username criado com sucesso" "SUCCESS"
            Write-SecurityLog "Senha gerada: $password" "WARN"
            Write-SecurityLog "IMPORTANTE: Anote a senha em local seguro!" "WARN"
        }
    }
    catch {
        Write-SecurityLog "Erro ao configurar usuário da aplicação: $_" "ERROR"
    }
}

# Função para configurar auditoria
function Set-AuditPolicy {
    Write-SecurityLog "Configurando políticas de auditoria..."
    
    try {
        # Habilitar auditoria de logon
        auditpol /set /category:"Logon/Logoff" /success:enable /failure:enable
        
        # Habilitar auditoria de alterações de conta
        auditpol /set /category:"Account Management" /success:enable /failure:enable
        
        # Habilitar auditoria de acesso a objetos
        auditpol /set /category:"Object Access" /success:enable /failure:enable
        
        # Habilitar auditoria de alterações de política
        auditpol /set /category:"Policy Change" /success:enable /failure:enable
        
        Write-SecurityLog "Políticas de auditoria configuradas" "SUCCESS"
    }
    catch {
        Write-SecurityLog "Erro ao configurar auditoria: $_" "ERROR"
    }
}

# Função para configurar serviços
function Set-WindowsServices {
    Write-SecurityLog "Configurando serviços do Windows..."
    
    try {
        # Serviços a serem desabilitados (se não necessários)
        $servicesToDisable = @(
            "Telnet",
            "RemoteRegistry",
            "Browser",
            "Messenger"
        )
        
        foreach ($service in $servicesToDisable) {
            try {
                $svc = Get-Service -Name $service -ErrorAction SilentlyContinue
                if ($svc -and $svc.Status -eq "Running") {
                    Stop-Service -Name $service -Force
                    Set-Service -Name $service -StartupType Disabled
                    Write-SecurityLog "Serviço $service desabilitado" "SUCCESS"
                }
            }
            catch {
                # Serviço pode não existir, ignorar
            }
        }
        
        # Configurar serviços essenciais
        $essentialServices = @(
            "Windows Defender Antivirus Service",
            "Windows Firewall",
            "Windows Update"
        )
        
        foreach ($service in $essentialServices) {
            try {
                Set-Service -Name $service -StartupType Automatic -ErrorAction SilentlyContinue
                Start-Service -Name $service -ErrorAction SilentlyContinue
                Write-SecurityLog "Serviço essencial $service configurado" "SUCCESS"
            }
            catch {
                # Alguns serviços podem ter nomes diferentes
            }
        }
    }
    catch {
        Write-SecurityLog "Erro ao configurar serviços: $_" "ERROR"
    }
}

# Função para configurar registro do Windows
function Set-RegistrySettings {
    Write-SecurityLog "Configurando registro do Windows para segurança..."
    
    try {
        # Desabilitar autorun
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name "NoDriveTypeAutoRun" -Value 255 -Force
        
        # Configurar política de UAC
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -Value 1 -Force
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorAdmin" -Value 2 -Force
        
        # Desabilitar compartilhamento administrativo
        Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\lanmanserver\parameters" -Name "AutoShareWks" -Value 0 -Force
        
        Write-SecurityLog "Configurações de registro aplicadas" "SUCCESS"
    }
    catch {
        Write-SecurityLog "Erro ao configurar registro: $_" "ERROR"
    }
}

# Função para criar script de monitoramento
function New-MonitoringScript {
    Write-SecurityLog "Criando script de monitoramento de segurança..."
    
    $monitoringScript = @'
# Script de monitoramento de segurança
$logFile = "logs/security-monitor-$(Get-Date -Format 'yyyyMMdd').log"

# Verificar tentativas de login falhadas
$failedLogins = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625; StartTime=(Get-Date).AddHours(-1)} -ErrorAction SilentlyContinue

if ($failedLogins.Count -gt 10) {
    $message = "ALERTA: $($failedLogins.Count) tentativas de login falhadas na última hora"
    Add-Content -Path $logFile -Value "$(Get-Date): $message"
    Write-Host $message -ForegroundColor Red
}

# Verificar uso de CPU e memória
$cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
$memory = Get-WmiObject -Class Win32_OperatingSystem
$memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)

if ($cpu.Average -gt 80) {
    $message = "ALERTA: CPU em $($cpu.Average)%"
    Add-Content -Path $logFile -Value "$(Get-Date): $message"
}

if ($memoryUsage -gt 85) {
    $message = "ALERTA: Memória em $memoryUsage%"
    Add-Content -Path $logFile -Value "$(Get-Date): $message"
}
'@

    try {
        $monitoringScript | Out-File -FilePath "scripts\security-monitor.ps1" -Encoding UTF8
        Write-SecurityLog "Script de monitoramento criado em scripts\security-monitor.ps1" "SUCCESS"
        
        # Criar tarefa agendada para executar o monitoramento
        $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$(Get-Location)\scripts\security-monitor.ps1`""
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 365)
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        Register-ScheduledTask -TaskName "TransporteEscolar-SecurityMonitor" -Action $action -Trigger $trigger -Settings $settings -Description "Monitoramento de segurança do sistema de transporte escolar"
        
        Write-SecurityLog "Tarefa agendada de monitoramento criada" "SUCCESS"
    }
    catch {
        Write-SecurityLog "Erro ao criar script de monitoramento: $_" "ERROR"
    }
}

# Função para gerar relatório de segurança
function New-SecurityReport {
    Write-SecurityLog "Gerando relatório de segurança..."
    
    $reportPath = "logs\security-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    
    $report = @"
========================================
RELATÓRIO DE CONFIGURAÇÃO DE SEGURANÇA
Sistema de Transporte Escolar
$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
========================================

FIREWALL:
$(netsh advfirewall show allprofiles state)

POLÍTICAS DE CONTA:
$(net accounts)

SERVIÇOS CRÍTICOS:
$(Get-Service | Where-Object {$_.Name -match "Firewall|Defender|Update"} | Format-Table -AutoSize | Out-String)

USUÁRIOS LOCAIS:
$(Get-LocalUser | Format-Table -AutoSize | Out-String)

ATUALIZAÇÕES PENDENTES:
$(try { Get-WindowsUpdate | Format-Table -AutoSize | Out-String } catch { "Módulo PSWindowsUpdate não disponível" })

CONFIGURAÇÕES DE AUDITORIA:
$(auditpol /get /category:*)

========================================
RECOMENDAÇÕES:
1. Verificar logs de segurança regularmente
2. Manter sistema atualizado
3. Monitorar tentativas de acesso
4. Fazer backup regular das configurações
5. Revisar usuários e permissões mensalmente
========================================
"@

    try {
        $report | Out-File -FilePath $reportPath -Encoding UTF8
        Write-SecurityLog "Relatório de segurança gerado: $reportPath" "SUCCESS"
    }
    catch {
        Write-SecurityLog "Erro ao gerar relatório: $_" "ERROR"
    }
}

# Função principal
function Main {
    Write-SecurityLog "========================================" 
    Write-SecurityLog "CONFIGURAÇÃO DE SEGURANÇA PARA PRODUÇÃO"
    Write-SecurityLog "========================================"
    
    # Verificar privilégios de administrador
    if (!(Test-Administrator)) {
        Write-SecurityLog "ERRO: Este script deve ser executado como Administrador!" "ERROR"
        Write-SecurityLog "Clique com botão direito no PowerShell e selecione 'Executar como administrador'" "ERROR"
        exit 1
    }
    
    # Confirmar execução
    if (!$Force) {
        $confirmation = Read-Host "Este script irá aplicar configurações de segurança no sistema. Continuar? (sim/não)"
        if ($confirmation -ne "sim") {
            Write-SecurityLog "Configuração cancelada pelo usuário." "WARN"
            exit 0
        }
    }
    
    try {
        Write-SecurityLog "Iniciando configuração de segurança..."
        
        Set-WindowsFirewall
        Install-SecurityUpdates
        Set-PasswordPolicy
        New-ApplicationUser
        Set-AuditPolicy
        Set-WindowsServices
        Set-RegistrySettings
        New-MonitoringScript
        New-SecurityReport
        
        Write-SecurityLog "========================================" "SUCCESS"
        Write-SecurityLog "CONFIGURAÇÃO DE SEGURANÇA CONCLUÍDA!" "SUCCESS"
        Write-SecurityLog "========================================" "SUCCESS"
        Write-SecurityLog "Logs salvos em: $LOG_FILE" "SUCCESS"
        Write-SecurityLog "Execute 'scripts\security-monitor.ps1' para monitoramento contínuo" "SUCCESS"
        
    }
    catch {
        Write-SecurityLog "========================================" "ERROR"
        Write-SecurityLog "ERRO NA CONFIGURAÇÃO DE SEGURANÇA!" "ERROR"
        Write-SecurityLog "Erro: $_" "ERROR"
        Write-SecurityLog "========================================" "ERROR"
        exit 1
    }
}

# Executar script principal
Main