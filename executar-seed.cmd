@echo off
chcp 65001 >nul
echo ========================================
echo  EXECUTANDO SEED DE PRODUCAO SIMULADA
echo ========================================
echo.

echo Executando seed no banco de dados...
docker-compose exec -T postgres psql -U postgres -d kanghoo_db_prod < database/seed_test_users.sql

echo.
echo ========================================
echo  SEED EXECUTADO!
echo ========================================
echo.
echo Credenciais (senha: teste123):
echo.
echo MOTORISTAS:
echo   - basic@motorista.com
echo   - premium@motorista.com
echo   - excursao@motorista.com
echo.
echo RESPONSAVEIS:
echo   - pai1@email.com (Sofia)
echo   - pai2@email.com (Pedro)
echo   - pai3@email.com (Lucas)
echo.
echo Acesse: http://localhost:3000/auth/login.html
echo.
pause
