@echo off
REM Inicia a aplicação em modo desenvolvimento (Windows cmd)
REM Uso: iniciar-desenvolvimento.cmd
SET NODE_ENV=development
SET DEMO_MODE=true
SET CORS_ORIGINS=http://localhost:3000

cd /d %~dp0\..\server
IF NOT EXIST node_modules (
  echo Instalando dependencias...
  npm install
)
node --watch server.js
