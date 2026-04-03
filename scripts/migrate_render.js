// scripts/migrate_render.js
const { Pool } = require('pg');

// Your Render database configuration
const pool = new Pool({
    host: 'dpg-d77r3ap4bi0s73f3q7m0-a',
    port: 5432,
    database: 'notifydb_qu3i',
    user: 'notifydb_qu3i_user',
    password: 'DbZTQnyI8ofDVA77wV9qcedjByLrO5Iw', // Replace with your actual password
    ssl: {
        rejectUnauthorized: false
    }
});

const createTables = async () => {
    console.log('🚀 Starting migration to Render PostgreSQL...');
    
    const tables = [
        // Drop existing tables if needed (be careful!)
        // `DROP TABLE IF EXISTS user_courses CASCADE`,
        // `DROP TABLE IF EXISTS notes CASCADE`,
        // `DROP TABLE IF EXISTS updates CASCADE`,
        // `DROP TABLE IF EXISTS units CASCADE`,
        // `DROP TABLE IF EXISTS courses CASCADE`,
        // `DROP TABLE IF EXISTS notify_users CASCADE`,
        // `DROP TABLE IF EXISTS schools CASCADE`,
        // `DROP TABLE IF EXISTS institutions CASCADE`,
        
        // Schools table
        `CREATE TABLE IF NOT EXISTS schools (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Courses/Departments table
        `CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50),
            school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Units table
        `CREATE TABLE IF NOT EXISTS units (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50),
            dept_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            is_common BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Users table
        `CREATE TABLE IF NOT EXISTS notify_users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'student',
            school_id INTEGER REFERENCES schools(id),
            pfp VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Notes table
        `CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            file_path VARCHAR(500),
            downloads INTEGER DEFAULT 0,
            school_id INTEGER REFERENCES schools(id),
            dept_id INTEGER REFERENCES courses(id),
            unit_id INTEGER REFERENCES units(id),
            user_id INTEGER REFERENCES notify_users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Updates table
        `CREATE TABLE IF NOT EXISTS updates (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            course_id INTEGER REFERENCES courses(id),
            user_id INTEGER REFERENCES notify_users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // User courses enrollment
        `CREATE TABLE IF NOT EXISTS user_courses (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES notify_users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            school_id INTEGER REFERENCES schools(id),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Institutions table
        `CREATE TABLE IF NOT EXISTS institutions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            staff_domain VARCHAR(255),
            student_domain VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];
    
    for (const query of tables) {
        try {
            await pool.query(query);
            console.log('✅ Table created successfully');
        } catch (err) {
            console.error('❌ Error creating table:', err.message);
        }
    }
    
    // Create indexes for better performance
    const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_notes_school ON notes(school_id)`,
        `CREATE INDEX IF NOT EXISTS idx_notes_dept ON notes(dept_id)`,
        `CREATE INDEX IF NOT EXISTS idx_notes_unit ON notes(unit_id)`,
        `CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_updates_course ON updates(course_id)`,
        `CREATE INDEX IF NOT EXISTS idx_user_courses_user ON user_courses(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_user_courses_course ON user_courses(course_id)`,
        `CREATE INDEX IF NOT EXISTS idx_units_dept ON units(dept_id)`,
        `CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id)`
    ];
    
    console.log('\n📊 Creating indexes...');
    for (const index of indexes) {
        try {
            await pool.query(index);
            console.log('✅ Index created');
        } catch (err) {
            console.error('❌ Index error:', err.message);
        }
    }
    
    console.log('\n🎉 Migration complete! Your database is ready.');
    await pool.end();
};

// Run the migration
createTables().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});