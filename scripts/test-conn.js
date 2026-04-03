// scripts/test-connection-fixed.js
const { Pool } = require('pg');

const pool = new Pool({
    host: 'dpg-d77r3ap4bi0s73f3q7m0-a.oregon-postgres.render.com',
    port: 5432,
    database: 'notifydb_qu3i',
    user: 'notifydb_qu3i_user',
    password:'DbZTQnyI8ofDVA77wV9qcedjByLrO5Iw',  // Replace with your actual password
    ssl: { rejectUnauthorized: false }
});

async function test() {
    console.log('🔌 Testing connection to Render PostgreSQL...');
    
    try {
        // Test basic connection
        const result = await pool.query('SELECT NOW() as time, version() as version');
        console.log('✅ Connected successfully!');
        console.log('📅 Server time:', result.rows[0].time);
        console.log('🐘 PostgreSQL version:', result.rows[0].version);
        
        // List all tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('\n📚 Tables in database:');
        if (tables.rows.length === 0) {
            console.log('   (no tables found - run migration first)');
        } else {
            tables.rows.forEach(row => {
                console.log(`   ✅ ${row.table_name}`);
            });
        }
        
        // Test insert and select
        console.log('\n📝 Testing CRUD operations...');
        
        // Insert test school
        const insertResult = await pool.query(
            'INSERT INTO schools (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING *',
            ['Test School']
        );
        
        if (insertResult.rows.length > 0) {
            console.log('   ✅ Insert successful');
        }
        
        // Select schools
        const schools = await pool.query('SELECT * FROM schools LIMIT 5');
        console.log(`   📚 Found ${schools.rows.length} schools`);
        
        console.log('\n🎉 All tests passed! Database is ready for use.');
        
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        console.error('\n💡 Troubleshooting:');
        console.error('1. Check your password is correct');
        console.error('2. Verify the hostname includes .oregon-postgres.render.com');
        console.error('3. Make sure SSL is enabled');
    } finally {
        await pool.end();
    }
}

test();