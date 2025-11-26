-- Migration: Add 'concluida' status and relax conference/event constraints
-- Date: 2025-11-19

BEGIN;

-- 1) Add data migration: convert existing finalizada -> concluida
UPDATE viagens_ativas
SET status = 'concluida'
WHERE status IN ('finalizada', 'finalizado');

-- 2) Update viagens_ativas CHECK constraint to include 'concluida'
ALTER TABLE viagens_ativas
  DROP CONSTRAINT IF EXISTS viagens_ativas_status_check;

ALTER TABLE viagens_ativas
  ADD CONSTRAINT viagens_ativas_status_check CHECK (
    status IN (
      'agendada', 'iniciada', 'em_andamento', 'pausada', 'concluida', 'cancelada'
    )
  );

-- 3) Relax conferencia_criancas tipo_evento / tipo_conferencia check
-- Allow values starting with 'embarque' or 'desembarque' (e.g. 'embarque_ida')
ALTER TABLE conferencia_criancas
  DROP CONSTRAINT IF EXISTS conferencia_criancas_tipo_evento_check;

ALTER TABLE conferencia_criancas
  ADD CONSTRAINT conferencia_criancas_tipo_evento_check CHECK (
    (COALESCE(tipo_conferencia, tipo_evento) ~ '^(embarque|desembarque)')
    OR COALESCE(tipo_conferencia, tipo_evento) IS NULL
  );

COMMIT;

-- DOWN (revert): attempt to restore original checks and revert data migration
-- NOTE: running the down migration may fail if values dependent on 'concluida' remain.
-- Use with caution.
--
-- BEGIN;
-- UPDATE viagens_ativas SET status = 'finalizada' WHERE status = 'concluida';
-- ALTER TABLE viagens_ativas DROP CONSTRAINT IF EXISTS viagens_ativas_status_check;
-- ALTER TABLE viagens_ativas ADD CONSTRAINT viagens_ativas_status_check CHECK (
--   status IN ('agendada', 'iniciada', 'em_andamento', 'finalizada', 'cancelada')
-- );
-- ALTER TABLE conferencia_criancas DROP CONSTRAINT IF EXISTS conferencia_criancas_tipo_evento_check;
-- ALTER TABLE conferencia_criancas ADD CONSTRAINT conferencia_criancas_tipo_evento_check CHECK (
--   (COALESCE(tipo_conferencia, tipo_evento) IN ('embarque','desembarque')) OR COALESCE(tipo_conferencia, tipo_evento) IS NULL
-- );
-- COMMIT;
