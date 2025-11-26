# Migração: padronizar status 'concluida' e conferência flexível

Este README documenta como aplicar a migração que padroniza o status final de viagens para `concluida` e altera o CHECK de `conferencia_criancas` para aceitar sufixos (ex.: `embarque_ida`).

Local files:
- `20251119_add_concluida_status_and_constraints.sql` — migração aplicada localmente; converte dados e altera constraints.
- `20251121_rollback_concluida_to_finalizada.sql` — rollback para restaurar status `finalizada` e CHECKs originais.

Recomendações antes de aplicar em produção:
1. Fazer backup completo do banco de produção:

```bat
REM exemplo: gerar dump com pg_dump (Windows)
set PGPASSWORD=<senha>
pg_dump -h <host> -p <port> -U <user> -Fc -f kanghoo_prod_backup_%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%.dump <database>
```

2. Janela de manutenção: avisar usuários e parar processos que escrevem no banco (consumers, jobs, serviços API).

3. Teste em staging: execute o SQL em um banco de staging que reflita production e rode a suíte de smoke tests.

Como aplicar a migração (modo manual):

```bat
cd "c:\Users\Mateus\Desktop\Teste Backend Koa\teste\server"
REM Use a mesma .env com DATABASE_URL apontando para production (ou exporte DATABASE_URL)
node scripts\apply_migration_server_migrations.js
```

Observações importantes:
- O script `apply_migration_server_migrations.js` aplica o arquivo `20251119_add_concluida_status_and_constraints.sql`.
- Se preferir aplicar manualmente, abra o arquivo SQL e execute os blocos dentro de uma sessão transacional.
- Monitore logs e execute smoke tests após a migração.

Rollback (se necessário):

```bat
cd "c:\Users\Mateus\Desktop\Teste Backend Koa\teste\server"
psql <CONN_STRING> -f migrations\20251121_rollback_concluida_to_finalizada.sql
```

Checklist pós-migração:
- Rodar suite de testes (npm test) em staging/production mirror
- Verificar dashboards e eventos de WebSocket
- Conferir contadores e relatórios de viagens
