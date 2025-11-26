require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Conectando ao banco...');
    await db.query('SELECT 1');

    console.log('🔧 Permitindo NULL em tipo_evento (se ainda for NOT NULL)...');
    try {
      await db.query("ALTER TABLE conferencia_criancas ALTER COLUMN tipo_evento DROP NOT NULL");
      console.log('✅ tipo_evento agora permite NULL');
    } catch (e) {
      console.log('⚠️ Não foi possível alterar tipo_evento (talvez já permita NULL):', e.message);
    }

    console.log('🔁 Criando trigger para sincronizar tipo_conferencia -> tipo_evento (antes do insert)...');
    const fn = `
    CREATE OR REPLACE FUNCTION sync_tipo_conferencia_to_evento() RETURNS trigger AS $$
    BEGIN
      IF NEW.tipo_evento IS NULL AND NEW.tipo_conferencia IS NOT NULL THEN
        NEW.tipo_evento := NEW.tipo_conferencia;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `;
    await db.query(fn);
    await db.query(`DROP TRIGGER IF EXISTS trg_sync_tipo_conferencia ON conferencia_criancas; CREATE TRIGGER trg_sync_tipo_conferencia BEFORE INSERT OR UPDATE ON conferencia_criancas FOR EACH ROW EXECUTE PROCEDURE sync_tipo_conferencia_to_evento();`);
    console.log('✅ Trigger criada');

  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
