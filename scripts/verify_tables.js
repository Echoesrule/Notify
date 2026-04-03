// scripts/verify-tables.js
const { Pool } = require('pg');

const pool = new Pool({
    host: 'dpg-d77r3ap4bi0s73f3q7m0-a.oregon-postgres.render.com',  // Note: added .oregon-postgres.render.com
    port: 5432,
    database: 'notifydb_qu3i',
    user: 'notifydb_qu3i_user',
    password: 'YOUR_PASSWORD_HERE',
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📚 Tables in database:');
        result.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        console.log(`\n Total: ${result.rows.length} tables`);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

verify();