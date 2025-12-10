const db = require('./config/db');

async function inspect() {
    try {
        const result = await db.query(`
            SELECT event_object_table, trigger_name, action_statement 
            FROM information_schema.triggers 
            WHERE event_object_table IN ('usuarios', 'empresas', 'veiculos');
        `);
        console.log('Triggers:');
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
