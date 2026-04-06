// scripts/migrate_units_to_course_units.js
const { Pool } = require('pg');

const pool = new Pool({
    host: 'dpg-d77r3ap4bi0s73f3q7m0-a.oregon-postgres.render.com',
    port: 5432,
    database: 'notifydb_qu3i',
    user: 'notifydb_qu3i_user',
    password: 'DbZTQnyI8ofDVA77wV9qcedjByLrO5Iw',
    ssl: false,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

async function migrate() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting migration...');
        
        await client.query('BEGIN');
        
        // Step 1: Create course_units table
        console.log('📋 Creating course_units table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS course_units (
                course_id INT NOT NULL,
                unit_id INT NOT NULL,
                PRIMARY KEY (course_id, unit_id),
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ course_units table created');
        
        // Step 2: Migrate existing data
        console.log('📦 Migrating existing unit-course links...');
        const migrateResult = await client.query(`
            INSERT INTO course_units (course_id, unit_id)
            SELECT dept_id, id FROM units WHERE dept_id IS NOT NULL
        `);
        console.log(`✅ Migrated ${migrateResult.rowCount} unit-course links`);
        
        // Step 3: Drop dept_id column from units
        console.log('🗑️ Dropping dept_id column from units...');
        await client.query(`ALTER TABLE units DROP COLUMN IF EXISTS dept_id`);
        console.log('✅ dept_id column dropped');
        
        // Step 4: Create indexes
        console.log('📊 Creating indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_course_units_course ON course_units(course_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_course_units_unit ON course_units(unit_id)`);
        console.log('✅ Indexes created');
        
        await client.query('COMMIT');
        console.log('🎉 Migration complete!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();