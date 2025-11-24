@echo off
echo ========================================
echo   Iniciando Kanghoo com Docker
echo ========================================
echo.

echo [1/3] Parando containers antigos...
docker stop kanghoo-postgres 2>nul
docker stop kanghoo-app 2>nul
docker rm kanghoo-postgres 2>nul
docker rm kanghoo-app 2>nul

echo [2/3] Criando rede Docker...
docker network create kanghoo-network 2>nul

echo [3/3] Iniciando PostgreSQL...
docker run -d --name kanghoo-postgres --network kanghoo-network -e POSTGRES_DB=kanghoo_db_prod -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15-alpine

echo Aguardando PostgreSQL iniciar (15 segundos)...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo   Iniciando aplicacao...
echo ========================================
echo.
echo Acesse: http://localhost:5000
echo.

docker run -it --rm --name kanghoo-app --network kanghoo-network -v "%CD%:/app" -w /app/server -p 5000:5000 -p 8080:8080 -e DB_HOST=kanghoo-postgres -e DB_PORT=5432 -e DB_NAME=kanghoo_db_prod -e DB_USER=postgres -e DB_PASSWORD=postgres -e PORT=5000 -e NODE_ENV=development node:24-alpine sh -c "npm install && node scripts/init-database.js && npm start"
