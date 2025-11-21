# Relatório Detalhado de Candidatos à Limpeza

Gerado em: 2025-11-21

Resumo do escaneamento inicial (base: pasta do repositório)

--- backups_sistema/backup_antes_limpeza_20251105_145232 ---
- Arquivos: 466
- Exemplos de arquivos mais recentemente modificados (top 10):
  - `backups_sistema/.../frontend/public/auth/dashboard.html` (última modificação recente)
  - `backups_sistema/.../COMECE_AQUI.txt`
  - `backups_sistema/.../SOLUCAO_PROBLEMAS.md`
  - Várias scripts e README relacionados à limpeza/execução.

Observação: essa pasta é um snapshot/backup detalhado — recomenda-se arquivar fora do repositório (S3 / storage) antes de remover.

--- teste/backups ---
- Arquivos: 18
- Contém vários snapshots pré-deploy com logs e `uploads/README.md` dentro de cada snapshot.

--- Dockerfiles encontrados ---
- `backups_sistema/.../Dockerfile` (backup)
- `teste/Dockerfile` (provavelmente a cópia canônica)
- `teste/server/node_modules/bcrypt/Dockerfile` (arquivo do node_modules; ignorar)

--- public/assets ---
- Arquivos: 3 (principalmente `bundle.min.js` e `bundle.min.css`)

--- Diretórios de logs detectados ---
- Várias pastas `logs/` encontradas em backups e em `teste/server/logs`.
- `logs/` já aparece no `.gitignore` do repositório — não versionar logs ativos.

--- frontend vs teste/frontend ---
- `frontend/` não foi encontrado (no momento há a cópia em `teste/frontend`)
- `teste/frontend` contém ~113 arquivos — esta parece ser a cópia ativa do frontend no workspace atual.

--- scripts ---
- `teste/scripts/` contém 15 arquivos (wrappers em português criados).
- Não há `scripts/` na raiz (nenhuma duplicata ativa detectada na raiz do repo atual).

--- database vs server/migrations ---
- `database/` não encontrado na raiz do workspace atual (ou não detectado).
- `server/migrations` também não encontrado no escopo atual (pode existir em outra pasta ou branch).

Recomendações práticas (passos sugeridos)

1. Arquivar `backups_sistema/backup_antes_limpeza_20251105_145232` externamente (zip + S3/drive) e substituir por um marcador `README` apontando para o local do backup.
2. Mover `teste/backups/` para `teste/arquivados/backups/` (primeiro passo não destrutivo) e validar builds/deploys locais.
3. Consolidar `Dockerfile` ativos: manter `teste/Dockerfile` e remover/arquivar outros Dockerfiles de backup.
4. Garantir que `logs/` esteja em `.gitignore` (já listado) e remover pastas `logs/` versionadas movendo conteúdo para armazenamento fora do repo.
5. Manter `teste/frontend/` como cópia canônica do frontend; se houver outra cópia em `/frontend`, decidir qual manter.
6. Revisar `database/` vs `server/migrations/` manualmente — se houver duplicatas de scripts SQL, consolidar em `server/migrations/` e arquivar o restante.

Se desejar, eu posso automatizar o próximo passo:
- Gerar um diff/branch com a movimentação (mover arquivos para `teste/arquivados/`) sem deletar (opção segura).
- Ou criar pull request com as mudanças propostas para revisão.

-- Relatório gerado automaticamente por escaneamento local; revise antes de executar qualquer remoção.
