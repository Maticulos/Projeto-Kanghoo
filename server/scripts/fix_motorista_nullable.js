require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Testando conexão com o banco...');
    await db.query('SELECT 1');
    console.log('✅ Conexão OK');

    console.log('🔧 Removendo restrição NOT NULL de motorista_id em viagens_ativas (se existir)...');
    await db.query("ALTER TABLE viagens_ativas ALTER COLUMN motorista_id DROP NOT NULL");
    console.log('✅ motorista_id agora permite NULL');

    // Opcional: criar trigger para copiar usuario_id para motorista_id em inserts quando motorista_id for null
    try {
      const triggerFn = `
        CREATE OR REPLACE FUNCTION set_motorista_id_from_usuario() RETURNS trigger AS $$
        BEGIN
          IF NEW.motorista_id IS NULL AND NEW.usuario_id IS NOT NULL THEN
            NEW.motorista_id := NEW.usuario_id;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;
      await db.query(triggerFn);
      await db.query(`
        DROP TRIGGER IF EXISTS trg_set_motorista_id ON viagens_ativas;
        CREATE TRIGGER trg_set_motorista_id
        BEFORE INSERT ON viagens_ativas
        FOR EACH ROW
        EXECUTE PROCEDURE set_motorista_id_from_usuario();
      `);
      console.log('✅ Trigger criada para preencher motorista_id a partir de usuario_id quando ausente');
    } catch (e) {
      console.log('⚠️ Não foi possível criar trigger (talvez privilégio ou já existente):', e.message);
    }

    console.log('Concluído');
  } catch (err) {
    console.error('❌ Erro ao ajustar motorista_id:', err.message);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
