# Candidatos à Limpeza / Arquivamento

Este arquivo lista potenciais arquivos/paths que podem ser arquivados ou removidos com segurança após revisão. NÃO execute exclusões sem revisar cada item e ter backup.

Sugestões iniciais (revise antes de excluir):

- `backups_sistema/backup_antes_limpeza_20251105_145232/` — contém cópias e documentações de limpeza; manter em arquivo externo antes de remover do repo.
- `teste/backups/` — múltiplos snapshots pré-deploy; considerar mover para armazenamento de artefatos ou S3.
- Arquivos `Dockerfile` duplicados em raiz e `teste/` — consolidar e manter apenas as variantes necessárias (`Dockerfile`, `Dockerfile.prod`).
- `public/assets/*` não usados / imagens antigas — rodar auditoria para encontrar imagens não referenciadas.
- `logs/` e `teste/logs/` — não versionar logs; mover para `.gitignore` e armazenar fora do repositório.
- `frontend/` duplicado em `teste/frontend/` e `backups_sistema/.../frontend/` — consolidar a cópia canônica em `frontend/` e arquivar as demais.
- Scripts antigos em `scripts/` que não correspondem com os novos wrappers em `teste/scripts/` — comparar e manter somente as versões documentadas.
- `database/` scripts antigos vs `server/migrations/` — verificar dependências e consolidar migrations e seeds.

Como revisar cada item:

1. Verifique uso: `git grep "path/or/filename"` e busque referências no código.
2. Faça backup externo (zip) antes de remover.
3. Mova para uma branch `limpeza/arquivo-XYZ` e crie PR com a lista de mudanças para revisão da equipe.

Se quiser, eu posso:

- Gerar um relatório mais detalhado com contagem de referências e últimas modificações por arquivo.
- Mover arquivos para `teste/arquivados/` como um primeiro passo não destrutivo.
- Criar a branch + commits com remoções/arquivamentos (somente com sua confirmação).

-- Gerado automaticamente por automação em workspace — revise antes de agir.
