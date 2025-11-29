@echo off
echo ========================================
echo  Executando Seed de Producao Simulada
echo ========================================
echo.

cd /d "%~dp0.."

echo Executando seed no banco de dados...
psql -U postgres -d kanghoo_db_prod -f database\seed_test_users.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCESSO! Dados criados.
    echo ========================================
    echo.
    echo Credenciais de acesso:
    echo   Motorista Basic: basic@motorista.com
    echo   Motorista Premium: premium@motorista.com
    echo   Motorista Excursao: excursao@motorista.com
    echo   Responsavel 1: pai1@email.com
    echo   Responsavel 2: pai2@email.com
    echo   Responsavel 3: pai3@email.com
    echo.
    echo   Senha padrao: teste123
    echo.
) else (
    echo.
    echo ERRO ao executar seed!
    echo Verifique se o PostgreSQL esta rodando.
    echo.
)

pause
