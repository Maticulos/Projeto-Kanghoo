# Script PowerShell para executar migração e seed de dados de teste

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MIGRAÇÃO E SEED: Dados para Mapa Interativo" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Carregar variáveis de ambiente do .env
$envFile = Join-Path $PSScriptRoot "..\server\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Verificar se DATABASE_URL está configurada
if (-not $env:DATABASE_URL) {
    # Tentar construir a partir de variáveis individuais
    $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
    $dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
    $dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "transporte_db" }
    $dbUser = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
    $dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }
    
    if ($dbPassword) {
        $env:DATABASE_URL = "postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"
    } else {
        $env:DATABASE_URL = "postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}"
    }
}

Write-Host ""
Write-Host "📋 Executando migração de coordenadas..." -ForegroundColor Yellow
$migracaoFile = Join-Path $PSScriptRoot "migracao_coordenadas_mapa.sql"

if (Test-Path $migracaoFile) {
    psql $env:DATABASE_URL -f $migracaoFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migração concluída com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro na migração" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Arquivo de migração não encontrado: $migracaoFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🌱 Inserindo dados de teste..." -ForegroundColor Yellow
$seedFile = Join-Path $PSScriptRoot "seed_dados_teste_mapa.sql"

if (Test-Path $seedFile) {
    psql $env:DATABASE_URL -f $seedFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dados de teste inseridos com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao inserir dados de teste" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Arquivo de seed não encontrado: $seedFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Processo concluído!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

