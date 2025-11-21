-- Rollback migration for status standardization (concluida -> finalizada)
-- Use this only if you must revert the 'concluida' change in production.
-- IMPORTANT: Take a full backup before running this file.

BEGIN;

-- 1) Convert data back: 'concluida' -> 'finalizada'
UPDATE viagens_ativas
SET status = 'finalizada'
WHERE status = 'concluida';

-- 2) Restore CHECK constraint on viagens_ativas to include 'finalizada' and remove 'concluida'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'viagens_ativas_status_check' AND t.relname = 'viagens_ativas'
  ) THEN
    ALTER TABLE viagens_ativas DROP CONSTRAINT viagens_ativas_status_check;
  END IF;
  ALTER TABLE viagens_ativas ADD CONSTRAINT viagens_ativas_status_check CHECK (
    status IN ('agendada','iniciada','em_andamento','finalizada','cancelada')
  );
END$$;

-- 3) Restore conferencia tipo check to original restrictive values (embarque/desembarque)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'conferencia_criancas_tipo_evento_check' AND t.relname = 'conferencia_criancas'
  ) THEN
    ALTER TABLE conferencia_criancas DROP CONSTRAINT conferencia_criancas_tipo_evento_check;
  END IF;
  ALTER TABLE conferencia_criancas ADD CONSTRAINT conferencia_criancas_tipo_evento_check CHECK (tipo_evento IN ('embarque','desembarque'));
END$$;

COMMIT;

-- Notes:
-- - This rollback will change all 'concluida' records to 'finalizada'. If you have already
--   updated client code to send 'concluida', clients may start creating 'concluida' rows again.
-- - Only run this if you plan to revert code changes too, or as a last-resort rollback.
