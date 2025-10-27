# ===========================================
# SCRIPT DE CONFIGURAÇÃO POSTGRESQL PRODUÇÃO
# ===========================================

Write-Host "=== Configurando PostgreSQL para Produção ===" -ForegroundColor Green

# Verificar se o PostgreSQL está instalado
$pgPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $pgPath) {
    Write-Host "ERRO: PostgreSQL não encontrado. Instale o PostgreSQL primeiro." -ForegroundColor Red
    Write-Host "Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Configurações
$DB_NAME = "transporte_escolar_prod"
$DB_USER = "transporte_user"
$BACKUP_DIR = "C:\backup\transporte_escolar"

Write-Host "Configurações:" -ForegroundColor Cyan
Write-Host "  - Banco: $DB_NAME" -ForegroundColor White
Write-Host "  - Usuário: $DB_USER" -ForegroundColor White
Write-Host "  - Backup: $BACKUP_DIR" -ForegroundColor White

# Solicitar senha do postgres
$postgresPassword = Read-Host "Digite a senha do usuário postgres" -AsSecureString
$postgresPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword))

# Solicitar senha para o novo usuário
$userPassword = Read-Host "Digite uma senha forte para o usuário $DB_USER" -AsSecureString
$userPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($userPassword))

# Criar diretório de backup
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force
    Write-Host "Diretório de backup criado: $BACKUP_DIR" -ForegroundColor Green
}

# Executar script SQL
Write-Host "Executando configuração do banco..." -ForegroundColor Yellow

$sqlScript = @"
-- Criar banco de dados de produção
CREATE DATABASE $DB_NAME
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Conectar ao banco de produção
\c $DB_NAME;

-- Criar usuário dedicado
CREATE USER $DB_USER WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    INHERIT
    NOREPLICATION
    CONNECTION LIMIT -1
    PASSWORD '$userPasswordText';

-- Conceder permissões
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- Configurações de segurança
ALTER DATABASE $DB_NAME SET log_statement = 'mod';
ALTER DATABASE $DB_NAME SET log_min_duration_statement = 1000;
"@

# Salvar script temporário
$tempScript = "$env:TEMP\setup_postgres_prod.sql"
$sqlScript | Out-File -FilePath $tempScript -Encoding UTF8

# Executar script
$env:PGPASSWORD = $postgresPasswordText
try {
    psql -U postgres -f $tempScript
    Write-Host "Configuração do banco concluída com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO ao configurar banco: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    Remove-Variable postgresPasswordText -ErrorAction SilentlyContinue
    Remove-Variable userPasswordText -ErrorAction SilentlyContinue
}

# Criar script de backup
$backupScript = @"
@echo off
set BACKUP_DIR=$BACKUP_DIR
set DB_NAME=$DB_NAME
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo Iniciando backup do banco %DB_NAME%...
pg_dump -U $DB_USER -h localhost %DB_NAME% > "%BACKUP_DIR%\%DB_NAME%_%TIMESTAMP%.sql"

if %ERRORLEVEL% EQU 0 (
    echo Backup concluído: %BACKUP_DIR%\%DB_NAME%_%TIMESTAMP%.sql
) else (
    echo ERRO no backup!
)

REM Limpar backups antigos (manter últimos 30 dias)
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul
"@

$backupScript | Out-File -FilePath "$BACKUP_DIR\backup_daily.bat" -Encoding ASCII

Write-Host "Script de backup criado: $BACKUP_DIR\backup_daily.bat" -ForegroundColor Green

# Instruções finais
Write-Host "`n=== PRÓXIMOS PASSOS ===" -ForegroundColor Cyan
Write-Host "1. Atualize o arquivo .env com a senha do usuário $DB_USER" -ForegroundColor White
Write-Host "2. Execute os scripts de criação das tabelas:" -ForegroundColor White
Write-Host "   - database\parte1_criar_tabelas.sql" -ForegroundColor Gray
Write-Host "   - database\parte2_atualizar_tabelas.sql" -ForegroundColor Gray
Write-Host "   - database\parte3_funcoes_views.sql" -ForegroundColor Gray
Write-Host "3. Configure backup automático no Agendador de Tarefas do Windows" -ForegroundColor White
Write-Host "4. Configure firewall para permitir conexões na porta 5432 (se necessário)" -ForegroundColor White

Write-Host "`nConfiguração concluída!" -ForegroundColor Green