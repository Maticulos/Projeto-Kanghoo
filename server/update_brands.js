const db = require('./config/db');

async function updateBrands() {
  try {
    console.log('Updating brands for legacy vehicles...');
    
    await db.query("UPDATE veiculos SET marca = 'Renault' WHERE id = 1");
    await db.query("UPDATE veiculos SET marca = 'Mercedes-Benz' WHERE id = 2");
    await db.query("UPDATE veiculos SET marca = 'Marcopolo' WHERE id = 3");
    await db.query("UPDATE veiculos SET marca = 'Fiat' WHERE id = 4");
    
    console.log('Brands updated.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

updateBrands();
