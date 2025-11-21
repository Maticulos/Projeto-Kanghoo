# Backend (servidor) — Guia Rápido

Este documento descreve como executar e manter a parte backend do sistema.

## Visão Geral
Pasta `server/` contém a API Koa, configurações, migrations, scripts de manutenção e testes.

## Comandos principais
- `npm install` — instalar dependências (no diretório `server/`).
- `npm run dev` — iniciar servidor em modo desenvolvimento (usa `server.js`).
- `npm start` — iniciar servidor (modo produção assumido por variáveis de ambiente).
- `npm test` — rodar testes (Mocha).

## Variáveis de ambiente importantes (arquivo `server/.env`)
- `NODE_ENV` — `development` ou `production`.
- `PORT` — porta do servidor (padrão `5000`).
- `DATABASE_URL` ou `DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD` — conexão com PostgreSQL.
- `JWT_SECRET` — segredo para assinatura de tokens JWT.
- `DEMO_MODE` — `true` habilita modo demonstração (bypass para contas de demo).

## Banco de Dados
- Migrations: `npx knex migrate:latest --knexfile ./knexfile.js`
- Rollback: `npx knex migrate:rollback --knexfile ./knexfile.js`
- Seeds: `node ../database/run-seed.js`

Há wrappers convenientes em `../scripts/db/` no repositório principal.

## Scripts de manutenção
Consulte `server/scripts/README.md` para índice e instruções de scripts existentes. Para operações diárias utilize os wrappers em `teste/scripts/`.

## Logs
Logs são gravados em `teste/logs/` e `teste/server/logs/` (se configurado). Use `teste/scripts/limpar-logs.sh` para compressão de logs antigos.

## Desenvolvimento e Debug
- `node debug-tools.js` — ferramentas de diagnóstico incluídas no repositório (quando presentes).
- Para depurar, inicie com `NODE_ENV=development` e observe logs detalhados.

## Segurança
- NÃO commitar arquivos `.env` com segredos.
- Mantenha `JWT_SECRET` e outras credenciais em um cofre de segredos ou variáveis de ambiente do host.

## Notas finais
Este README é um resumo. Para documentação completa, veja `DOCUMENTACAO_SISTEMA_COMPLETA.md` e `README_PRODUCAO.md` na raiz do repositório.
