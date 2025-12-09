const db = require('../config/db');

async function checkPacotes() {
  try {
    console.log('--- Coordenadas dos Pacotes ---');
    const pacotes = await db.query("SELECT id, nome_pacote, latitude_partida, longitude_partida FROM pacotes_excursao");
    console.table(pacotes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkPacotes();
