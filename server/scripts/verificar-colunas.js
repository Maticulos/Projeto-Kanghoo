require('dotenv').config();
const db = require('../config/db');

(async () => {
  try {
    const rotas = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rotas_escolares' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas em rotas_escolares:');
    rotas.rows.forEach(r => console.log('  -', r.column_name));
    
    const pacotes = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pacotes_excursao' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas em pacotes_excursao:');
    pacotes.rows.forEach(r => console.log('  -', r.column_name));
    
    const usuarios = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name IN ('latitude', 'longitude', 'bairro', 'cidade', 'estado')
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas de coordenadas em usuarios:');
    usuarios.rows.forEach(r => console.log('  -', r.column_name));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await db.pool?.end();
    process.exit(0);
  }
})();

